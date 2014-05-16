'use strict';

var test = require('tape')
var singlify = require('../../lib/read/singlify')
var ast = require('../../lib/read/ast')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_RELS = [
    new ast.Relation([
        tokenOf(Token.PATH, 'foo.c')
      , tokenOf(Token.PATH, 'bar.c')
    ], [
        new ast.Trans('Compile', true, [
            tokenOf(Token.PATH, 'foo.o')
          , tokenOf(Token.PATH, 'bar.o')
        ])
      , new ast.Trans('Link', false, [tokenOf(Token.PATH, 'a.out')])
    ], new ast.Alias('all'))
]

test('read.singlify() ', function (t) {
    var res = singlify(TEST_RELS)
    var transs = res.transs
    t.equal(transs.length, 2)
    t.equal(transs[0].ast.recipeName, 'Compile')
    t.equal(transs[1].ast.recipeName, 'Link')
    t.equal(transs[0].prereqs[0].value, 'foo.c')
    t.equal(transs[1].prereqs[0].value, 'foo.o')
    t.equal(res.aliases['all'].ast.name, 'all')
    t.end()
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
