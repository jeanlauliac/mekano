'use strict';

var test = require('tape')
var expandPaths = require('../../lib/read/expand-paths')
var ast = require('../../lib/read/ast')
var interRep = require('../../lib/read/inter-rep')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_RELS = [
    new ast.Relation([
        tokenOf(Token.PATH, 'fizz.c')
      , tokenOf(Token.IDENTIFIER, 'cfiles')
    ], [
        new ast.Trans('Link', false, [tokenOf(Token.IDENTIFIER, 'outfile')])
    ])
]

var TEST_ALIASES = {
    cfiles: new interRep.Alias('cfiles', [
        tokenOf(Token.PATH, 'foo.c')
      , tokenOf(Token.PATH, 'bar.c')
    ])
  , outfile: new interRep.Alias('outfile', [
        tokenOf(Token.PATH, 'a.out')
    ])
}

test('read.expandPaths() ', function (t) {
    var rels = expandPaths(TEST_RELS, TEST_ALIASES)
    t.equal(rels.length, 1)
    t.equal(rels[0].prereqs.length, 3)
    t.equal(rels[0].prereqs[0].value, 'fizz.c')
    t.equal(rels[0].prereqs[1].value, 'foo.c')
    t.equal(rels[0].prereqs[2].value, 'bar.c')
    t.equal(rels[0].transs.length, 1)
    t.equal(rels[0].transs[0].targets.length, 1)
    t.equal(rels[0].transs[0].targets[0].value, 'a.out')
    t.end()
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
