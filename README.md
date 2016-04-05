# cecil
When creating package.json is just too much work

## What does it do?
cecil lets you run (and distribute) single-file NodeJS scripts that require external dependencies, without the need for maintaining an entire module and package.json

A REPL is also included, to give you a node-like repl that allows you to include (and automatically install) npm dependencies while in the shell

## Quick Start
### Write a quick testFile.js script like this:
```js
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
```

That's it!

### Next, install cecil globally

```sh
npm install -g cecil
```

### Now just invoke your script!
```sh
cecil ./testFile foo blah bar
> [ 'foo', 'bar' ]
```

### You can even do some unix magic and make the scripts executable!

First, make sure the script is executable, of course
```sh
chmod a+x testFile.js
```
Next, add the correct shebang to the top of the file:
```js
#! /usr/bin/env cecil
...
```

And then invoke the script
```sh
./testFile.js foo blah bar
> [ 'foo', 'bar' ]
```

## REPL
A REPL is provided so you can interactively work with npm dependencies without setting up an entire project:
```sh
cecil-repl
> var lodash = include('lodash', '4.5.1');
undefined
> lodash.filter([1,2,3], function(x) { return x % 2 == 1; });
[ 1, 3 ]
```

## Why?
##### I wanted the ability to write small, lightweight, and self-contained scripts
- Write self-contained **gists** of node code
- You can put multiple scripts in the same folder without conflicting dependencies
- You can distribute single files, instead of scripts with package.json files
- You can experiment with new npm modules very easily. (Even compare different versions of the same module.)
- I personally prefer scripting in Node rather than Perl/Bash/etc

## How does it work?
- It parses your code for calls to `include(name, version)` to find your dependencies
  - Both name and version are required
  - **Both name and version must be LITERAL values.** IE: they must both be strings.
  - (Dependency resolution is done before the script is run. Dynamic loading of modules would require everything to be async, and I didn't feel that was worth it.)
  - **Currently only absolute version numbers are supported.** No wildcards or ranges.
- It will use npm to install these modules into the `.cecil` directory in your home directory
- It even supports concurrently loading different versions of the same module! (I have no idea why you'd want to do that but it was easy to implement.)
- You still use `require()` for core modules, like `path` or `fs`

## TODO
- Add ability to clear out (and maybe view) the cecil npm cache.
- Make `include()` work with actual semver values. Will require looking through the cache for a version that's valid for the requested version.
- In the REPL, there is currently no support for multi-line inputs. Need to figure out how best to handle that.
- The include function only works as a standalone variable declaration. Need to parse it differently so it can work in other places.
