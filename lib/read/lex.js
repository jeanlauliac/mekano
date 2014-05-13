'use strict';
module.exports = lex

var Transform = require('stream').Transform
var StringDecoder = require('string_decoder').StringDecoder
var Location = require('./location')
var Token = require('./token')
var util = require('util')

var INVALID_END_STATE = 'invalid finish state `%d\''
var WRONG_STATE = 'invalid new state returned from `%d\''
var EMPTY_BUFFER = 'state `%d\' finished with empty buffer'

var Keywords = {require: Token.REQUIRE}

var State = {
    UNIT: 0, IDENTIFIER: 1, KEYWORD: 2, WHITESPACE: 3, UNQUOTED: 4
  , PATH: 5, PATH_GLOB: 6, OPERATOR: 7, COMMENT: 10
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
            var nextState = Steps[this._state](chunk[i], this._buffer)
            if (typeof nextState === 'undefined')
                return cb(new Error(util.format(WRONG_STATE, this._state)))
            if (nextState === null) {
                this._finish()
                this._state = State.UNIT
                continue
            }
            this._buffer += chunk[i]
            this._state = nextState
            i++
        }
    } catch (err) {
        err.location = this._location
        err.message = util.format('%s:%s', this._location, err.message)
        return cb(err)
    }
    return cb()
}

Lexer.prototype._flush = function(cb) {
    if (this._buffer.length === 0) return cb()
    try {this._finish()}
    catch (err) {return cb(err)}
    this.push(null)
    return cb()
}

Lexer.prototype._finish = function() {
    if (!Finishes.hasOwnProperty(this._state))
        throw new Error(util.format(INVALID_END_STATE, this._state))
    if (this._buffer.length === 0)
        throw new Error(util.format(EMPTY_BUFFER, this._state))
    var pair = Finishes[this._state](this._buffer)
    this.push(new Token(this._location, pair[0], pair[1]))
    this._location.forward(this._buffer)
    this._buffer = ''
}

var Steps = {}

Steps[State.UNIT] = function stepUnit(ch) {
    if (/[a-zA-Z_-]/.test(ch)) return State.IDENTIFIER
    if (/[\/.]/.test(ch)) return State.PATH
    if (/[{}*]/.test(ch)) return State.PATH_GLOB
    if (/[|>]/.test(ch)) return State.OPERATOR
    if (/[:=]/.test(ch)) return State.UNQUOTED
    if (/\s/.test(ch)) return State.WHITESPACE
    if (ch === '#') return State.COMMENT
    return null
}

Steps[State.IDENTIFIER] = function stepIdentifier(ch) {
    if (/[a-zA-Z0-9_-]/.test(ch)) return State.IDENTIFIER
    if (/[\/.]/.test(ch)) return State.PATH
    if (/[{}*]/.test(ch)) return State.PATH_GLOB
    return null
}

Steps[State.OPERATOR] = function stepOperator(ch) {
    if (/[|>[]]/.test(ch)) return State.OPERATOR
    return null
}

Steps[State.WHITESPACE] = function stepWhitespace(ch) {
    if (/\s/.test(ch)) return State.WHITESPACE
    return null
}

Steps[State.UNQUOTED] = function stepUnquoted(ch) {
    if (ch === '\n') return null
    if (ch === '$') return State.UNQUOTED_ESCAPE
    return State.UNQUOTED
}

Steps[State.UNQUOTED_ESCAPE] = function stepUnquotedEscape() {
    return State.UNQUOTED
}

Steps[State.PATH] = function stepPath(ch) {
    if (/[a-zA-Z0-9_\/.-]/.test(ch)) return State.PATH
    if (/[{}*]/.test(ch)) return State.PATH_GLOB
    return null
}

Steps[State.PATH_GLOB] = function stepPathGlob(ch) {
    if (/[a-zA-Z0-9_\/.{}*-]/.test(ch)) return State.PATH_GLOB
    return null
}

Steps[State.COMMENT] = function stepComment(ch) {
    if (ch === '\n') return null
    return State.COMMENT
}

var Finishes = {}

Finishes[State.IDENTIFIER] = function finishIdentifier(buffer) {
    if (Keywords.hasOwnProperty(buffer))
        return [Keywords[buffer], null]
    return [Token.IDENTIFIER, buffer]
}

Finishes[State.OPERATOR] = function finishOperator(buffer) {
    if (buffer === '|') return [Token.PIPE, null]
    if (buffer === '||') return [Token.DOUBLE_PIPE, null]
    if (buffer === '>') return [Token.CHEVRON, null]
    if (buffer === '|>') return [Token.PIPE_CHEVRON, null]
    if (buffer === '[') return [Token.LEFT_BRACKET, null]
    if (buffer === ']') return [Token.RIGHT_BRACKET, null]
    throw new Error(util.format('unknow operator `%s\'', buffer))
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

Finishes[State.UNQUOTED] = function finishUnquoted(buffer) {
    var value = buffer.slice(1).trim()
    if (buffer[0] === ':') return [Token.COMMAND, value]
    if (buffer[1] === '=') return [Token.VALUE, value]
    throw new Error('unknow unquoted type')
}

Finishes[State.COMMENT] = function finishComment(buffer) {
    return [Token.COMMENT, buffer.substr(1)]
}
