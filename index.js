#! /usr/bin/env node

var path = require('path');
var os = require('os');

var Promise = require('bluebird');
var readFileAsync = Promise.promisify(require('fs').readFile);
var mv = Promise.promisify(require('mv'));
var npmi = Promise.promisify(require('npmi'));
var rmdir = Promise.promisify(require('rmdir'));
var isThere = require('is-there');

var parser = require('./parser');

var depInstallDir = path.resolve(os.tmpdir(), 'cecilDependencies');
var nodeModules = path.resolve(depInstallDir, 'node_modules');

if (process.argv.length <= 2) {
  // No arguments provided -- currently we just print out where the cache is.
  // Will flesh this out eventually
  console.log('-- NPM Module Cache currently at: ' + depInstallDir);
  return;
}

var script = path.resolve(process.cwd(), process.argv[2]);

readScriptFile()
  .then(parser.parse)
  .then(installDependencies)
  .then(addIncludeToGlobalScope)
  .then(function() {
    // Remove node from the process arguments, as cecil is really the executable
    process.argv = process.argv.slice(1);
    require(script);
  })
  .catch(parser.ParseError, function(parseError) {
    console.error(parseError.message); // No need for a stack trace here
  })
  .catch(function(err) {
    console.error(err.stack); // Log the entire stack trace if unknown error
  });

//// Functions below

function installDependencies(deps) {
  return Promise.mapSeries(deps, installDependency)
    .then(function() {
      if (isThere(nodeModules)) {
        return rmdir(nodeModules);
      } else {
        return true;
      }
    });
}

function installDependency(dep) {
  if (!dep.version) {
    throw new Error('No version given in include() for dependency: "' + dep.name + '"');
  }

  if (depAlreadyInsalled(dep)) {
    return Promise.resolve(dep);
  }

  var stdoutWrite = process.stdout.write;
  process.stdout.write = function() {}; // noop write, to silence npm

  return npmi({
      name: dep.name,
      version: dep.version,
      path: depInstallDir
    })
    .then(function() {
      return moveDependency(dep);
    })
    .then(function() {
      return dep;
    })
    .finally(function() {
      process.stdout.write = stdoutWrite;
    });
}

function getInstalledDepPath(dep) {
  return path.resolve(depInstallDir, dep.name, dep.version || 'latest');
}

function depAlreadyInsalled(dep) {
  return isThere(getInstalledDepPath(dep));
}

function moveDependency(dep) {
  var source = path.resolve(nodeModules, dep.name);
  var dest = getInstalledDepPath(dep);
  return mv(source, dest, {
    mkdirp: true,
    clobber: true
  });
}

function readScriptFile() {

  return readFileAsync(script, 'utf8')
    .then(function(file) {
      return {
        fileName: script,
        contents: trimShebang(file)
      };
    });

  function trimShebang(text) {
    return text.replace(/^#!([^\r\n]+)/, function(match, captured) {
      return '//' + captured;
    });
  }
}

function addIncludeToGlobalScope() {
  global.include = function(name, version) {
    var modulePath = getInstalledDepPath({
      name: name,
      version: version
    });

    return require(modulePath);
  };
}
