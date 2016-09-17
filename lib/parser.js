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
  // Keep track of the variable we're currently assigning.
  // This is used for friendly error messages.
  var currentVarName;

  estraverse.traverse(ast, {
    enter: function(node, parent) {
      
      if (node.type === 'VariableDeclarator') {
          currentVarName = node.id.name;
      }
      
      var dep = tryParseNode(node, currentVarName, parent, fileName);
      if (dep) {
        deps.push(dep);
      }
    }
  });

  return deps;

}

function tryParseNode(node, currentVarName, parent, fileName) {
  
  if (node.type !== 'CallExpression') {
    return null;
  }

  if (node.callee.type !== 'Identifier') {
    return null;
  }

  if (node.callee.name !== globalIncludeIdentifier) {
    return null;
  }
  

  function throwError(message) {
    var lineNumber = node.callee.loc.start.line;
    throw new ParseError(fileName, currentVarName, lineNumber, message);
  }

  // It's an include() -- the name and version are the arguments
  var includeArgs = node.arguments;
  if (includeArgs.length < 1 || includeArgs.length > 2) {
    throwError('Call to ' + globalIncludeIdentifier + '() requires at least a name string, and optionally a version string, argument');
  }

  var depNameArg = includeArgs[0];
  var depVersionArg;
  if (includeArgs.length > 1) {
    depVersionArg = includeArgs[1];
  }

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
