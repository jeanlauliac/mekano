'use strict';

var test = require('tape')
var expandPaths = require('../../lib/read/expand-paths')
var ast = require('../../lib/read/ast')
var interRep = require('../../lib/read/inter-rep')

var TEST_RELS = [
    new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'fizz.c')
      , new ast.Ref(ast.Ref.ALIAS, 'cfiles')
    ], [
        new ast.Trans('Link', false, [new ast.Ref(ast.Ref.ALIAS, 'outfile')])
    ])
]

var TEST_ALIASES = {
    cfiles: new interRep.Alias('cfiles', [
        new ast.Ref(ast.Ref.PATH, 'foo.c')
      , new ast.Ref(ast.Ref.PATH, 'bar.c')
    ])
  , outfile: new interRep.Alias('outfile', [
        new ast.Ref(ast.Ref.PATH, 'a.out')
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
