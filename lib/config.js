
var path = require('path');
var oshome = require('os-homedir');

var depInstallDir = path.resolve(oshome(), '.cecil');

module.exports = {
  depInstallDir: depInstallDir,
  installDependencyPath: installDependencyPath
};

function installDependencyPath(name, version) {
  return path.resolve(depInstallDir, name, version || 'latest');
}
