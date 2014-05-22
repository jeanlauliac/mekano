'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var lex = require('../../lib/read/lex')
var parse = require('../../lib/read/parse')
var Scope = require('../../lib/scope')

testParse('recipe', 'Foo: `beep`;', function (t, unit) {
    var r = unit.recipes['Foo']
    t.equal(r.command.expand(new Scope()), 'beep')
})

testParse('bind', 'foo = `beep`;', function (t, unit) {
    var b = unit.binds['foo']
    t.equal(b.value.expand(new Scope()), 'beep')
})

testParse('relation single-trans wo/ prereq.', 'Beep -> a.out;'
        , function (t, unit) {
    t.equal(unit.relations.length, 1)
    var r = unit.relations[0]
    t.equal(r.transList.length, 1)
    var tr = r.transList[0]
    t.equal(tr.recipeName, 'Beep')
    t.equal(tr.multi, false)
    t.equal(tr.targets.length, 1)
    t.equal(tr.targets[0].value, 'a.out')
})

testParse('relation single-trans w/ prereq.', 'foo.c Link -> a.out;'
        , function (t, unit) {
    t.equal(unit.relations.length, 1)
    var r = unit.relations[0]
    t.equal(r.prereqList.length, 1)
    var pr = r.prereqList[0]
    t.equal(pr.value, 'foo.c')
    t.equal(r.transList.length, 1)
    var tr = r.transList[0]
    t.equal(tr.recipeName, 'Link')
    t.equal(tr.multi, false)
    t.equal(tr.targets.length, 1)
    t.equal(tr.targets[0].value, 'a.out')
})

testParse('relation multi-trans', '*.c Compile => *.o *.d Link -> a.out;'
        , function (t, unit) {
    t.equal(unit.relations.length, 1)
    var r = unit.relations[0]
    t.equal(r.prereqList.length, 1)
    var pr = r.prereqList[0]
    t.equal(pr.value, '*.c')
    t.equal(r.transList.length, 2)
    var tr = r.transList[0]
    t.equal(tr.recipeName, 'Compile')
    t.equal(tr.multi, true)
    t.equal(tr.targets.length, 2)
    t.equal(tr.targets[0].value, '*.o')
    t.equal(tr.targets[1].value, '*.d')
    tr = r.transList[1]
    t.equal(tr.recipeName, 'Link')
    t.equal(tr.multi, false)
    t.equal(tr.targets.length, 1)
    t.equal(tr.targets[0].value, 'a.out')
})

testParse('relation alias', 'a.out :: all `test`;'
        , function (t, unit) {
    t.equal(unit.relations.length, 1)
    var r = unit.relations[0]
    t.equal(r.prereqList.length, 1)
    t.equal(r.prereqList[0].value, 'a.out')
    t.equal(r.alias.name, 'all')
    t.equal(r.alias.desc, 'test')
})

function testParse(name, str, cb) {
    test('read.parse() ' + name, function (t) {
        var ss = new StringStream(str)
        parse(ss.pipe(lex())).on('finish', function (unit) {
            cb(t, unit)
            t.end()
        })
    })
}
