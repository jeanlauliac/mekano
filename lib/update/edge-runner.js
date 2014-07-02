'use strict';
module.exports = EdgeRunner

var util = require('util')
var EventEmitter = require('events').EventEmitter
var mkdirp = require('mkdirp')
var path = require('path')
var errors = require('../errors')
var Graph = require('../graph/graph')

var CMD_FAIL = 'command failed, code %d: %s'
var CMD_SIGFAIL = 'command failed, signal %s: %s'
var SIG_ABORT = 'aborting on %s, recipe process will detach'

util.inherits(EdgeRunner, EventEmitter)
function EdgeRunner(cmds, opts) {
    if (!opts) opts = {}
    this._exec = opts.exec || require('child_process').exec
    if (typeof this._exec !== 'function')
        throw errors.invalidArg('opts.exec', opts.exec)
    this._fs = opts.fs || require('fs')
    if (typeof this._fs.mkdir !== 'function' ||
        typeof this._fs.stat !== 'function')
        throw errors.invalidArg('opts.fs', opts.fs)
    if (!(cmds instanceof Object))
        throw errors.invalidArg('cmds', cmds)
    this._cmds = cmds
    var mkdirpOpts = {fs: this._fs}
    this._mkdirp = function (dir, cb) {
        return mkdirp(dir, mkdirpOpts, cb)
    }
    this._dirMarks = {}
    this._runningEdges = {}
    this._runningCount = 0
}

EdgeRunner.prototype.abort = function (signal) {
    for (var i in this._runningEdges)
        this._runningEdges[i].abort(signal)
}

EdgeRunner.prototype.run = function (edge, cb) {
    if (!(edge instanceof Graph.Edge))
        throw errors.invalidArg('edge', edge)
    if (typeof cb !== 'function')
        throw errors.invalidArg('cb', cb)
    var self = this
    this._makeEdgeDirs(edge, function (err) {
        if (err) return cb(err)
        self._execEdge(edge, cb)
    })
}

EdgeRunner.prototype._execEdge = function (edge, cb) {
    var self = this
    var cmd = self._cmds[edge.index]
    self._exec(cmd, function (err, stdout, stderr) {
        if (!self._runningEdges.hasOwnProperty(edge.index)) return
        var sigint = self._runningEdges[edge.index].sigint
        delete self._runningEdges[edge.index]
        self.emit('run', edge, stdout, stderr)
        if (!err) return cb(null)
        var nerr = new Error(messageFor(err, cmd))
        if ((err.signal === 'SIGINT' || err.code === 130) && sigint)
            nerr.signal = 'SIGINT'
        return cb(nerr)
    })
    self._runningEdges[edge.index] = {
        sigint: false
      , abort: function abortRunEdge (signal) {
            if (signal === 'SIGINT') return (this.sigint = true)
            delete self._runningEdges[edge.index]
            self.emit('run', edge, '', '')
            var msg = util.format(SIG_ABORT, signal)
            return cb(new Error(msg))
        }
    }
}

EdgeRunner.prototype._makeEdgeDirs = function (edge, cb) {
    var self = this
    process.nextTick((function next(i) {
        if (i >= edge.outFiles.length) return cb(null)
        var file = edge.outFiles[i]
        var dir = path.dirname(file.path)
        if (self._dirMarks.hasOwnProperty(dir)) return next(i + 1)
        self._mkdirp(path.dirname(file.path), function (err) {
            if (err) return cb(err)
            self._dirMarks[dir] = true
            return next(i + 1)
        })
    }).bind(null, 0))
}

function messageFor(err, cmd) {
    if (err.code) return util.format(CMD_FAIL, err.code, cmd)
    else return util.format(CMD_SIGFAIL, err.signal, cmd)
}
