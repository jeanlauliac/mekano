'use strict';
module.exports = parse

var Writable = require('stream').Writable
var ast = require('./ast')
var util = require('util')
var Token = require('./token')

var NOT_A_TOKEN = 'expected tokens as parse stream input'
var READ_CONFLICT = 'a token read is already pending'
var END_OF_INPUT = 'unexpected end of input'
var RECIPE_NOT_AN_IDENT = 'expected an identifier as recipe name'
var VALUE_NOT_AN_IDENT = 'expected an identifier as value name'
var UNEXPECTED_TOKEN = 'unexpected token `%s\' in this context'
var EXPECTED_SEMICOLON = 'expected a semicolon `;\' to end the statement'

function parse(opts) {
    return new Parser(opts)
}

util.inherits(Parser, Writable)
function Parser(opts) {
    if (typeof opts === 'undefined') opts = {}
    opts.objectMode = true
    Writable.call(this, opts)
    this._tokens = []
    this._pendingCb = null
    this._pendingCount = 0
    this._pendingEndCb = null
    this._writeCb = null
    this._ended = false
    if (opts.trace === true) this._trace = defaultTracer
    else if (typeof opts.trace === 'function') this._trace = opts.trace
    else this._trace = function() {}
    this._parseUnit((function (err, unit) {
        if (err) return this.emit('error', err)
        this._trace('parsed')
        this.emit('parsed', unit)
    }).bind(this))
    this.once('finish', this._onFinish.bind(this))
}

Parser.prototype._onFinish = function() {
    this._ended = true
    if (this._pendingCb) {
        this._pendingCb(new Error(END_OF_INPUT))
        this._pendingCb = null
    }
    if (this._pendingEndCb) {
        this._pendingEndCb(null, true)
        this._pendingEndCb = null
    }
}

Parser.prototype._write = function (chunk, encoding, cb) {
    if (!(chunk instanceof Token))
        return cb(new Error(NOT_A_TOKEN))
    if (chunk.type === Token.COMMENT || chunk.type === Token.WHITESPACE)
        return cb(null)
    this._trace('token %s', chunk)
    this._tokens.push(chunk)
    if (this._pendingEndCb) {
        var pecb = this._pendingEndCb
        this._pendingEndCb = null
        pecb(null, false)
    }
    if (this._pendingCb && this._tokens.length >= this._pendingCount) {
        var pcb = this._pendingCb
        this._pendingCb = null
        pcb(null, this._tokens)
    }
    if (this._pendingCb || this._pendingEndCb) return cb()
    this._trace('pause write')
    if (this._writeCb !== null) throw new Error('_write called twice')
    this._writeCb = cb
}

Parser.prototype._read = function (count, cb) {
    this._trace('read %d tokens', count)
    if (count <= this._tokens.length)
        return process.nextTick(cb.bind(this, null))
    if (this._pendingCb !== null)
        return process.nextTick(cb.bind(this, new Error(READ_CONFLICT)))
    this._pendingCount = count
    this._pendingCb = cb
    this._resumeWrite()
}

Parser.prototype._tryReadEnd = function (cb) {
    this._trace('read end')
    if (this._tokens.length > 0)
        return process.nextTick(cb.bind(this, null, false))
    if (this._ended)
        return process.nextTick(cb.bind(this, null, true))
    this._pendingEndCb = cb
    this._resumeWrite()
}

Parser.prototype._resumeWrite = function() {
    if (this._writeCb !== null) {
        this._trace('resume write')
        this._writeCb()
        this._writeCb = null
    }
}

Parser.prototype._consume = function (count) {
    this._trace('consume %d tokens', count)
    this._tokens.splice(0, count)
}

Parser.prototype._accept = function(type, pos) {
    if (typeof type === 'undefined') throw new Error('invalid token type')
    if (typeof pos === 'undefined') pos = 0
    return this._tokens[pos].type === type
}

Parser.prototype._value = function(pos) {
    return this._tokens[pos].value
}

Parser.prototype._parseUnit = function (cb) {
    var self = this
    var unit = new ast.Unit()
    this._trace('parse unit')
    ;(function recur(err) {
        if (err) return cb(err, unit)
        self._tryReadEnd(function (err, end) {
            if (err || end) return cb(err, unit)
            self._parseUnitStatement(unit, recur)
        })
    })(null)
}

Parser.prototype._parseUnitStatement = function (unit, cb) {
    var self = this
    this._trace('parse unit statement')
    this._read(2, function (err) {
        if (err) return cb(err)
        if (self._accept(Token.REQUIRE)) return self._parseRequire(cb)
        if (self._accept(Token.EQUAL, 1))
            return self._parseBind(function (err, value) {
                if (err) return cb(err)
                unit.values.push(value)
                return cb(null)
            })
        if (self._accept(Token.COLON, 1))
            return self._parseRecipe(function (err, recipe) {
                if (err) return cb(err)
                unit.recipes.push(recipe)
                return cb(null)
            })
        return self._parseRelation(function (err, relation) {
            if (err) return cb(err)
                unit.relations.push(relation)
        })
    })
}

Parser.prototype._parseRequire = function (cb) {
    return cb(new Error('not implemented'))
}

Parser.prototype._parseBind = function (cb) {
    var self = this
    this._trace('parse bind')
    this._read(4, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(VALUE_NOT_AN_IDENT))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(new Error(util.format(UNEXPECTED_TOKEN, this._value(2))))
        if (!self._accept(Token.SEMI_COLON, 3))
            return cb(new Error(EXPECTED_SEMICOLON))
        var value = new ast.Value(self._value(0), self._value(2))
        self._consume(4)
        return cb(null, value)
    })
}

Parser.prototype._parseRelation = function (cb) {
    var self = this
    this._trace('parse relation')
    this._read(2, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(VALUE_NOT_AN_IDENT))
        var value = new ast.Value(self._value(0), self._value(1))
        self._consume(2)
        return cb(null, value)
    })
}

Parser.prototype._parseRecipe = function (cb) {
    var self = this
    this._trace('parse recipe')
    this._read(4, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(RECIPE_NOT_AN_IDENT))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(new Error(util.format(UNEXPECTED_TOKEN, self._value(2))))
        if (!self._accept(Token.SEMICOLON, 3))
            return cb(new Error(EXPECTED_SEMICOLON))
        var recipe = new ast.Recipe(self._value(0), self._value(2))
        self._consume(4)
        return cb(null, recipe)
    })
}

function defaultTracer() {
    var message = util.format.apply(null, arguments)
    console.error('>>> parse() >>>', message)
}
