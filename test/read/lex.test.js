'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var TestStream = require('./test-stream')
var lex = require('../../lib/read/lex')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

test('lex() identifier', function (t) {
    testLex(t, 'beep', [
        new Token(Token.IDENTIFIER, 'beep', new Location(1, 1))
    ])
})

test('lex() path', function (t) {
    testLex(t, 'path/to/file', [
        new Token(Token.PATH, 'path/to/file', new Location(1, 1))
    ])
})

test('lex() path glob', function (t) {
    testLex(t, 'path/to/**/*.glob', [
        new Token(Token.PATH_GLOB, 'path/to/**/*.glob', new Location(1, 1))
    ])
})

test('lex() require', function (t) {
    testLex(t, 'require', [
        new Token(Token.REQUIRE, null, new Location(1, 1))
    ])
})

test('lex() recipe', function (t) {
    testLex(t, 'Foo: beep boop', [
        new Token(Token.IDENTIFIER, 'Foo', new Location(1, 1))
      , new Token(Token.COMMAND, 'beep boop', new Location(1, 4))
    ])
})

function testLex(t, str, tokens) {
    (new StringStream(str)).pipe(lex()).pipe(new TestStream(
        tokens, t.same.bind(t), {objectMode: true}, function (err) {
            t.error(err)
            t.end()
        }
    ))
}
