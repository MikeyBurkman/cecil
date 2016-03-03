#! /usr/bin/env node

var repl = require('repl');
var vm = require('vm');
var Promise = require('bluebird');

var cecil = require('../lib/cecil');
var parser = require('../lib/parser');

start();

function start() {

  var replServer = repl.start({
    eval: evalCmd
  });

  replServer.context.include = cecil.includeDependency;
}

function evalCmd(cmd, context, filename, callback) {

  function parseForDependencies() {
    return parser.parse({
      fileName: 'repl',
      contents: cmd
    });
  }

  function executeCmd() {
    var script = new vm.Script(cmd);
    return script.runInContext(context);
  }

  Promise.resolve()
    .then(parseForDependencies)
    .then(cecil.downloadDependencies)
    .then(executeCmd)
    .then(function(result) {
      callback(null, result);
    })
    .catch(parser.ParseError, function(err) {
      if (err.isBadJs) {
        throw err;
      }
      callback(err.message);
    })
    .catch(callback);
}
