'use strict';
module.exports = Log

var concat = require('concat-stream')

function Log(imps) {
    this._imps = imps || {}
}

Log.fromStream = function (stream, cb) {
    var done = false
    var readError = function (err) {
        stream.removeListener('error', readError)
        done = true
        cb(err)
    }
    stream.on('error', readError)
    stream.pipe(concat({data: 'string'}, function (data) {
        if (done) return
        done = true
        stream.removeListener('error', readError)
        var imps
        try {
            imps = JSON.parse(data)
        } catch (err) {
            return cb(err)
        }
        var log = new Log(imps)
        return cb(null, log)
    }))
}

Log.prototype.save = function (stream) {
    stream.write(JSON.stringify(this._imps))
    return stream
}

Log.prototype.isGenerated = function (path) {
    return this._imps.hasOwnProperty(path)
}

Log.prototype.isUpToDate = function (path, imp) {
    if (!this._imps.hasOwnProperty(path)) return false
    return imp === this._imps[path]
}

Log.prototype.update = function (path, imp) {
    this._imps[path] = imp
}
