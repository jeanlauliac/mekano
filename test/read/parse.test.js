'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var lex = require('../../lib/read/lex')
var parse = require('../../lib/read/parse')

testParse('recipe', 'Foo: `beep`;', function (t, unit) {
    t.equal(unit.recipes.length, 1)
    var r = unit.recipes[0]
    t.equal(r.name, 'Foo')
    t.equal(r.command, 'beep')
})

function testParse(name, str, cb) {
    test('parse() ' + name, function (t) {
        var ss = new StringStream(str)
        ss.pipe(lex()).pipe(parse()).on('parsed', function (unit) {
            cb(t, unit)
            t.end()
        })
    })
}
