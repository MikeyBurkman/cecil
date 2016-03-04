
var path = require('path');
var os = require('os');

var depInstallDir = path.resolve(os.tmpdir(), 'cecilDependencies');

module.exports = {
  depInstallDir: depInstallDir,
  installDependencyPath: installDependencyPath
};

function installDependencyPath(name, version) {
  return path.resolve(depInstallDir, name, version || 'latest');
}
