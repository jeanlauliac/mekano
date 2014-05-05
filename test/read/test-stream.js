'use strict';
module.exports = TestStream

var Writable = require('stream').Writable
var util = require('util')

util.inherits(TestStream, Writable)
function TestStream(target, testCb, opts, endCb) {
    this._target = target
    Writable.call(this, opts)
    this._opts = opts
    this._testCb = testCb
    this._endCb = endCb
    var self = this
    this.once('finish', function () {
        if (self._target.length > 0)
            return endCb(new Error('some data went untested'))
        return endCb()
    })
}

TestStream.prototype._write = function(chunk, encoding, cb) {
    if (this._opts.objectMode) {
        this._testCb(chunk, this._target[0])
        this._target.shift()
        return cb()
    }
    throw new Error('not implemented')
}
