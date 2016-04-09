'use strict';

var path = require('path');

var Promise = require('bluebird');
var readFileAsync = Promise.promisify(require('fs').readFile);
var mv = Promise.promisify(require('mv'));
var npmi = Promise.promisify(require('npmi'));
var rmdir = Promise.promisify(require('rmdir'));
var latestVersion = require('latest-version');
var isThere = require('is-there');

var log = require('./logger');
var parser = require('./parser');
var config = require('./config');
var cecilCache = require('./cecilCache');

var nodeModules = path.resolve(config.depInstallDir, 'node_modules');

module.exports = {
  execute: execute,
  loadDependencies: loadDependencies,
  includeDependency: includeDependency
};

function execute(scriptFile, args) {

  log('Executing script:' , scriptFile);

  var prevArgs = process.argv;

  return readScriptFile(scriptFile)
    .then(parser.parse)
    .then(loadDependencies)
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

function loadDependencies(deps) {
  return Promise.mapSeries(deps, fetchDependency)
    .tap(function() {
      if (isThere(nodeModules)) {
        log('Deleting temp node_modules');
        return rmdir(nodeModules);
      }
    })
    .then(function(loadedDeps) {
      // Convert our array of loaded dependencies into a single lookup object
      var deps = {};
      loadedDeps.forEach(function(d) {
        deps[d.name] = d.path;
      });
      return deps;
    });
}

function fetchDependency(dep) {
  if (!dep.version) {
    dep.version = 'latest';
  }

  var name = dep.name;

  return translateVersion(name, dep.version)
    .then(function(actualVersion) {
      log('Loading ', name, ' : ', actualVersion);
      return cecilCache(name, actualVersion)
        .then(function(cachePath) {
          return cachePath || downloadDependency(name, actualVersion);
        });
    })
    .then(function(depPath) {
      return {
        name: normalize(name, dep.version),
        path: depPath
      };
    });

}

function translateVersion(name, version) {
  if (version === 'latest') {
    log('Latest version given for ', name);
    return latestVersion(name);
  } else {
    return Promise.resolve(version);
  }
}

// Installs the dependency from NPM, copies it to the cecil cache, and
//  then returns the path to the dependency in the cache
function downloadDependency(name, version) {
  log('Installing ', name, version, ' from NPM');

  var _stdoutWrite = process.stdout.write;
  process.stdout.write = function() {}; // noop write, to silence npm

  return npmi({
      name: name,
      version: version,
      path: config.depInstallDir
    })
    .then(function() {
      return copyDepToCecilCache(name);
    })
    .finally(function() {
      process.stdout.write = _stdoutWrite;
    });
}

function copyDepToCecilCache(name) {
  var source = path.resolve(nodeModules, name);
  var actualVersion = require(path.resolve(source, 'package.json')).version;
  var dest = path.resolve(config.depInstallDir, name, actualVersion);
  return mv(source, dest, {
    mkdirp: true,
    clobber: true
  })
  .then(function() {
    return dest;
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

function normalize(name, version) {
  version = version || 'latest';
  return [name, version].join('@');
}

function includeDependency(loadedDeps, name, version) {
  var reqPath = loadedDeps[normalize(name, version)];
  log('Loading: ', reqPath);
  return require(reqPath);
}

function addIncludeToGlobalScope(loadedDeps) {
  log('Loaded dependencies: ', loadedDeps);

  global.include = function(name, version) {
    return includeDependency(loadedDeps, name, version);
  };
}
