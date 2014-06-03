'use strict';

var test = require('tape')
var map = require('../../lib/graph/map')
var interRep = require('../../lib/read/inter-rep')
var ast = require('../../lib/read/ast')
var Log = require('../../lib/update/log')

var TEST_LOG = new Log()
TEST_LOG.update('old.o', 42)

var TEST_TRANSS = [
    new interRep.PlainTrans({multi: false}, [
        new ast.Ref(ast.Ref.PATH, 'foo.c')
    ], [new ast.Ref(ast.Ref.PATH, 'foo.o')])
  , new interRep.PlainTrans({multi:false}, [
        new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [new ast.Ref(ast.Ref.PATH, 'bar.o')])
  , new interRep.PlainTrans({multi: false}, [
        new ast.Ref(ast.Ref.PATH, 'foo.o')
      , new ast.Ref(ast.Ref.PATH, 'bar.o')
    ], [new ast.Ref(ast.Ref.PATH, 'a.out')])
]

test('graph.map() simple', function (t) {
    var ev = map(testGlob, TEST_LOG, TEST_TRANSS)
    ev.on('finish', function testGraph(graph) {
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
        new ast.Ref(ast.Ref.PATH_GLOB, '*.c')
    ], [
        new ast.Ref(ast.Ref.PATH, 'foo.o')
      , new ast.Ref(ast.Ref.PATH, 'bar.o')
    ])
  , new interRep.PlainTrans({multi:false}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.o')
    ], [new ast.Ref(ast.Ref.PATH, 'a.out')])

]

test('graph.map() globs', function (t) {
    var ev = map(testGlob, TEST_LOG, TEST_TRANSS_GLOBS)
    ev.on('finish', function testGraph(graph) {
        var fooObj = graph.getFileByPath('foo.o')
        t.equal(fooObj.inEdge.inFiles.length, 2)
        t.equal(fooObj.inEdge.inFiles[0].path, 'bar.c')
        t.equal(fooObj.inEdge.inFiles[1].path, 'foo.c')
        t.equal(fooObj.outEdges.length, 1)
        t.equal(fooObj.outEdges[0].outFiles.length, 1)
        t.equal(fooObj.outEdges[0].outFiles[0].path, 'a.out')
        t.equal(fooObj.outEdges[0].inFiles.length, 2)
        t.end()
    })
})

var TEST_TRANSS_MULTI = [
    new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.c')
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.o')])
  , new interRep.PlainTrans({multi: true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.o')
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.a')])
]

test('graph.map() multi', function (t) {
    var ev = map(testGlob, TEST_LOG, TEST_TRANSS_MULTI)
    ev.on('finish', function (graph) {
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

function testGlob(pattern, opts, cb) {
    if (typeof cb === 'undefined') {
        cb = opts
        opts = {}
    }
    if (pattern === '*.c')
        return process.nextTick(cb.bind(null, null, ['foo.c', 'bar.c']))
    if (pattern === '*.o')
        return process.nextTick(cb.bind(null, null
                                      , ['foo.o', 'bar.o', 'old.o']))
    return process.nextTick(cb.bind(null, null, []))
}
