# Cecil
Run single-file NodeJS scripts with external dependencies!

## Quick Start
### Your script looks like this:
```js
#! /usr/bin/env cecil

//! lodash@3.10.1

var _ = require('lodash');

console.log('Hello world', _.repeat('!', 3));

```

### Install Cecil globally

```sh
npm install -g cecil
```

### Invoke your script!
```sh
./yourScript.js
```

Alternately, you can use Cecil directly to launch your script:
```sh
cecil ./yourScript.js
```

## Why?
##### I wanted the ability to write small, lightweight, and self-contained scripts
- Sometimes you just want a single simple script without initializing an entire npm structure
- You can put multiple scripts in the same folder without conflicting dependencies
- You can distribute single files, instead of scripts with package.json files
- Not everything needs to be its own module in NPM

## How does it work?
- It looks through your file for dependencies marked with `//! dependency@version`
- It will stop looking for dependencies when it hits the first non-comment line
- It then installs all dependencies to node_modules using npm
  - For subsequent runs, the dependencies are cached so it runs faster
- When the script finishes, it deletes node_modules
- As long as your script has the appropriate shebang and is executable, you can execute it as if it were a bash script
- The file itself is executed how you'd expect it to. Cecil just takes care of installing NPM depedencies for you.

## Caveats
- Not tested on Windows. (Probably won't work, as it builds tarballs when caching dependencies.)
- Currently it doesn't preseve existing node_modules. This will be fixed in later versions
- Not sure if it's possible to pipe stdin to these scripts
