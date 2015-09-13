# Cecil
When creating package.json is just too much work

## What does it do?
Cecil lets you run and distribute single-file NodeJS scripts that require external dependencies, without the need for maintaining an entire module

## Quick Start
### Write a quick echoRepeat.js script like this:
```js
#! /usr/bin/env cecil

//! lodash@3.10.1

// This is a stupid script just to show that you can use functionality from an external library
// It takes whatever the argument is, and prints it out 3 times
var _ = require('lodash');

// Like a normal nodejs script, arg[0] is the node executable, and arg[1] is the script name
// So for this, take all args after the first 2
var args = process.argv.slice(2);

console.log(_.repeat(JSON.stringify(args), 3));

```

### No need to write package.json!

### Next, install Cecil globally

```sh
npm install -g cecil
```

### Now just invoke your script!
```sh
./echoRepeat.js hello world
> ["hello","world"]["hello","world"]["hello","world"]
```

Alternately, you can use Cecil directly to launch your script:
```sh
cecil ./echoRepeat.js hello world
> ["hello","world"]["hello","world"]["hello","world"]
```

## Why?
##### I wanted the ability to write small, lightweight, and self-contained scripts
- Sometimes you just want a single simple script without initializing an entire npm structure
- You can put multiple scripts in the same folder without conflicting dependencies
- You can distribute single files, instead of scripts with package.json files
- Not everything needs to be its own module in NPM
- Node is cooler than Perl

## How does it work?
- It looks through your file for dependencies marked with `//! dependency@version`
  - The version is optional. Npm will default to the latest if not provided. I don't recommend this.
- It will stop looking for dependencies when it hits the first non-comment line
- It then installs all dependencies to node_modules using npm
  - If a node_modules folder already exists, it is copied to a backup folder, and then restored when the script has completed
  - For subsequent runs, the dependencies are all cached in the Cecil folder, so the script starts up faster
- When the script finishes, it deletes node_modules, leaving your workspace pristine
- As long as your script has the appropriate shebang and is executable, you can execute it as if it were a bash script
- The file itself is executed how you'd expect it to, in its own process. Cecil just takes care of installing NPM depedencies for you.

## Caveats
- Not tested on Windows. YMMV
- The first time you call a script, NPM will download all dependencies. I can't figure out how to silence it, so you'll see the output from NPM.
- Though it backs up any pre-existing node_modules folder, if the Node process is killed while running, the backup won't be restored. In that case, you can retrieve the backup from in the `.cache/` folder in the Cecil install folder.
