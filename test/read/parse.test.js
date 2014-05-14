'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var lex = require('../../lib/read/lex')
var parse = require('../../lib/read/parse')

var TRACE = true

testParse('recipe', 'Foo: `beep`;', function (t, unit) {
    t.equal(unit.recipes.length, 1)
    var r = unit.recipes[0]
    t.equal(r.name, 'Foo')
    t.equal(r.command, 'beep')
})

testParse('bind', 'Foo = `beep`;', function (t, unit) {
    t.equal(unit.binds.length, 1)
    var b = unit.binds[0]
    t.equal(b.name, 'Foo')
    t.equal(b.value, 'beep')
})

testParse('relation wo/ prereq.', 'Beep -> a.out;', function (t, unit) {
    t.equal(unit.relations.length, 1)
    var r = unit.relations[0]
    t.equal(r.transList.length, 1)
    var tr = r.transList[0]
    t.equal(tr.recipeName, 'Beep')
    t.equal(tr.multi, false)
    t.equal(tr.targets.length, 1)
    t.equal(tr.targets[0].value, 'a.out')
})

function testParse(name, str, cb) {
    test('parse() ' + name, function (t) {
        var ss = new StringStream(str)
        var ps = parse(ss.pipe(lex()), {trace: TRACE})
        ps.on('parsed', function (unit) {
            cb(t, unit)
            t.end()
        })
    })
}
