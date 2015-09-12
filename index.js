#! /usr/bin/env node

// TODO Clean up some dependencies
// Some things like shelljs, isThere, and minimist could probably go away

var path = require('path');
var fs = require('fs');
var child_process = require('child_process');

var shell = require('shelljs');
var Promise = require('bluebird');
var rimraf = require('rimraf');
var md5 = require('md5');
var LineByLineReader = require('line-by-line');
var isThere = require('is-there');
var minimist = require('minimist');
var npm = require('npm'); // Can't seem to Promisify npm commands...
var targz = require('targz');

var compress = Promise.promisify(targz.compress);
var decompress = Promise.promisify(targz.decompress);

var argv = minimist(process.argv.slice(2));

var cacheDir = path.join(__dirname, '.cache');

if (argv.c) {
  console.log('Clearing cache...');
  rimraf.sync(cacheDir);
  console.log('Finished');

} else {

  // Execue the script

  var scriptName = argv._[0];
  var scriptPath = path.join(process.cwd(), scriptName);
  var scriptDir = path.dirname(scriptPath);
  var scriptNodeModules = path.join(scriptDir, 'node_modules');

  var backupNodeModules = path.join(cacheDir, 'backupNodeModules.tar.gz');

  var start = new Date();

  // Cache file gz compression level
  // Between 0 and 9, 0 being none and 9 being max compression
  // We prefer speed, so keep it low
  var gzCompressionLevel = 3;

  backupExistingNodeModules()
    .then(readArgs)
    .then(loadDependenciesFromCache)
    .then(runScript)
    .then(removeScriptNodeModules)
    .then(restoreExistingNodeModules)
    .finally(function() {
      //console.log('Finished after: ', (new Date() - start));
    });
}


function runScript() {
  return new Promise(function(resolve, reject) {
    var args = process.argv.slice(3);
    child_process.fork(scriptPath, args)
    .on('close', function() {
      resolve();
    })
    .on('error', function(err) {
      reject(err);
    });
  });
}

function readArgs() {
  var args = [];

  return readLines(scriptPath, function(line) {
    line = line.replace(/\s/g, '');

    if (startsWith(line, '#') || line.length === 0) {
      // Skip the initial shebang and any blank lines
      return;
    }

    if (startsWith(line, '//!')) {
      // Argument!
      var argLine = line.slice('3').split('@');
      args.push({
        name: argLine[0],
        version: argLine[1]
      });

    } else if (startsWith(line, '//')) {
      // Comment, can skip
      return;

    } else {
      // Real code = finished reading all the arguments
      return false;
    }

  }).then(function() {
    return args;
  });
}

function startsWith(str, prefix) {
  return (str.substring(0, prefix.length) === prefix);
}

function removeScriptNodeModules() {
  rimraf.sync(scriptNodeModules);
}

function installDependencies(args) {
  return new Promise(function(resolve, reject) {
    npm.load(undefined, function(err) {
      if (err) {
        return reject(err);
      }

      resolve(Promise.map(args, installDependency));
    });
  });
}


function installDependency(arg) {
  return new Promise(function(resolve, reject) {
    var dep = arg.name;
    if (arg.version) {
      dep += '@' + arg.version;
    }

    npm.commands.install([dep], function(err) {
      if (err) {
        return reject(err);
      }

      resolve(arg);
    });
  });
}


function getCacheFile(args) {
  var hash = md5(JSON.stringify(args));
  return path.resolve(cacheDir, hash + '.tar.gz');
}


function loadDependenciesFromCache(args) {
  if (args.length === 0) {
      return Promise.resolve();
  }

  var cacheFile = getCacheFile(args);

  if (isThere(cacheFile)) {
    return decompress({
      src: cacheFile,
      dest: scriptNodeModules
    });
  } else {
    return installDependencies(args).then(function() {
      shell.mkdir('-p', cacheDir); // Make sure cache directory exists first
      // And cache the dependencies for later
      return compress({
        src: scriptNodeModules,
        dest: cacheFile,
        gz: {
          level: gzCompressionLevel
        }
      });
    });
  }
}

// If a node_modules folder already exists, then copy it somewhere temporary
function backupExistingNodeModules() {
  if (!isThere(scriptNodeModules)) {
    return Promise.resolve();
  }

  shell.mkdir('-p', cacheDir); // Make sure cache directory exists first
  return compress({
    src: scriptNodeModules,
    dest: backupNodeModules
  }).then(removeScriptNodeModules);
}

function restoreExistingNodeModules() {
  if (!isThere(backupNodeModules)) {
    return Promise.resolve(false);
  }

  return decompress({
    src: backupNodeModules,
    dest: scriptNodeModules
  }).then(function() {
    fs.unlinkSync(backupNodeModules);
    return true;
  })
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
