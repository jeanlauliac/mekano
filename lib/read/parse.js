'use strict';
module.exports = parse

var Writable = require('stream').Writable
var ast = require('./ast')
var util = require('util')

function parse(opts) {
    return new Parser(opts)
}

util.inherits(Parser, Writable)
function Parser(opts) {
    opts = {objectMode: true}
    Writable.call(this, opts)
    this._tokens = []
    this._parseUnit(this.ast, (function (err, unit) {
        if (err) return this.emit('error', err)
        this.emit('parsed', unit)
    }).bind(this))
    this.once('finish', (function () {
        if (this._pendingCb) {
            this._pendingCb(null, this._tokens)
            this._pendingCb = null
        }
    }).bind(this))
}

Parser.prototype._write = function(chunk, encoding, cb) {
    this._tokens.push(chunk)
    if (this._pendingCb) {
        this._pendingCb(null, this._tokens)
        this._pendingCb = null
    }
    return cb()
}

Parser.prototype._read = function(count, cb) {
    if (count <= this._tokens.length)
        return process.nextTick(cb.bind(this, null, this._tokens.slice()))
    this._pendingCb = cb
}

Parser.prototype._consume = function(count) {
    this._tokens.splice(0, count)
}

Parser.prototype._parseUnit = function(cb) {
    var unit = new ast.Unit()
    this._read(2, function (err, tokens) {
        if (err) return cb(err)

    })
}
