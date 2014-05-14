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
var TEST_UNIT = new ast.Unit([], TEST_RELS, [])

test('singlify() ', function (t) {
    var unit = singlify(TEST_UNIT)
    t.equal(unit.relations.length, 3)
    t.equal(unit.relations[0].transList.length, 1)
    t.equal(unit.relations[1].transList.length, 1)
    t.equal(unit.relations[2].transList.length, 0)
    t.equal(unit.relations[0].transList[0].recipeName, 'Compile')
    t.equal(unit.relations[1].transList[0].recipeName, 'Link')
    t.equal(unit.relations[2].alias.name, 'all')
    t.equal(unit.relations[0].prereqList[0].value, 'foo.c')
    t.equal(unit.relations[1].prereqList[0].value, 'foo.o')
    t.end()
})

function tokenOf(type, value) {
    return new Token(new Location(1, 1), type, value)
}
