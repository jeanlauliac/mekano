'use strict';
module.exports = parse

var EventEmitter = require('events').EventEmitter
var ast = require('./ast')
var util = require('util')
var Token = require('./token')

var NOT_A_TOKEN = 'expected tokens as parse stream input'
var READ_CONFLICT = 'a token read is already pending'
var END_OF_INPUT = 'unexpected end of input'
var EXPECTED_INTERPOL = 'expected an interpolation instead of `%s\''
var EXPECTED_SEMICOLON = 'expected a semicolon `;\' to end the statement'
var EXPECTED_IDENT = 'expected an identifier instead of `%s\''
var EXPECTED_TRS = 'expected one of the arrows instead of `%s\''

var g_parseId = 1

function parse(stream, opts) {
    return new Parser(stream, opts)
}

util.inherits(Parser, EventEmitter)
function Parser(stream, opts) {
    if (typeof opts === 'undefined') opts = {}
    EventEmitter.call(this, opts)
    this._id = g_parseId++
    this._stream = stream
    this._tokens = []
    this._pendingCb = null
    this._pendingCount = 0
    this._pendingEndCb = null
    if (opts.trace === true) this._trace = this._defaultTracer
    else if (typeof opts.trace === 'function') this._trace = opts.trace
    else this._trace = function() {}
    this._parseUnit((function (err, unit) {
        if (err) return this.emit('error', err)
        this._trace('parsed')
        this.emit('parsed', unit)
    }).bind(this))
    this._stream.on('readable', this._readable.bind(this))
    this._stream.on('end', this._end.bind(this))
}

Parser.prototype._readable = function () {
    if (this._pendingCb === null) return
    this._fillTokenList(this._pendingCount)
    if (this._tokens.length < this._pendingCount) return
    this._trace('... done reading')
    var pcb = this._pendingCb
    this._pendingCb = null
    pcb(null)
}

Parser.prototype._end = function () {
    this._trace('end')
    if (this._pendingCb === null) return
    var pcb = this._pendingCb
    this._pendingCb = null
    pcb(new Error(END_OF_INPUT))
}

Parser.prototype._fillTokenList = function (count) {
    while (this._tokens.length < count) {
        var token = this._stream.read()
        if (token === null) break
        if (!(token instanceof Token))
            throw new Error(NOT_A_TOKEN)
        if (token.type === Token.COMMENT || token.type === Token.WHITESPACE)
            continue
        this._trace('token %s', token)
        this._tokens.push(token)
    }
    this._trace('filled buffer with %d tokens', this._tokens.length)
}

Parser.prototype._read = function (count, cb) {
    this._trace('trying to read %d tokens, %d in buffer'
              , count, this._tokens.length)
    if (this._pendingCb !== null)
        return process.nextTick(cb.bind(this, new Error(READ_CONFLICT)))
    this._fillTokenList(count)
    if (this._tokens.length >= count) {
        return process.nextTick(cb.bind(this, null))
    }
    this._trace('read is pending...')
    this._pendingCount = count
    this._pendingCb = cb
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

Parser.prototype._type = function(pos) {
    return this._tokens[pos].type
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
        self._read(1, function (err) {
            if (err) return cb(err)
            if (self._accept(Token.END)) return cb(null, unit)
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
                unit.binds.push(value)
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
            return cb(new Error(util.format(EXPECTED_IDENT, this._value(0))))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(new Error(util.format(EXPECTED_INTERPOL, this._value(2))))
        if (!self._accept(Token.SEMICOLON, 3))
            return cb(new Error(EXPECTED_SEMICOLON))
        var bind = new ast.Bind(self._value(0), self._value(2))
        self._consume(4)
        return cb(null, bind)
    })
}

Parser.prototype._parseRecipe = function (cb) {
    var self = this
    this._trace('parse recipe')
    this._read(4, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(util.format(EXPECTED_IDENT, this._value(0))))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(new Error(util.format(EXPECTED_INTERPOL, self._value(2))))
        if (!self._accept(Token.SEMICOLON, 3))
            return cb(new Error(EXPECTED_SEMICOLON))
        var recipe = new ast.Recipe(self._value(0), self._value(2))
        self._consume(4)
        return cb(null, recipe)
    })
}

Parser.prototype._parseRelation = function (cb) {
    var self = this
    this._trace('parse relation')
    this._parseRefList(function (err, list) {
        if (err) return cb(err)

    })
}

Parser.prototype._parseRefList = function (cb) {
    var self = this
    var list = []
    this._trace('parse ref list')
    ;(function next() {
        self._read(2, function (err) {
            if (err) return cb(err)
            if (!(self._accept(Token.IDENTIFIER) ||
                  self._accept(Token.PATH) ||
                  self._accept(Token.PATH_GLOB))) return cb(null, list)
            if (self._accept(Token.ARROW, 1) ||
                self._accept(Token.FAT_ARROW, 1)) return cb(null, list)
            list.push(this._tokens[0])
            this._consume(1)
            return next()
        })
    })()
}

Parser.prototype._parseTransList = function (cb) {
    var self = this
    var list = []
    ;(function next() {
        this._read(2, function (err) {
            if (err) return cb(err)
            if (!(self._accept(Token.ARROW, 1) ||
                  self._accept(Token.FAT_ARROW, 1)))
                return cb(null, list)
            self._parseTrans(function (err, trans) {
                list.push(trans)
                return next()
            })
        })
    })()
}

Parser.prototype._parseTrans = function (cb) {
    var self = this
    this._read(2, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(new Error(util.format(EXPECTED_IDENT, this._value(0))))
        if (!(self._accept(Token.ARROW, 1) ||
              self._accept(Token.FAT_ARROW, 1)))
            return cb(new Error(util.format(EXPECTED_TRS, this._value(1))))
        var recipeName = self._value(0)
        var multi = self._accept(Token.FAT_ARROW, 1)
        self.consume(2)
        self._parseRefList(function (err, list) {
            if (err) return cb(err)
            var trans = new ast.Trans(recipeName, multi, list)
            return cb(null, trans)
        })
    })
}

Parser.prototype._defaultTracer = function () {
    var message = util.format.apply(null, arguments)
    console.error('>>> parse(%d): %s', this._id, message)
}
