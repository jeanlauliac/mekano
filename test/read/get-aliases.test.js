'use strict';

var test = require('tape')
var getAliases = require('../../lib/read/get-aliases')
var ast = require('../../lib/read/ast')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

var TEST_RELS = [
    new ast.Relation([
        tokenOf(Token.PATH, 'foo.c')
      , tokenOf(Token.PATH, 'bar.c')
    ], [], new ast.Alias('cfiles'))
  , new ast.Relation([
        tokenOf(Token.PATH, 'foo.c')
    ], [
        new ast.Trans('Link', false, [tokenOf(Token.PATH, 'a.out')])
    ], new ast.Alias('all'))
]

test('read.getAliases() ', function (t) {
    var aliases = getAliases(TEST_RELS)
    t.equal(aliases['cfiles'].ast.name, 'cfiles')
    t.equal(aliases['cfiles'].refs.length, 2)
    t.equal(aliases['cfiles'].refs[0].value, 'foo.c')
    t.equal(aliases['cfiles'].refs[1].value, 'bar.c')
    t.equal(aliases['all'].ast.name, 'all')
    t.equal(aliases['all'].refs.length, 1)
    t.equal(aliases['all'].refs[0].value, 'a.out')
    t.end()
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
