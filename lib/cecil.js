'use strict';

var path = require('path');

var Promise = require('bluebird');
var readFileAsync = Promise.promisify(require('fs').readFile);
var mv = Promise.promisify(require('mv'));
var npmi = Promise.promisify(require('npmi'));
var rmdir = Promise.promisify(require('rmdir'));
var isThere = require('is-there');
var parser = require('./parser');
var config = require('./config');

var nodeModules = path.resolve(config.depInstallDir, 'node_modules');

module.exports = {
  execute: execute,
  includeDependency: includeDependency,
  downloadDependencies: downloadDependencies
};

function execute(scriptFile, args) {

  var prevArgs = process.argv;

  return readScriptFile(scriptFile)
    .then(parser.parse)
    .then(downloadDependencies)
    .then(addIncludeToGlobalScope)
    .then(function() {
      process.argv = args;
      require(scriptFile);
    })
    .finally(function() {
      process.argv = prevArgs;
    });
}

//// Functions below

function downloadDependencies(deps) {
  return Promise.mapSeries(deps, downloadDependency)
    .then(function() {
      if (isThere(nodeModules)) {
        return rmdir(nodeModules);
      } else {
        return true;
      }
    });
}

function downloadDependency(dep) {
  if (!dep.version) {
    throw new Error('No version given in include() for dependency: "' + dep.name + '"');
  }

  if (depAlreadyInstalled(dep)) {
    return Promise.resolve(dep);
  }

  var _stdoutWrite = process.stdout.write;
  process.stdout.write = function() {}; // noop write, to silence npm

  return npmi({
      name: dep.name,
      version: dep.version,
      path: config.depInstallDir
    })
    .then(function() {
      return moveDependency(dep);
    })
    .then(function() {
      return dep;
    })
    .finally(function() {
      process.stdout.write = _stdoutWrite;
    });
}

function depAlreadyInstalled(dep) {
  // Look for package.json -- OSX deletes files from the temp directory but not always the folders?
  var depPath = config.installDependencyPath(dep.name, dep.version);
  return isThere(path.resolve(depPath, 'package.json'));
}

function moveDependency(dep) {
  var source = path.resolve(nodeModules, dep.name);
  var dest = config.installDependencyPath(dep.name, dep.version);
  return mv(source, dest, {
    mkdirp: true,
    clobber: true
  });
}

function readScriptFile(scriptFile) {

  return readFileAsync(scriptFile, 'utf8')
    .then(function(file) {
      return {
        fileName: scriptFile,
        contents: trimShebang(file)
      };
    });

  function trimShebang(text) {
    return text.replace(/^#!([^\r\n]+)/, function(match, captured) {
      return '//' + captured;
    });
  }
}

function includeDependency(name, version) {
  var p = config.installDependencyPath(name, version);
  return require(p);
}

function addIncludeToGlobalScope() {
  global.include = includeDependency;
}
