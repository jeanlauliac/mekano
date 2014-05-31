'use strict';
module.exports = parse

var EventEmitter = require('events').EventEmitter
var ast = require('./ast')
var util = require('util')
var path = require('path')
var Token = require('./token')
var Interpolation = require('./interpolation')
var errors = require('../errors')

var NOT_A_TOKEN = 'expected tokens as parse stream input'
var READ_CONFLICT = 'a token read is already pending'
var END_OF_INPUT = 'unexpected end of input'
var EXPECTED = 'expected `%s\' instead of `%s\''
var EXPECTED_INTERPOL = 'expected an interpolation instead of `%s\''
var EXPECTED_SEMICOLON = 'missing a semicolon `;\' to end the statement'
var EXPECTED_IDENT = 'expected an identifier instead of `%s\''
var EXPECTED_TRS = 'expected one of the arrows instead of `%s\''
var DUP_REC = 'duplicate recipe `%s\''
var DUP_BIND = 'duplicate value bind `%s\''
var OUT_OF_ROOT = 'cannot refer to path `%s\', outside of project root'

function parse(stream, opts) {
    return new Parser(stream, opts)
}

util.inherits(Parser, EventEmitter)
function Parser(stream, opts) {
    EventEmitter.call(this, opts)
    this._stream = stream
    this._ended = false
    this._tokens = []
    this._pendingCb = null
    this._pendingCount = 0
    this._pendingEndCb = null
    this._parseUnit((function (err, unit) {
        if (err) this.emit('error', err)
        this.emit('finish', unit)
    }).bind(this))
    this._stream.on('readable', this._readable.bind(this))
    this._stream.on('end', this._end.bind(this))
}

Parser.prototype._readable = function () {
    if (this._pendingCb === null) return
    this._fillTokenList(this._pendingCount)
    if (this._tokens.length < this._pendingCount) return
    var pcb = this._pendingCb
    this._pendingCb = null
    pcb(null)
}

Parser.prototype._end = function () {
    this._ended = true
    if (this._pendingCb === null) return
    var pcb = this._pendingCb
    this._pendingCb = null
    return pcb(errors.parse(END_OF_INPUT))
}

Parser.prototype._fillTokenList = function (count) {
    while (this._tokens.length < count) {
        var token = this._stream.read()
        if (token === null) break
        if (!(token instanceof Token))
            throw new Error(NOT_A_TOKEN)
        if (token.type === Token.COMMENT || token.type === Token.WHITESPACE)
            continue
        this._tokens.push(token)
    }
}

Parser.prototype._read = function (count, cb) {
    if (this._pendingCb !== null) throw new Error(READ_CONFLICT)
    this._fillTokenList(count)
    if (this._tokens.length >= count)
        return setImmediate(cb.bind(this, null))
    if (this._ended)
        return process.nextTick(cb.bind(this, errors.parse(END_OF_INPUT)))
    this._pendingCount = count
    this._pendingCb = cb
}

Parser.prototype._consume = function (count) {
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

Parser.prototype._location = function(pos) {
    return this._tokens[pos].location
}

Parser.prototype._error = function() {
    var args = Array.prototype.slice.call(arguments)
    var pos = args.shift()
    var message = util.format.apply(null, args)
    return errors.parse(message, this._tokens[pos].location)
}

Parser.prototype._parseUnit = function (cb) {
    var self = this
    var unit = new ast.Unit()
    ;(function recur(err) {
        if (err) {
            self.emit('error', err)
            return self._skipStatement(function (err) {
                if (err) return cb(err, unit)
                return recur(null)
            })
        }
        self._read(1, function (err) {
            if (err) return cb(err, unit)
            if (self._accept(Token.END)) return cb(null, unit)
            self._parseUnitStatement(unit, recur)
        })
    })(null)
}

Parser.prototype._skipStatement = function(cb) {
    var self = this
    ;(function recur() {
        self._read(1, function (err) {
            if (err) return cb(err)
            if (self._accept(Token.END))
                return cb(null)
            if (self._accept(Token.SEMICOLON)) {
                self._consume(1)
                return cb(null)
            }
            self._consume(1)
            return recur()
        })
    })()
}

Parser.prototype._parseUnitStatement = function (unit, cb) {
    var self = this
    this._read(2, function (err) {
        if (err) return cb(err)
        if (self._accept(Token.REQUIRE)) return self._parseRequire(cb)
        if (self._accept(Token.EQUAL, 1))
            return self._parseBind(function (err, value) {
                if (err) return cb(err)
                if (unit.binds.hasOwnProperty(value))
                    return cb(errors.parse(util.format(DUP_BIND, value.name)
                                         , value.location))
                unit.binds[value.name] = value
                return cb(null)
            })
        if (self._accept(Token.COLON, 1))
            return self._parseRecipe(function (err, recipe) {
                if (err) return cb(err)
                if (unit.recipes.hasOwnProperty(recipe))
                    return cb(errors.parse(util.format(DUP_REC, recipe.name)
                                         , recipe.location))
                unit.recipes[recipe.name] = recipe
                return cb(null)
            })
        return self._parseRelation(function (err, relation) {
            if (err) return cb(err)
            unit.relations.push(relation)
            return cb(null)
        })
    })
}

Parser.prototype._parseRequire = function () {
    throw new Error('require not implemented')
}

Parser.prototype._parseBind = function (cb) {
    var self = this
    this._read(4, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(self._error(0, EXPECTED_IDENT, this._value(0)))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(self._error(2, EXPECTED_INTERPOL, this._value(2)))
        var interpol = new Interpolation(self._value(2), self._location(2))
        var bind = new ast.Bind(self._value(0), interpol, self._location(0))
        if (self._accept(Token.SEMICOLON, 3)) self._consume(1)
        else self.emit('warning', self._error(3, EXPECTED_SEMICOLON))
        self._consume(3)
        return cb(null, bind)
    })
}

Parser.prototype._parseRecipe = function (cb) {
    var self = this
    this._read(4, function (err) {
        if (err) return cb(err)
        if (!self._accept(Token.IDENTIFIER))
            return cb(self._error(0, EXPECTED_IDENT, self._value(0)))
        if (!self._accept(Token.INTERPOLATION, 2))
            return cb(self._error(2, EXPECTED_INTERPOL, self._value(2)))
        var interpol = new Interpolation(self._value(2), self._location(2))
        var recipe = new ast.Recipe(self._value(0), interpol, self._location(0))
        if (self._accept(Token.SEMICOLON, 3)) self._consume(1)
        else self.emit('warning', self._error(3, EXPECTED_SEMICOLON))
        self._consume(3)
        return cb(null, recipe)
    })
}

Parser.prototype._parseRelation = function (cb) {
    var self = this
    var opts = {}
    this._read(1, function (err) {
        if (err) return cb(err)
        opts.location = self._location(0)
        this._parseRefList(function (err, prereqList) {
            if (err) return cb(err)
            opts.prereqList = prereqList
            self._parseTransList(function (err, transList) {
                if (err) return cb(err)
                opts.transList = transList
                if (self._accept(Token.DOUBLE_COLON))
                    return self._parseAlias(function (err, alias) {
                        if (err) return cb(err)
                        opts.alias = alias
                        self._finishRelation(opts, cb)
                    })
                opts.alias = null
                self._finishRelation(opts, cb)
            })
        })
    })
}

Parser.prototype._finishRelation = function(opts, cb) {
    var self = this
    this._read(1, function (err) {
        if (err) return cb(err)
        if (self._accept(Token.SEMICOLON, 0)) self._consume(1)
        else self.emit('warning', self._error(0, EXPECTED_SEMICOLON))
        var rel = new ast.Relation(opts.prereqList, opts.transList
                                 , opts.alias, opts.location)
        return cb(null, rel)
    })
}

Parser.prototype._parseRefList = function (cb) {
    var self = this
    var list = []
    ;(function next() {
        self._read(2, function (err) {
            if (err) return cb(err)
            if (!(self._accept(Token.IDENTIFIER) ||
                  self._accept(Token.PATH) ||
                  self._accept(Token.PATH_GLOB))) return cb(null, list)
            if (self._accept(Token.ARROW, 1) ||
                self._accept(Token.FAT_ARROW, 1)) return cb(null, list)
            try { list.push(makeRef(this._tokens[0])) }
            catch (err) {
                if (err.name !== 'ParseError') throw err
                return cb(err)
            }
            this._consume(1)
            return next()
        })
    })()
}

Parser.prototype._parseTransList = function (cb) {
    var self = this
    var list = []
    ;(function next() {
        self._read(2, function (err) {
            if (err) return cb(err)
            if (!(self._accept(Token.ARROW, 1) ||
                  self._accept(Token.FAT_ARROW, 1)))
                return cb(null, list)
            self._parseTrans(function (err, trans) {
                if (err) return cb(err)
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
            return cb(self._error(0, EXPECTED_IDENT, this._value(0)))
        if (!(self._accept(Token.ARROW, 1) ||
              self._accept(Token.FAT_ARROW, 1)))
            return cb(self._error(1, EXPECTED_TRS, this._value(1)))
        var recipeName = self._value(0)
        var multi = self._accept(Token.FAT_ARROW, 1)
        self._consume(2)
        self._parseRefList(function (err, list) {
            if (err) return cb(err)
            var trans = new ast.Trans(recipeName, multi, list)
            return cb(null, trans)
        })
    })
}

Parser.prototype._parseAlias = function(cb) {
    var self = this
    this._read(3, function (err) {
        if (err) return cb(err)
        if (!(self._accept(Token.DOUBLE_COLON)))
            return cb(self._error(0, EXPECTED, '::', this._value(0)))
        if (!self._accept(Token.IDENTIFIER, 1))
            return cb(self._error(1, EXPECTED_IDENT, this._value(1)))
        var name = self._value(1)
        var desc = null
        var location = self._location(0)
        if (self._accept(Token.INTERPOLATION, 2)) {
            desc = self._value(2)
            self._consume(1)
        }
        self._consume(2)
        return cb(null, new ast.Alias(name, desc, location))
    })
}

function makeRef(token) {
    if (token.type === Token.IDENTIFIER)
        return new ast.Ref(ast.Ref.ALIAS, token.value, token.location)
    var filePath = path.relative('.', token.value)
    if (filePath.substr(0, 3) === '../') {
        var message = util.format(OUT_OF_ROOT, token.value)
        throw errors.parse(message, token.location)
    }
    var type = token.type === Token.PATH ? ast.Ref.PATH : ast.Ref.PATH_GLOB
    return new ast.Ref(type, filePath, token.location)
}
