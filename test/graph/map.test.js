'use strict';

var test = require('tape')
var map = require('../../lib/graph/map')
var interRep = require('../../lib/read/inter-rep')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')
var Log = require('../../lib/update/log')

var TEST_LOG = new Log()
TEST_LOG.update('old.o', 42)

var TEST_TRANSS = [
    new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH, 'foo.c')
    ], [tokenOf(Token.PATH, 'foo.o')])
  , new interRep.PlainTrans({multi:false}, [
        tokenOf(Token.PATH, 'bar.c')
    ], [tokenOf(Token.PATH, 'bar.o')])
  , new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH, 'foo.o')
      , tokenOf(Token.PATH, 'bar.o')
    ], [tokenOf(Token.PATH, 'a.out')])
]

test('graph.map() simple', function (t) {
    map(testGlob, TEST_LOG, TEST_TRANSS, function testGraph(err, graph) {
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

var TEST_TRANSS_GLOBS = [
    new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH_GLOB, '*.c')
    ], [
        tokenOf(Token.PATH, 'foo.o')
      , tokenOf(Token.PATH, 'bar.o')
    ])
  , new interRep.PlainTrans({multi:false}, [
        tokenOf(Token.PATH_GLOB, '*.o')
    ], [tokenOf(Token.PATH, 'a.out')])

]

test('graph.map() globs', function (t) {
    map(testGlob, TEST_LOG, TEST_TRANSS_GLOBS, function testGraph(err, graph) {
        t.error(err)
        var fooObj = graph.getFileByPath('foo.o')
        t.equal(fooObj.inEdge.inFiles.length, 2)
        t.equal(fooObj.inEdge.inFiles[0].path, 'foo.c')
        t.equal(fooObj.inEdge.inFiles[1].path, 'bar.c')
        t.equal(fooObj.outEdges.length, 1)
        t.equal(fooObj.outEdges[0].outFiles.length, 1)
        t.equal(fooObj.outEdges[0].outFiles[0].path, 'a.out')
        t.equal(fooObj.outEdges[0].inFiles.length, 2)
        t.end()
    })
})

var TEST_TRANSS_MULTI = [
    new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '*.c')
    ], [tokenOf(Token.PATH_GLOB, '*.o')])
  , new interRep.PlainTrans({multi: true}, [
        tokenOf(Token.PATH_GLOB, '*.o')
    ], [tokenOf(Token.PATH_GLOB, '*.a')])
]

test('graph.map() multi', function (t) {
    map(testGlob, TEST_LOG, TEST_TRANSS_MULTI, function (err, graph) {
        t.error(err)
        var fooObj = graph.getFileByPath('foo.o')
        t.equal(fooObj.inEdge.inFiles.length, 1)
        t.equal(fooObj.inEdge.inFiles[0].path, 'foo.c')
        t.equal(fooObj.outEdges[0].outFiles.length, 1)
        t.equal(fooObj.outEdges[0].outFiles[0].path, 'foo.a')
        var barObj = graph.getFileByPath('bar.o')
        t.equal(barObj.inEdge.inFiles.length, 1)
        t.equal(barObj.inEdge.inFiles[0].path, 'bar.c')
        t.equal(barObj.outEdges[0].outFiles.length, 1)
        t.equal(barObj.outEdges[0].outFiles[0].path, 'bar.a')
        t.end()
    })
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}

function testGlob(pattern, opts, cb) {
    if (typeof cb === 'undefined') {
        cb = opts
        opts = {}
    }
    if (pattern === '*.c')
        return process.nextTick(cb.bind(null, null, ['foo.c', 'bar.c']))
    if (pattern === '*.o')
        return process.nextTick(cb.bind(null, null
                                      , ['foo.c', 'bar.c', 'old.o']))
    return process.nextTick(cb.bind(null, null, []))
}
