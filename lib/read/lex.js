'use strict';
module.exports = lex

var util = require('util')
var Transform = require('stream').Transform
var StringDecoder = require('string_decoder').StringDecoder
var Location = require('./location')
var Token = require('./token')
var errors = require('../errors')

var INVALID_END_STATE = 'unrecognized token `%s`'
var WRONG_STATE = 'invalid new state returned from `%d\''
var EMPTY_BUFFER = 'state `%d\' finished with empty buffer'
var INVALID_OPERATOR = 'unrecognized operator `%s\''

var Keywords = {
    'require': Token.REQUIRE, 'onlywith': Token.ONLYWITH
  , 'except': Token.EXCEPT, 'final': Token.FINAL
}

var State = {
    UNIT: 0, IDENTIFIER: 1, KEYWORD: 2, WHITESPACE: 3, INTERPOLATION: 4
  , INTERPOLATION_ESCAPE: 5, INTERPOLATION_END: 6
  , PATH: 10, PATH_GLOB: 11, OPERATOR: 12, COMMENT: 13
}

function lex(opts) {
    return new Lexer(opts)
}

util.inherits(Lexer, Transform)
function Lexer(opts) {
    Transform.call(this, opts)
    this._writableState.objectMode = false
    this._readableState.objectMode = true
    this._decoder = new StringDecoder('utf8')
    this._state = State.UNIT
    this._buffer = ''
    this._location = new Location()
}

Lexer.prototype._transform = function(chunk, encoding, cb) {
    try {
        chunk = this._decoder.write(chunk)
        for(var i = 0; i < chunk.length; ) {
            var transition = applyTransition(this._state, chunk[i])
            if (typeof transition === 'undefined')
                throw new Error(util.format(WRONG_STATE, this._state))
            if (transition === null) {
                this._finish()
                this._state = State.UNIT
                continue
            }
            this._buffer += chunk[i]
            this._state = transition
            i++
        }
    } catch (err) {
        if (err.name !== 'ParseError') throw err
        err.location = this._location.clone()
        return cb(err)
    }
    return cb(null)
}

Lexer.prototype._flush = function(cb) {
    if (this._buffer.length === 0) return cb()
    try {this._finish()}
    catch (err) {
        if (err.name === 'ParseError') return cb(err)
        throw err
    }
    this.push(new Token(Token.END, null, this._location))
    this.push(null)
    return cb()
}

Lexer.prototype._finish = function() {
    if (!Finishes.hasOwnProperty(this._state))
        throw new Error(util.format(INVALID_END_STATE, this._buffer))
    if (this._buffer.length === 0)
        throw new Error(util.format(EMPTY_BUFFER, this._state))
    var pair = Finishes[this._state](this._buffer)
    this.push(new Token(pair[0], pair[1], this._location))
    this._location.forward(this._buffer)
    this._buffer = ''
}

function applyTransition(id, ch) {
    var transition = Transitions[id]
    for (var i = 0; i < transition.length; ++i) {
        if (transition[i].re.test(ch)) return transition[i].to
    }
    return null
}

var Transitions = {}
var RE_IDENT = /[a-zA-Z0-9_-]/
var RE_PATH = /[\/.]/
var RE_PATH_GLOB = /[{,}*]/
var RE_INTERPOL_DELIM = /`/
var RE_OPERATOR = /[=>;:-]/

Transitions[State.UNIT] = [
    {re: RE_OPERATOR, to: State.OPERATOR}
  , {re: RE_IDENT, to: State.IDENTIFIER}
  , {re: RE_PATH, to: State.PATH}
  , {re: RE_PATH_GLOB, to: State.PATH_GLOB}
  , {re: RE_INTERPOL_DELIM, to: State.INTERPOLATION}
  , {re: /\s/, to: State.WHITESPACE}
  , {re: /#/, to: State.COMMENT}
]

Transitions[State.IDENTIFIER] = [
    {re: RE_IDENT, to: State.IDENTIFIER}
  , {re: RE_PATH, to: State.PATH}
  , {re: RE_PATH_GLOB, to: State.PATH_GLOB}
]

Transitions[State.OPERATOR] = [
    {re: RE_OPERATOR, to: State.OPERATOR}
  , {re: RE_IDENT, to: State.IDENTIFIER}
  , {re: RE_PATH, to: State.PATH}
  , {re: RE_PATH_GLOB, to: State.PATH_GLOB}
]

Transitions[State.WHITESPACE] = [
    {re: /\s/, to: State.WHITESPACE}
]

Transitions[State.INTERPOLATION] = [
    {re: /\$/, to: State.INTERPOLATION_ESCAPE}
  , {re: /`/, to: State.INTERPOLATION_END}
  , {re: /./, to: State.INTERPOLATION}
]

Transitions[State.INTERPOLATION_ESCAPE] = [
    {re: /./, to: State.INTERPOLATION}
]

Transitions[State.INTERPOLATION_END] = []

Transitions[State.PATH] = [
    {re: RE_IDENT, to: State.PATH}
  , {re: RE_PATH, to: State.PATH}
  , {re: RE_PATH_GLOB, to: State.PATH_GLOB}
]

Transitions[State.PATH_GLOB] = [
    {re: RE_IDENT, to: State.PATH_GLOB}
  , {re: RE_PATH, to: State.PATH_GLOB}
  , {re: RE_PATH_GLOB, to: State.PATH_GLOB}
]

Transitions[State.COMMENT] = [
    {re: /[^\n]/, to: State.COMMENT}
]

var Finishes = {}

Finishes[State.IDENTIFIER] = function finishIdentifier(buffer) {
    if (Keywords.hasOwnProperty(buffer))
        return [Keywords[buffer], null]
    return [Token.IDENTIFIER, buffer]
}

Finishes[State.OPERATOR] = function finishOperator(buffer) {
    if (buffer === '->') return [Token.ARROW, null]
    if (buffer === '=>') return [Token.FAT_ARROW, null]
    if (buffer === ':') return [Token.COLON, null]
    if (buffer === '::') return [Token.DOUBLE_COLON, null]
    if (buffer === ';') return [Token.SEMICOLON, null]
    if (buffer === '=') return [Token.EQUAL, null]
    throw errors.parse(util.format(INVALID_OPERATOR, buffer))
}

Finishes[State.WHITESPACE] = function finishWhitespace() {
    return [Token.WHITESPACE, null]
}

Finishes[State.PATH] = function finishPath(buffer) {
    return [Token.PATH, buffer]
}

Finishes[State.PATH_GLOB] = function finishPathGlob(buffer) {
    return [Token.PATH_GLOB, buffer]
}

Finishes[State.INTERPOLATION] = function throwInterpolation() {
    throw errors.parse('missing interpolation end quote')
}

Finishes[State.INTERPOLATION_END] = function finishInterpolation(buffer) {
    return [Token.INTERPOLATION, buffer.substr(1, buffer.length - 2)]
}

Finishes[State.COMMENT] = function finishComment(buffer) {
    return [Token.COMMENT, buffer.substr(1)]
}
