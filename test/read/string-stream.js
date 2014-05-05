'use strict';
module.exports = StringStream

var Readable = require('stream').Readable
var util = require('util')

util.inherits(StringStream, Readable)
function StringStream(str, opts) {
    this._buffer = str
    Readable.call(this, opts)
}

StringStream.prototype._read = function(size) {
    if (this._buffer.length > 0) {
        this.push(this._buffer.substr(0, size))
        this._buffer = this._buffer.substr(size)
    }
    if (this._buffer.length === 0) {
        this.push(null)
    }
}
