'use strict';

var expect = require('chai').expect;

describe(__filename, function() {
  
  var parser = require('./parser');
  
  it('Should parse a single dependency with no version', function() {
    var results = parser.parse({
      fileName: 'test',
      contents: 'var x = include("foo");'
    });
    
    expect(results).to.have.length(1);
    expect(results[0]).to.eql({
      name: 'foo',
      version: undefined
    });
  });
  
  it('Should parse a single dependency with a version', function() {
    var results = parser.parse({
      fileName: 'test',
      contents: 'var x = include("foo", "1.2");'
    });
    
    expect(results).to.have.length(1);
    expect(results[0]).to.eql({
      name: 'foo',
      version: '1.2'
    });
  });
  
  it('Should parse multiple dependencies independently', function() {
    var results = parser.parse({
      fileName: 'test',
      contents: [
        'var x = include("foo", "1.2");',
        'var y = include("bar");'
      ].join('\n')
    });
    
    expect(results).to.have.length(2);
    expect(results[0]).to.eql({
      name: 'foo',
      version: '1.2'
    });
    expect(results[1]).to.eql({
      name: 'bar',
      version: undefined
    });
  });
  
  it('Should parse multiple dependencies in the same var statement', function() {
    var results = parser.parse({
      fileName: 'test',
      contents: [
        'var x = include("foo", "1.2"),',
        '    y = include("bar");'
      ].join('\n')
    });
    
    expect(results).to.have.length(2);
    expect(results[0]).to.eql({
      name: 'foo',
      version: '1.2'
    });
    expect(results[1]).to.eql({
      name: 'bar',
      version: undefined
    });
  });
  
  it('Should parse an expression with multiple parts', function() {
    var results = parser.parse({
      fileName: 'test',
      contents: 'var x = include("foo", "1.2").bar;'
    });
    
    expect(results).to.have.length(1);
    expect(results[0]).to.eql({
      name: 'foo',
      version: '1.2'
    });
  });
  
  describe('#ERRORS', function() {
    
    it('Should throw an error on malformed JS', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = ;'
        });
      }).to.throw(Error);
    });
    
    it('Should throw when no args to include()', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include();'
        });
      }).to.throw(Error, /Error including "x"/);
    });
    
    it('Should throw when bad name arg to include()', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include(true);'
        });
      }).to.throw(Error, /Error including "x"/);
    });
    
    it('Should throw when bad version to include()', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include("foo", 1.2);'
        });
      }).to.throw(Error, /Error including "x"/);
    });
    
    it('Should throw when non-literal name arg to include()', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include("foo"+"bar");'
        });
      }).to.throw(Error, /Error including "x"/);
    });
    
    it('Should throw when non-literal version arg to include()', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include("foo", "bar"+"baz");'
        });
      }).to.throw(Error, /Error including "x"/);
    });
    
    it('Should capture the name of the variable for an expression with multiple parts', function() {
      expect(function() {
        parser.parse({
          fileName: 'test',
          contents: 'var x = include("foo", "bar"+"baz").quux;'
        });
      }).to.throw(Error, /Error including "x"/);
    });
  });
});