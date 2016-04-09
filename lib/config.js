
var path = require('path');
var oshome = require('os-homedir');
var os = require('os');

var depInstallDir = path.resolve(oshome(), '.cecil');
var tmpDir = path.resolve(os.tmpdir(), 'cecil');

module.exports = {
  depInstallDir: depInstallDir,
  tmpDir: tmpDir
};
