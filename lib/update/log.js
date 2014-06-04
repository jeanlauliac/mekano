'use strict';
module.exports = Log

var concat = require('concat-stream')
var errors = require('../errors')

function Log(imps, opts) {
    this._imps = imps || {}
    if (!opts) opts = {}
    this._fs = opts.fs ? opts.fs : require('fs')
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

Log.prototype.refresh = function (cb) {
    var st = {count: 0, cb: cb}
    for (var path in this._imps) {
        if (!this._imps.hasOwnProperty(path)) continue
        st.count++
        this._refreshFile(st, path)
    }
    if (st.count === 0) return process.nextTick(cb.bind(null, null))
}

Log.prototype._refreshFile = function (st, path) {
    var self = this
    this._fs.lstat(path, function (err) {
        if (err && err.code !== 'ENOENT') {
            if (cb === null) return
            var cb = st.cb
            st.cb = null
            return cb(err)
        }
        if (err) delete self._imps[path]
        st.count--
        if (st.count === 0 && st.cb !== null) return st.cb(null)
    })
}

Log.prototype.isGenerated = function (path) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
    return this._imps.hasOwnProperty(path)
}

Log.prototype.isUpToDate = function (path, imp) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
    if (typeof imp !== 'number') throw errors.invalidArg('imp', imp)
    if (!this._imps.hasOwnProperty(path)) return false
    return imp === this._imps[path]
}

Log.prototype.update = function (path, imp) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
    if (typeof imp !== 'number') throw errors.invalidArg('imp', imp)
    this._imps[path] = imp
}

Log.prototype.forget = function (path) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
    delete this._imps[path]
}

Log.prototype.getPaths = function () {
    var paths = []
    for (var path in this._imps) {
        paths.push(path)
    }
    return paths
}
