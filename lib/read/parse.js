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

function parse(opts) {
    return new Parser(opts)
}

util.inherits(Parser, Writable)
function Parser(opts) {
    opts = {objectMode: true}
    Writable.call(this, opts)
    this._tokens = []
    this._pendingCb = null
    this._pendingCount = 0
    this._pendingEndCb = null
    this._ended = false
    this._parseUnit((function (err, unit) {
        if (err) return this.emit('error', err)
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
    this._tokens.push(chunk)
    if (this._pendingCb && this._tokens.length >= this._pendingCount) {
        this._pendingCb(null, this._tokens)
        this._pendingCb = null
    }
    if (this._pendingEndCb) {
        this._pendingEndCb(null, false)
        this._pendingEndCb = null
    }
    return cb()
}

Parser.prototype._read = function (count, cb) {
    if (count <= this._tokens.length)
        return process.nextTick(cb.bind(this, null, this._tokens.slice()))
    if (this._pendingCb !== null)
        return process.nextTick(cb.bind(this, new Error(READ_CONFLICT)))
    this._pendingCount = count
    this._pendingCb = cb
}

Parser.prototype._tryReadEnd = function (cb) {
    if (this._ended)
        return process.nextTick(cb.bind(this, null, true))
    if (this._tokens.length > 0)
        return process.nextTick(cb.bind(this, null, false))
    this._pendingEndCb = cb
}

Parser.prototype._consume = function (count) {
    this._tokens.splice(0, count)
}

Parser.prototype._accept = function(type, pos) {
    if (typeof pos === 'undefined') pos = 0
    return this._tokens[pos].type === type
}

Parser.prototype._value = function(pos) {
    return this._tokens[pos].value
}

Parser.prototype._parseUnit = function (cb) {
    var self = this
    var unit = new ast.Unit()
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
    this._read(2, function (err) {
        if (err) return cb(err)
        if (self._accept(Token.REQUIRE)) return self._parseRequire(cb)
        if (self._accept(Token.PATH) || self._accept(Token.PATH_GLOB))
            return self._parseRelation(function (err, relation) {
                if (err) return cb(err)
                unit.relations.push(relation)
            })
        if (self._accept(Token.VALUE, 1))
            return self._parseValue(function (err, value) {
                if (err) return cb(err)
                unit.values.push(value)
                return cb(null)
            })
        if (self._accept(Token.COMMAND, 1))
            return self._parseRecipe(function (err, recipe) {
                if (err) return cb(err)
                unit.recipes.push(recipe)
                return cb(null)
            })
    })
}

Parser.prototype._parseRequire = function (cb) {
    this._read(2, function (err) {
        if (err) return cb(err)
        return cb(new Error('not implemented'))
    })
}

Parser.prototype._parseValue = function (cb) {
    var self = this
    this._read(2, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(VALUE_NOT_AN_IDENT))
        var value = new ast.Value(self._value(0), self._value(1))
        self._consume(2)
        return cb(null, value)
    })
}

Parser.prototype._parseRelation = function (cb) {
    var self = this
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
    this._read(2, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(RECIPE_NOT_AN_IDENT))
        var recipe = new ast.Recipe(self._value(0), self._value(1))
        self._consume(2)
        return cb(null, recipe)
    })
}
