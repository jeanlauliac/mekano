'use strict';
module.exports = TestStream

var Writable = require('stream').Writable
var util = require('util')

util.inherits(TestStream, Writable)
function TestStream(target, testCb, opts) {
    this._target = target
    Writable.call(this, opts)
    this._opts = opts
    this._testCb = testCb
    var self = this
    this.once('finish', (function () {
        if (self._target.length > 0)
            return this.emit('tested', new Error('some data went untested'))
        return this.emit('tested')
    }).bind(this))
}

TestStream.prototype._write = function(chunk, encoding, cb) {
    if (this._opts.objectMode) {
        if (this._target.length === 0)
            return cb(new Error('expected end of stream'))
        try { this._testCb(chunk, this._target[0]) }
        catch (err) { return cb(err) }
        this._target.shift()
        return cb()
    }
    throw new Error('not implemented')
}
