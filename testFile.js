#! /usr/bin/env cecil

// This is a simple script just to show that you can use functionality from an npm module.
// It takes whatever the argument is, and prints it out 3 times

// In Cecil scripts, there is a global "include" function provided to get npm packages.
var _ = include('lodash', '4.5.1');

// Cecil is the first argument, the name of this script is the second.
// So all arguments start at index 2.
var args = process.argv.slice(2);

console.log(_.repeat(JSON.stringify(args), 3));
