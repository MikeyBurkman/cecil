
var log = function log() {
  if (log.enabled) {
    console.log.apply(console, arguments);
  }
};

log.enabled = false;

module.exports = log;
