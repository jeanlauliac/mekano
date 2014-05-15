'use strict';

var test = require('tape')
var map = require('../../lib/graph/map')
var ast = require('../../lib/read/ast')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_RELS = [
    new ast.Relation([
        tokenOf(Token.PATH, 'foo.o')
      , tokenOf(Token.PATH, 'bar.o')
    ], [new ast.Trans('Link', false, [tokenOf(Token.PATH, 'a.out')])])
  , new ast.Relation([
        tokenOf(Token.PATH, 'foo.c')
    ], [new ast.Trans('Compile', false, [tokenOf(Token.PATH, 'foo.o')])])
  , new ast.Relation([
        tokenOf(Token.PATH, 'bar.c')
    ], [new ast.Trans('Compile', false, [tokenOf(Token.PATH, 'bar.o')])])
]
var TEST_UNIT = new ast.Unit([], TEST_RELS, [])

var TEST_FS = {
    glob: function (pattern, opts, cb) {
        if (pattern === '*.c')
            return process.nextTick(cb.bind(null, null, ['foo.c', 'bar.c']))
        return process.nextTick(cb.bind(null, null, []))
    }
}

test('graph.map() simple tr.', function (t) {
    map(TEST_FS, TEST_UNIT, function (err, graph) {
        t.error(err)
        var fooObj = graph.getFileByPath('foo.o')
        t.equal(fooObj.inRel.recipe, 'Compile')
        t.equal(fooObj.inRel.inFiles.length, 1)
        t.equal(fooObj.inRel.inFiles[0], graph.getFileByPath('foo.c'))
        t.equal(fooObj.outRels.length, 1)
        t.equal(fooObj.outRels[0].recipe, 'Link')
        t.equal(fooObj.outRels[0].outFiles[0], graph.getFileByPath('a.out'))
        var out = graph.getFileByPath('a.out')
        t.equal(out.inRel.inFiles.length, 2)
        t.end()
    })
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
