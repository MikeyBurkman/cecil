var esprima = require('esprima');
var estraverse = require('estraverse');

var globalIncludeIdentifier = 'include';

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
  if (includeArgs.length < 1 || includeArgs.length > 2) {
    throwError('Call to ' + globalIncludeIdentifier + '() requires at least a name string, and optionally a version string, argument');
  }

  var depNameArg = includeArgs[0];
  var depVersionArg = includeArgs.length > 1 && includeArgs[1];

  if (depNameArg.type !== 'Literal') {
    throwError('Call to ' + globalIncludeIdentifier +'() requires that the name argument is a literal string');
  }

  if (depVersionArg && depVersionArg.type !== 'Literal') {
    throwError('Call to ' + globalIncludeIdentifier +'() requires that the version argument, if given, is a literal string');
  }

  var depName = depNameArg.value;
  var depVersion = depVersionArg && depVersionArg.value;

  if (typeof depName !== 'string') {
    throwError('npm module name argument must be a string');
  }

  if (depVersion && typeof depVersion !== 'string') {
    throwError('npm module version argument must be a string');
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
