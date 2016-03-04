var esprima = require('esprima');
var estraverse = require('estraverse');

var globalIncludeIdentifier = 'include';
var supportedVersionsRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

module.exports = {
  parse: parse,
  ParseError: ParseError
};

function parse(file) {

  var fileName = file.fileName;
  var contents = file.contents;

  var ast;

  try {
    ast = esprima.parse(contents, {
      loc: true
    });
  } catch (err) {
    throw new ParseError(fileName, null, null, err.message, true);
  }

  var deps = [];

  estraverse.traverse(ast, {
    enter: function(node) {
      if (node.type !== 'VariableDeclaration') {
        return;
      }

      var declarations = node.declarations;

      for (var n in declarations) {
        var dependency = parseDeclaration(fileName, declarations[n]);
        if (dependency) {
          deps.push(dependency);
        }
      }
    }
  });

  return deps;

}

function parseDeclaration(fileName, declaration) {
  var varName = declaration.id.name;
  var lineNumber = null;

  function throwError(message) {
    throw new ParseError(fileName, varName, lineNumber, message);
  }

  if (!declaration.init || declaration.init.type !== 'CallExpression') {
    return null;
  }

  if (declaration.init.callee.type !== 'Identifier') {
    return null;
  }

  if (declaration.init.callee.name !== globalIncludeIdentifier) {
    return null;
  }

  lineNumber = declaration.init.callee.loc.start.line;

  // It's an include() -- the name and version are the arguments
  var includeArgs = declaration.init.arguments;
  if (includeArgs.length !== 2) {
    throwError('Call to ' + globalIncludeIdentifier + '() requires both a name and version string arguments');
  }

  var depNameArg = includeArgs[0];
  var depVersionArg = includeArgs[1];

  if (depNameArg.type !== 'Literal' || depVersionArg.type !== 'Literal') {
    throwError('Call to ' + globalIncludeIdentifier +'() requires both name and version string arguments');
  }

  var depName = depNameArg.value;
  var depVersion = depVersionArg.value;

  if (typeof depName !== 'string') {
    throwError('npm module name argument must be a string');
  }

  if (typeof depVersion !== 'string') {
    throwError('npm module version argument must be a string');
  }

  if (!supportedVersionsRegex.test(depVersion)) {
    throwError('Currently only absolute version numbers are supported');
  }

  return {
    name: depName,
    version: depVersion
  };
}

function ParseError(fileName, varName, lineNumber, message, isBadJs) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.isBadJs = isBadJs;
  this.message = [
    fileName,
    lineNumber ? 'Line ' + lineNumber : null,
    varName ? 'Error including "' + varName + '"' : null,
    message
  ]
  .filter(function(m) {
    return m;
  })
  .join('; ');
}
require('util').inherits(ParseError, Error);
