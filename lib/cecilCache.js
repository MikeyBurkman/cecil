var isThere = require('is-there');
var Promise = require('bluebird');
var semver = require('semver');

var config = require('./config');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

module.exports = getCachePath;

function getCachePath(name, version) {

  var dir = path.resolve(config.depInstallDir, name);
  if (!isThere(dir)) {
    return Promise.resolve(null);
  }

  return listDirectories(dir).then(function(dirs) {

    // Each directory name will be a version number
    var versions = dirs.reduce(function(mapping, dir) {
      var version = getDirectoryName(dir);
      mapping[version] = dir;
      return mapping;
    }, {});

    var maxVersion = semver.maxSatisfying(Object.keys(versions), version);

    if (!maxVersion) {
      return null;
    }

    return versions[maxVersion];
  });
}

function listDirectories(dir) {
  return fs.readdirAsync(dir)
    .filter(function(file) {
      return fs.statAsync(path.resolve(dir, file))
        .then(function(stat) {
          return stat.isDirectory();
        });
    })
    .map(function(versionName) {
      return path.resolve(dir, versionName);
    });
}

function getDirectoryName(dir) {
  return dir.split(path.sep).slice(-1);
}
