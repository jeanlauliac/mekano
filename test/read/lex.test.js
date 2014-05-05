'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var TestStream = require('./test-stream')
var lex = require('../../lib/read/lex')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

test('lex() identifier', function (t) {
    testLex(t, 'beep', [
        tokenOf(1, 1, Token.IDENTIFIER, 'beep')
    ])
})

test('lex() path', function (t) {
    testLex(t, 'path/to/file', [
        tokenOf(1, 1, Token.PATH, 'path/to/file')
    ])
})

test('lex() path glob', function (t) {
    testLex(t, 'path/to/**/*.glob', [
        tokenOf(1, 1, Token.PATH_GLOB, 'path/to/**/*.glob')
    ])
})

test('lex() require', function (t) {
    testLex(t, 'require', [
        tokenOf(1, 1, Token.REQUIRE)
    ])
})

test('lex() recipe', function (t) {
    testLex(t, 'Foo: beep boop', [
        tokenOf(1, 1, Token.IDENTIFIER, 'Foo')
      , tokenOf(1, 4, Token.COMMAND, 'beep boop')
    ])
})

test('lex() relation', function (t) {
    testLex(t, './foo\n| Recipe > ./bar', [
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
})

function tokenOf(l, c, type, value) {
    return new Token(new Location(l, c), type, value)
}

function testLex(t, str, tokens) {
    (new StringStream(str)).pipe(lex()).pipe(new TestStream(
        tokens, t.same.bind(t), {objectMode: true}, function (err) {
            t.error(err)
            t.end()
        }
    ))
}
