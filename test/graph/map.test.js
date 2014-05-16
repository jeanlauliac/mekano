'use strict';

var test = require('tape')
var map = require('../../lib/graph/map')
var interRep = require('../../lib/read/inter-rep')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_TRANSS = [
    new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH, 'foo.o')
      , tokenOf(Token.PATH, 'bar.o')
    ], [tokenOf(Token.PATH, 'a.out')])
  , new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH, 'foo.c')
    ], [tokenOf(Token.PATH, 'foo.o')])
  , new interRep.PlainTrans({multi:false}, [
        tokenOf(Token.PATH, 'bar.c')
    ], [tokenOf(Token.PATH, 'bar.o')])
]

// var TEST_RELS_2 = [
//     new ast.Relation([
//         tokenOf(Token.PATH_GLOB, '*.out')
//     ], [new ast.Trans('Merge', false, [tokenOf(Token.PATH, './merged')])])
//   , new ast.Relation([
//         tokenOf(Token.PATH_GLOB, '*.c')
//     ], [new ast.Trans('Build', false, [tokenOf(Token.PATH, 'a.out')])])
// ]
// var TEST_UNIT_2 = new ast.Unit([], TEST_RELS_2, [])

var TEST_FS = {
    glob: function (pattern, opts, cb) {
        if (typeof cb === 'undefined') {
            cb = opts
            opts = {}
        }
        if (pattern === '*.c')
            return process.nextTick(cb.bind(null, null, ['foo.c', 'bar.c']))
        return process.nextTick(cb.bind(null, null, []))
    }
}

test('graph.map() simple', function (t) {
    map(TEST_FS, TEST_TRANSS, function (err, graph) {
        t.error(err)
        var fooObj = graph.getFileByPath('foo.o')
        t.equal(fooObj.inEdge.inFiles.length, 1)
        t.equal(fooObj.inEdge.inFiles[0].path, 'foo.c')
        t.equal(fooObj.outEdges.length, 1)
        t.equal(fooObj.outEdges[0].outFiles.length, 1)
        t.equal(fooObj.outEdges[0].outFiles[0].path, 'a.out')
        t.equal(fooObj.outEdges[0].inFiles.length, 2)
        t.end()
    })
})

test.skip('graph.map() globs', function (t) {
    map(TEST_FS, TEST_TRANSS_2, function (err, graph) {
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
