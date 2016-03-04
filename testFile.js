#! /usr/bin/env cecil

// This is a simple script just to show that you can use functionality from an npm module.
// It takes whatever the arguments are, and filters out anything longer than 3 characters

// In Cecil scripts, there is a global "include" function provided to get npm packages.
var _ = include('lodash', '4.5.1');

// Cecil is the first argument, the name of this script is the second.
// So all arguments start at index 2.
var args = process.argv.slice(2);

var filtered = _.filter(args, function(arg) {
  return arg.length <= 3;
});

console.log(filtered);
