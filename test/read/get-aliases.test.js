'use strict';

var test = require('tape')
var getAliases = require('../../lib/read/get-aliases')
var ast = require('../../lib/read/ast')
var Location = require('../../lib/read/location')

var TEST_RELS = [
    new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'foo.c')
      , new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [], new ast.Alias('cfiles'))
  , new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'foo.c')
    ], [
        new ast.Trans('Link', false, [new ast.Ref(ast.Ref.PATH, 'a.out')])
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

var TEST_RELS_MULTI = [
    new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'foo.c')
      , new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [], new ast.Alias('cfiles'))
  , new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'a.out')
      , new ast.Ref(ast.Ref.ALIAS, 'morefiles')
    ], [], new ast.Alias('all'))
  , new ast.Relation([
        new ast.Ref(ast.Ref.ALIAS, 'cfiles')
      , new ast.Ref(ast.Ref.PATH, 'nah.c')
    ], [], new ast.Alias('morefiles'))
]

test('read.getAliases() multi', function (t) {
    var aliases = getAliases(TEST_RELS_MULTI)
    t.equal(aliases['all'].ast.name, 'all')
    t.equal(aliases['all'].refs.length, 4)
    t.equal(aliases['all'].refs[0].value, 'a.out')
    t.equal(aliases['all'].refs[1].value, 'foo.c')
    t.equal(aliases['all'].refs[2].value, 'bar.c')
    t.equal(aliases['all'].refs[3].value, 'nah.c')
    t.end()
})

var TEST_RELS_CYCLE = [
    new ast.Relation([
        new ast.Ref(ast.Ref.ALIAS, 'morefiles')
      , new ast.Ref(ast.Ref.PATH, 'bar.c')
    ], [], new ast.Alias('cfiles', null, new Location(1)))
  , new ast.Relation([
        new ast.Ref(ast.Ref.PATH, 'a.out')
      , new ast.Ref(ast.Ref.ALIAS, 'morefiles')
    ], [], new ast.Alias('all', null, new Location(2)))
  , new ast.Relation([
        new ast.Ref(ast.Ref.ALIAS, 'cfiles')
      , new ast.Ref(ast.Ref.PATH, 'nah.c')
    ], [], new ast.Alias('morefiles', null, new Location(3)))
]

var TEST_ERROR = 'alias reference cycle, for example: 1:1:cfiles ' +
                 '-> 3:1:morefiles -> 1:1:cfiles'

test('read.getAliases() cycle', function (t) {
    try {
        getAliases(TEST_RELS_CYCLE)
    } catch (err) {
        t.equal(err.message, TEST_ERROR)
        t.end()
    }
})
