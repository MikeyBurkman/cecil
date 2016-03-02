# cecil
When creating package.json is just too much work

## What does it do?
cecil lets you run (and distribute) single-file NodeJS scripts that require external dependencies, without the need for maintaining an entire module and package.json

## Quick Start
### Write a quick echoRepeat.js script like this. This script will just take the arguments and print them out 3 times.
```js
#! /usr/bin/env cecil
// Note that the shebang is only required if we want to make this script executable

// In Cecil scripts, there is a global "include" function provided to get npm packages.
var _ = include('lodash', '4.5.1');

// Cecil is the first argument, the name of this script is the second.
// So all arguments start at index 2.
var args = process.argv.slice(2);

var argString = JSON.stringify(args);
console.log(_.repeat(argString, 3));
```

That's it!

### Next, install cecil globally

```sh
npm install -g cecil
```

### Now just invoke your script!
(Make sure the script is executable, of course)
```sh
chmod a+x echoRepeat.js
```
And invoke the script
```sh
./echoRepeat.js hello world
> ["hello","world"]["hello","world"]["hello","world"]
```

Alternately, you can use cecil directly to launch your script. No shebang is required in this case.
```sh
cecil ./echoRepeat.js hello world
> ["hello","world"]["hello","world"]["hello","world"]
```

## Why?
##### I wanted the ability to write small, lightweight, and self-contained scripts
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
- It will use npm to install these modules into a temp directory (somewhere in `os.tmpdir()`)
- It even supports concurrently loading different versions of the same module! (I have no idea why you'd want to do that but it was easy to implement.)
- You still use `require()` for core modules, like `path` or `fs`

## TODO
- Add ability to clear out the temporary cache. Currently everything is stored in a cache in a temp directory as dictated by the os. Just run `cecil` without any arguments to print out the location of that cache.
- I'll probably change `include()` to work with only one argument, but ONLY if it's a core module like `path`. That way you'll never have to use `require()` in a cecil script
- Add command to add an include for the latest version of some dependency. I don't like having to look up version numbers elsewhere.
