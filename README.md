# cecil
When creating an entire NodeJs module is just too much work

## What does it do?
cecil lets you run (and distribute) single-file NodeJS scripts that require external dependencies, without the need for maintaining an entire module and package.json

A REPL is also included, to give you a node-like repl that allows you to include (and automatically install) npm dependencies while in the shell

## Quick Start
### Write a quick `testFile.js` script like this:
```js
// This is a simple script just to show that you can use functionality from an npm module.

// In Cecil scripts, there is a global "include" function provided to get npm packages.
// We can optionally provide a second argument to specify the specific version to use.
var _ = include('lodash');

var odd = _.filter([1, 2, 3], function(n) {
  return n % 2 === 1;
});

console.log(odd);
```

That's it!

### Next, install cecil globally

```sh
npm install -g cecil
```

### Now just invoke your script!
```sh
cecil ./testFile
> [ 1, 3 ]
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
./testFile.js
> [ 1, 3 ]
```

## REPL
A REPL is provided so you can interactively work with npm dependencies without setting up an entire project:
```sh
cecil-repl
> var lodash = include('lodash');
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
- It parses your code for calls to `include(name [, version]);` to find your dependencies
  - The name is required
  - The version is optional. It must be any valid NPM semver version. If `latest`, then NPM will be queried every time to get the latest version number.
- It will use npm to install these modules into the `.cecil` directory in your home directory
- It even supports concurrently loading different versions of the same module! (I have no idea why you'd want to do that but it was easy to implement.)
- You still use `require()` for core modules, like `path` or `fs`

## Caveats
- **Both name and version must be LITERAL values.** IE: they must both be strings. (Of course, version is optional.)
  - (Dependency resolution is done before anything is run. Dynamic loading of modules would require everything to be async, and I didn't feel that was worth it.)
- In the REPL, there is currently no support for multi-line commands. Need to figure out how best to handle that.
- You can't `require()` other cecil scripts. Right now the best you can do is to use `process.argv[0]` (which is the cecil executable) to spawn a new process calling the other script. I plan to add support for `include('./foo.js')` in a future version of cecil.
