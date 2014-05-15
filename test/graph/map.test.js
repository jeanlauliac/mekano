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

var TEST_RELS_2 = [
    new ast.Relation([
        tokenOf(Token.PATH_GLOB, '*.out')
    ], [new ast.Trans('Merge', false, [tokenOf(Token.PATH, './merged')])])
  , new ast.Relation([
        tokenOf(Token.PATH_GLOB, '*.c')
    ], [new ast.Trans('Build', false, [tokenOf(Token.PATH, 'a.out')])])
]
var TEST_UNIT_2 = new ast.Unit([], TEST_RELS_2, [])

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

test('graph.map() globs', function (t) {
    map(TEST_FS, TEST_UNIT_2, function (err, graph) {
        t.error(err)
        var out = graph.getFileByPath('a.out')
        t.equal(out.inRel.recipe, 'Build')
        t.equal(out.inRel.inFiles.length, 2)
        t.equal(out.inRel.inFiles[0], graph.getFileByPath('foo.c'))
        t.equal(out.inRel.inFiles[1], graph.getFileByPath('bar.c'))
        t.equal(out.outRels.length, 1)
        t.equal(out.outRels[0].recipe, 'Merge')
        t.equal(out.outRels[0].outFiles.length, 1)
        t.equal(out.outRels[0].outFiles[0], graph.getFileByPath('./merged'))
        t.end()
    })
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
