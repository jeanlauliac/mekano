'use strict';
module.exports = cacheMkdirP

var path = require('path')

function cacheMkdirP(mkdirP) {
    var cache = new MkdirPCache(mkdirP)
    return cache.mkdirP.bind(cache)
}

function MkdirPCache(mkdirP) {
    this._mkdirP = mkdirP
    this._dirMarks = {}
}

MkdirPCache.prototype.mkdirP = function (dir, opts, cb) {
    if (!cb) {
        cb = opts
        opts = {}
    }
    dir = path.resolve(dir)
    if (this._dirMarks.hasOwnProperty(dir))
        return process.nextTick(cb.bind(null, null))
    var self = this
    this._mkdirP(dir, opts, function (err) {
        if (err) return cb(err)
        self._dirMarks[dir] = true
        return cb(null)
    })
}
