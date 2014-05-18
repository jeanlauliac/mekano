'use strict';

var test = require('tape')
var interRep = require('../../lib/read/inter-rep')
var sortTranss = require('../../lib/read/sort-transs')
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
        tokenOf(Token.PATH_GLOB, '*.o')
    ], [tokenOf(Token.PATH, 'a.out')])
  , new interRep.PlainTrans({multi: false}, [
        tokenOf(Token.PATH_GLOB, '*.c')
    ], [
        tokenOf(Token.PATH, 'foo.o')
      , tokenOf(Token.PATH, 'bar.o')
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
        tokenOf(Token.PATH_GLOB, '*.o')
    ], [tokenOf(Token.PATH_GLOB, '*.a')])
  , new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '*.y')
    ], [tokenOf(Token.PATH_GLOB, 'flex/*.c')])
  , new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '**/*.c')
    ], [tokenOf(Token.PATH_GLOB, '**/*.o')])
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
        tokenOf(Token.PATH_GLOB, '*.y', 1)
      , tokenOf(Token.PATH_GLOB, '*.z', 7)
    ], [tokenOf(Token.PATH_GLOB, '*.c', 2)])
  , new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '*.c', 3)
    ], [tokenOf(Token.PATH_GLOB, '*.d', 4)])
  , new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '*.d', 5)
    ], [tokenOf(Token.PATH_GLOB, '*.y', 6)])
  , new interRep.PlainTrans({multi:true}, [
        tokenOf(Token.PATH_GLOB, '*.c', 8)
    ], [tokenOf(Token.PATH_GLOB, '*.z', 9)])
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

function tokenOf(type, value, l) {
    var loc = l ? new Location(l, 1) : new Location(1, 1)
    return new Token(loc, type, value)
}
