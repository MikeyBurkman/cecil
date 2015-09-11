#! /usr/bin/env node

var path = require('path');
var fs = require('fs');
var shell = require('shelljs');
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var rimraf = require('rimraf');
var md5 = require('MD5');
var LineByLineReader = require('line-by-line');
var _ = require('lodash');
var isThere = require('is-there');
var minimist = require('minimist');

var argv = minimist(process.argv.slice(2));

var cacheDir = path.join(__dirname, '.cache');

if (argv.c) {
  // Clear cache
  console.log('Clearing cache...');
  rimraf.sync(cacheDir);
  console.log('Finished');
  process.exit(0);
}

var scriptName = argv._[0];
var scriptPath = path.join(process.cwd(), scriptName);
var scriptDir = path.dirname(scriptPath);
var scriptNodeModules = path.join(scriptDir, 'node_modules');

readArgs()
  .then(function(args) {

    if (args.length === 0) {
      // No arguments, no need to worry about loading/installing them
      return args;

    } else {
      return loadFromCache(args);
    }

  })
  .then(function() {

    // We set the arguments so it looks like it's our script that's actually executing.
    // Otherwise it just looks like another argument.
    // We restore the original arguments after executing
    var oldArgv = process.argv.map(function(argv) {
      return argv;
    });

    process.argv = process.argv.splice(2);

    require(scriptPath);

    process.argv = oldArgv;
  })
  .then(function() {
    // Remove the node modules folder if it exists
    rimraf.sync(scriptNodeModules);
  })
  .catch(function(err) {
    console.log('Error: ', err);
  });

function readArgs() {
  var args = [];

  return readLines(scriptPath, function(line) {
    line = line.replace(/\s/g, '');

    if (_.startsWith(line, '#') || line.length === 0) {
      // Skip the initial shebang and any blank lines
      return;
    }

    if (_.startsWith(line, '//!')) {
      // Argument!
      var argLine = line.slice('3').split('@');
      args.push({
        name: argLine[0],
        version: argLine[1]
      });

    } else if (_.startsWith(line, '//')) {
      // Comment, can skip
      return;

    } else {
      // Finished reading all the arguments
      return false;
    }

  }).then(function() {
    return args;
  });
}

function installDependencies(args) {
  return Promise.map(args, installDepedency);
}

function installDepedency(arg) {
  return new Promise(function(resolve, reject) {
    spawn('npm', ['install', arg.name + '@' + arg.version], {
      cwd: scriptDir,
      stdio: 'inherit'
    })
    .on('close', function(exitCode) {
      if (exitCode == 0) {
        resolve(arg);
      } else {
        reject(new Error('Error: ', exitCode));
      }
    });
  });
}

function getCacheFile(args) {
  var hash = md5(JSON.stringify(args));
  return path.resolve(cacheDir, hash + '.tar.gz');
}

function loadFromCache(args) {
  var cacheFile = getCacheFile(args);

  if (isThere(cacheFile)) {
    return untarNodeModules(cacheFile)
  } else {
    return installDependencies(args)
      .then(function() {
        return cacheNodeModules(args);
      })
  }
}

function cacheNodeModules(args) {
  var cacheFile = getCacheFile(args);

  return tarNodeModules(cacheFile);
}

function tarNodeModules(cacheFile) {
  return new Promise(function(resolve, reject) {
    shell.mkdir('-p', cacheDir);

    var cmd = 'tar -zcf ' + cacheFile + ' -C ' + scriptNodeModules + ' .';
    var exitCode = shell.exec(cmd).code;
    if (exitCode !== 0) {
      shell.rm(cacheFile);
      throw new Error('Error tarring: ', cmd, '; Exit code: ', exitCode);
    }

    resolve();
  });
};

function untarNodeModules(cacheFile) {
  return new Promise(function(resolve, reject) {
    shell.mkdir('-p', scriptNodeModules);
    var cmd = 'tar -zxf ' + cacheFile + ' -C ' + scriptNodeModules;
    var exitCode = shell.exec(cmd).code;
    if (exitCode !== 0) {
      throw new Error('Error un-tarring: ', cmd, '; Exit code: ', exitCode);
    }
    resolve();
  });
}

function clearCache() {
  rimraf.sync(scriptNodeModules);
}

function readLines(file, lineFn) {
  return new Promise(function(resolve, reject) {
    var lr = new LineByLineReader(file);
    var closed = false;

    lr.on('error', function (err) {
      reject(err);
    });

    lr.on('line', function (line) {
      if (closed) {
        return;
      }

      if (lineFn(line) === false) {
        closed = true;
        lr.close();
      }
    });

    lr.on('end', function () {
      resolve();
    });
  });
}
