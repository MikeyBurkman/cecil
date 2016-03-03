#! /usr/bin/env node

var path = require('path');

var cecil = require('../lib/cecil');
var parser = require('../lib/parser');

if (process.argv.length <= 2) {
  var version = require('../package.json').version;
  var usage = [
    '--- Cecil ---',
    'Utility for running node.js scripts with npm dependencies',
    'Version: ' + version,
    '',
    '--- USAGE ---',
    'cecil:',
    '\tThe first argument is the cecil script to run',
    '\tThe rest of the arguments are passed to that script as if it were a regular node script',
    '\tcecil myScript.js',
    'cecil-repl:',
    '\tA REPL for iteractively coding nodejs code',
    '\tLike cecil scripts, a global include(name, version) function is provided',
    '\tcecil-repl',
    '-------------'
  ].join('\n');
  console.log(usage);
  return;
}

var script = path.resolve(process.cwd(), process.argv[2]);

// Remove node from the process arguments, as cecil is really the executable
var scriptArgs = process.argv.slice(1);

cecil.execute(script, scriptArgs)
  .catch(parser.ParseError, function(parseError) {
    console.error(parseError.message); // No need for a stack trace here
  })
  .catch(function(err) {
    console.error(err.stack); // Log the entire stack trace if unknown error
  });
