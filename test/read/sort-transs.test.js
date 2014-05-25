'use strict';

var test = require('tape')
var interRep = require('../../lib/read/inter-rep')
var sortTranss = require('../../lib/read/sort-transs')
var ast = require('../../lib/read/ast')
var Location = require('../../lib/read/location')

var TEST_TRANSS = [
    new interRep.PlainTrans({multi: false}, [
        new ast.Ref(ast.Ref.PATH, 'foo.o')
      , new ast.Ref(ast.Ref.PATH, 'bar.o')
    ], [new ast.Ref(ast.Ref.PATH, 'a.out')])
  , new interRep.PlainTrans({multi: false}, [
        new ast.Ref(ast.Ref.PATH, 'foo.c')
    ], [new ast.Ref(ast.Ref.PATH, 'foo.o')])
  , new interRep.PlainTrans({multi:false}, [
        new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [new ast.Ref(ast.Ref.PATH, 'bar.o')])
]

test('read.sortTranss() simple', function (t) {
    var transs = sortTranss(TEST_TRANSS)[0]
    t.equal(transs.length, 3)
    t.equal(transs[0].targets[0].value, 'foo.o')
    t.equal(transs[1].targets[0].value, 'bar.o')
    t.equal(transs[2].targets[0].value, 'a.out')
    t.end()
})

var TEST_TRANSS_GLOBS = [
    new interRep.PlainTrans({multi:false}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.o')
    ], [new ast.Ref(ast.Ref.PATH, 'a.out')])
  , new interRep.PlainTrans({multi: false}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.c')
    ], [
        new ast.Ref(ast.Ref.PATH, 'foo.o')
      , new ast.Ref(ast.Ref.PATH, 'bar.o')
    ])
]

test('read.sortTranss() globs', function (t) {
    var transs = sortTranss(TEST_TRANSS_GLOBS)[0]
    t.equal(transs.length, 2)
    t.equal(transs[0].targets[0].value, 'foo.o')
    t.equal(transs[0].targets[1].value, 'bar.o')
    t.equal(transs[1].targets[0].value, 'a.out')
    t.end()
})

var TEST_TRANSS_MULTI = [
    new interRep.PlainTrans({multi: true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.o')
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.a')])
  , new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.y')
    ], [new ast.Ref(ast.Ref.PATH_GLOB, 'flex/*.c')])
  , new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '**/*.c')
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '**/*.o')])
]

test('read.sortTranss() multi', function (t) {
    var transs = sortTranss(TEST_TRANSS_MULTI)[0]
    t.equal(transs.length, 3)
    t.equal(transs[0].targets[0].value, 'flex/*.c')
    t.equal(transs[1].targets[0].value, '**/*.o')
    t.equal(transs[2].targets[0].value, '*.a')
    t.end()
})

var TEST_TRANSS_CYCLES = [
    new interRep.PlainTrans({multi: true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.y', l(1))
      , new ast.Ref(ast.Ref.PATH_GLOB, '*.z', l(7))
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.c', l(2))])
  , new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.c', l(3))
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.d', l(4))])
  , new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.d', l(5))
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.y', l(6))])
  , new interRep.PlainTrans({multi:true}, [
        new ast.Ref(ast.Ref.PATH_GLOB, '*.c', l(8))
    ], [new ast.Ref(ast.Ref.PATH_GLOB, '*.z', l(9))])
]

test('read.sortTranss() cycles', function (t) {
    var errors = sortTranss(TEST_TRANSS_CYCLES)[1]
    t.equal(errors.length, 2)
    t.equal(errors[0].message, 'transformation dependency cycle: ' +
                               '1:1:*.y -> 3:1:*.c -> 5:1:*.d -> 1:1:*.y')
    t.equal(errors[1].message, 'transformation dependency cycle: ' +
                               '7:1:*.z -> 8:1:*.c -> 7:1:*.z')
    t.end()
})

function l(l) {
    return new Location(l, 1)
}
