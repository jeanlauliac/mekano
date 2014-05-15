'use strict';

var test = require('tape')
var StringStream = require('./string-stream')
var TestStream = require('./test-stream')
var lex = require('../../lib/read/lex')
var Token = require('../../lib/read/token.js')
var Location = require('../../lib/read/location.js')

testLex('identifier', 'beep', [
    tokenOf(1, 1, Token.IDENTIFIER, 'beep')
  , tokenOf(1, 5, Token.END)
])

testLex('path', 'path/to/file', [
    tokenOf(1, 1, Token.PATH, 'path/to/file')
  , tokenOf(1, 13, Token.END)
])

testLex('path glob', 'path/to/**/*.glob', [
    tokenOf(1, 1, Token.PATH_GLOB, 'path/to/**/*.glob')
  , tokenOf(1, 18, Token.END)
])

testLex('require', 'require', [
    tokenOf(1, 1, Token.REQUIRE)
  , tokenOf(1, 8, Token.END)
])

testLex('interpolation', '`beep boop`', [
    tokenOf(1, 1, Token.INTERPOLATION, 'beep boop')
  , tokenOf(1, 12, Token.END)
])

testLex('relation', './foo\n    Recipe => ./bar', [
    tokenOf(1, 1, Token.PATH, './foo')
  , tokenOf(1, 6, Token.WHITESPACE)
  , tokenOf(2, 5, Token.IDENTIFIER, 'Recipe')
  , tokenOf(2, 11, Token.WHITESPACE)
  , tokenOf(2, 12, Token.FAT_ARROW)
  , tokenOf(2, 14, Token.WHITESPACE)
  , tokenOf(2, 15, Token.PATH, './bar')
  , tokenOf(2, 20, Token.END)
])

function tokenOf(l, c, type, value) {
    return new Token(new Location(l, c), type, value)
}

function testLex(name, str, tokens) {
    test('read.lex() ' + name, function (t) {
        var ts = new TestStream(tokens, t.same.bind(t), {objectMode: true})
        var ss = new StringStream(str)
        ss.pipe(lex()).pipe(ts).on('tested', function (err) {
            t.error(err)
            t.end()
        })
    })
}
