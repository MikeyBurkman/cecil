
var repl = require('repl');
var vm = require('vm');

var cecil = require('./cecil');
var parser = require('./parser');

module.exports = {
  start: start
};

function start() {

  var replServer = repl.start({
    eval: evalCmd
  });

  replServer.context.include = cecil.includeFunction;
}

function evalCmd(cmd, context, filename, callback) {

  function runCmd() {
    var script = new vm.Script(cmd);
    var result;

    try {
      result = script.runInContext(context);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  }

  try {
    var deps = parser.parse({
      fileName: 'repl',
      contents: cmd
    });

    if (deps.length > 0) {
      cecil.installDependencies(deps).then(runCmd);
    } else {
      runCmd();
    }

  } catch (err) {
    return callback(err);
  }

}
