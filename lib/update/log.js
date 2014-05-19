'use strict';
module.exports = Log

function Log(stream) {
    this._imps = {}
}

Log.prototype.save = function(stream) {
}

Log.prototype.isGenerated = function(path) {
    return this._imps.hasOwnProperty(path)
}

Log.prototype.isUpToDate = function(path, imp) {
    if (!this._imps.hasOwnProperty(path)) return false
    return imp === this._imps[path]
}

Log.prototype.update = function(path, imp) {
    this._imps[path] = imp
}
