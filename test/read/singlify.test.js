'use strict';

var test = require('tape')
var singlify = require('../../lib/read/singlify')
var interRep = require('../../lib/read/inter-rep')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_RELS = [
    new interRep.ExpRelation([
        tokenOf(Token.PATH, 'foo.c')
      , tokenOf(Token.PATH, 'bar.c')
    ], [
        new interRep.ExpTrans({recipeName: 'Compile'}, [
            tokenOf(Token.PATH, 'foo.o')
          , tokenOf(Token.PATH, 'bar.o')
        ])
      , new interRep.ExpTrans({recipeName: 'Link'}, [
            tokenOf(Token.PATH, 'a.out')
        ])
    ])
]

test('read.singlify() ', function (t) {
    var transs = singlify(TEST_RELS)
    t.equal(transs.length, 2)
    t.equal(transs[0].ast.recipeName, 'Compile')
    t.equal(transs[1].ast.recipeName, 'Link')
    t.equal(transs[0].prereqs[0].value, 'foo.c')
    t.equal(transs[0].targets[0].value, 'foo.o')
    t.equal(transs[1].prereqs[0].value, 'foo.o')
    t.equal(transs[1].targets[0].value, 'a.out')
    t.end()
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
