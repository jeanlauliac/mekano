'use strict';

var test = require('tape')
var singlify = require('../../lib/read/singlify')
var interRep = require('../../lib/read/inter-rep')
var ast = require('../../lib/read/ast')

var TEST_RELS = [
    new interRep.ExpRelation([
        new ast.Ref(ast.Ref.PATH, 'foo.c')
      , new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [
        new interRep.ExpTrans({recipeName: 'Compile'}, [
            new ast.Ref(ast.Ref.PATH, 'foo.o')
          , new ast.Ref(ast.Ref.PATH, 'bar.o')
        ])
      , new interRep.ExpTrans({recipeName: 'Link'}, [
            new ast.Ref(ast.Ref.PATH, 'a.out')
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
