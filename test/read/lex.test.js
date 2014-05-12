'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var TestStream = require('./test-stream')
var lex = require('../../lib/read/lex')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

testLex('identifier', 'beep', [
    tokenOf(1, 1, Token.IDENTIFIER, 'beep')
])

testLex('path', 'path/to/file', [
    tokenOf(1, 1, Token.PATH, 'path/to/file')
])

testLex('path glob', 'path/to/**/*.glob', [
    tokenOf(1, 1, Token.PATH_GLOB, 'path/to/**/*.glob')
])

testLex('require', 'require', [
    tokenOf(1, 1, Token.REQUIRE)
])

testLex('recipe', 'Foo: beep boop', [
    tokenOf(1, 1, Token.IDENTIFIER, 'Foo')
  , tokenOf(1, 4, Token.COMMAND, 'beep boop')
])

testLex('relation', './foo\n| Recipe > ./bar', [
    tokenOf(1, 1, Token.PATH, './foo')
  , tokenOf(1, 6, Token.WHITESPACE)
  , tokenOf(2, 1, Token.PIPE)
  , tokenOf(2, 2, Token.WHITESPACE)
  , tokenOf(2, 3, Token.IDENTIFIER, 'Recipe')
  , tokenOf(2, 9, Token.WHITESPACE)
  , tokenOf(2, 10, Token.CHEVRON)
  , tokenOf(2, 11, Token.WHITESPACE)
  , tokenOf(2, 12, Token.PATH, './bar')
])

function tokenOf(l, c, type, value) {
    return new Token(new Location(l, c), type, value)
}

function testLex(name, str, tokens) {
    test('lex() ' + name, function (t) {
        var ts = new TestStream(tokens, t.same.bind(t), {objectMode: true})
        var ss = new StringStream(str)
        ss.pipe(lex()).pipe(ts).on('tested', function (err) {
            t.error(err)
            t.end()
        })
    })
}
