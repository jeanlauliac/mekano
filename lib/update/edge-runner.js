'use strict';
module.exports = EdgeRunner

var util = require('util')
var EventEmitter = require('events').EventEmitter
var path = require('path')
var errors = require('../errors')
var Graph = require('../graph/graph')
var cacheMkdirP = require('../cache-mkdirp')

var CMD_FAIL = 'command failed, code %d: %s'
var CMD_SIGFAIL = 'command failed, signal %s: %s'
var SIG_ABORT = 'aborting on %s, recipe process will detach'

function EdgeRunner(cmds, opts) {
    if (!opts) opts = {}
    this._exec = opts.exec || require('child_process').exec
    if (typeof this._exec !== 'function')
        throw errors.invalidArg('opts.exec', opts.exec)
    var mkdirP = opts.mkdirP || require('mkdirp')
    if (typeof mkdirP !== 'function')
        throw errors.invalidArg('opts.mkdirP', opts.mkdirP)
    if (!(cmds instanceof Object))
        throw errors.invalidArg('cmds', cmds)
    this._cmds = cmds
    this._mkdirP = cacheMkdirP(mkdirP)
    this._dirMarks = {}
    this._runningEdges = {}
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
    this._execEdge(edge, cb)
}

EdgeRunner.prototype._execEdge = function (edge, cb) {
    var self = this
    var cmd = this._cmds[edge.index]
    var rnEd = new RunningEdge(edge, cmd, this._exec, this._mkdirP)
    this._runningEdges[edge.index] = rnEd
    rnEd.on('done', function (err, stdout, stderr) {
        delete self._runningEdges[edge.index]
        return cb(err, stdout, stderr)
    })
}

util.inherits(RunningEdge, EventEmitter)
function RunningEdge(edge, cmd, exec, mkdirP) {
    EventEmitter.call(this)
    this._edge = edge
    this._cmd = cmd
    this._sigint = false
    this._done = false
    var self = this
    this._makeEdgeDirs(edge, mkdirP, function (err) {
        if (err) return this.emit('done', null, '', '')
        if (self._done) return
        exec(cmd, self._onExecDone.bind(self))
    })
}

RunningEdge.prototype._makeEdgeDirs = function (edge, mkdirP, cb) {
    process.nextTick((function next(i) {
        if (i >= edge.outFiles.length) return cb(null)
        var file = edge.outFiles[i]
        mkdirP(path.dirname(file.path), function (err) {
            if (err) return cb(err)
            return next(i + 1)
        })
    }).bind(null, 0))
}

RunningEdge.prototype._onExecDone = function (err, stdout, stderr) {
    if (this._done) return
    this._done = true
    if (!err) return this.emit('done', null, stdout, stderr)
    var nerr = new Error(messageFor(err, this._cmd))
    if ((err.signal === 'SIGINT' || err.code === 130) && this._sigint)
        nerr.signal = 'SIGINT'
    return this.emit('done', nerr, stdout, stderr)
}

RunningEdge.prototype.abort = function (signal) {
    if (signal === 'SIGINT') return (this._sigint = true)
    this._done = true
    var err = new Error(util.format(SIG_ABORT, signal))
    err.signal = signal
    var self = this
    process.nextTick(function () {
        self.emit('done', err, '', '')
    })
}

function messageFor(err, cmd) {
    if (err.code) return util.format(CMD_FAIL, err.code, cmd)
    else return util.format(CMD_SIGFAIL, err.signal, cmd)
}
