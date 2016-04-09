#! /usr/bin/env cecil

// This is a simple script just to show that you can use functionality from an npm module.

// In Cecil scripts, there is a global "include" function provided to get npm packages.
// We can optionally provide a second argument to specify the specific version to use.
var _ = include('lodash');

var odd = _.filter([1, 2, 3], function(n) {
  return n % 2 === 1;
});

console.log(odd);
