'use strict';
module.exports = runEdges

var util = require('util')
var EventEmitter = require('events').EventEmitter
var errors = require('../errors')

function runEdges(edges, runEdge, opts) {
    if (!(edges instanceof Array)) throw errors.invalidArg('edges', edges)
    if (typeof runEdge !== 'function')
        throw errors.invalidArg('runEdge', runEdge)
    if (opts && !(opts instanceof Object))
        throw errors.invalidArg('opts', opts)
    if (!opts) opts = { }
    if (opts.concurrency &&
        (typeof opts.concurrency !== 'number' || opts.concurrency < 1))
        throw errors.invalidArg('opts.concurrency', opts.concurrency)
    if (opts.shy && typeof opts.shy !== 'boolean')
        throw errors.invalidArg('opts.shy', opts.shy)
    return new RunEdgesTask(edges, runEdge, opts)
}

util.inherits(RunEdgesTask, EventEmitter)
function RunEdgesTask(edges, runEdge, opts) {
    this._concurrency = opts.concurrency || 1
    this._shy = opts.shy || false
    this._isEdgeDone = {}
    for (var k = 0; k < edges.length; ++k)
        this._isEdgeDone[edges[k].index] = false
    this._signal = null
    this._abort = false
    this._pending = 0
    this._queue = []
    this._runEdge = runEdge
    this._processEdge = this._processEdge.bind(this)
    this._processEdges(getReadyEdges(this._isEdgeDone, edges))
}

RunEdgesTask.prototype._processEdges = function (edges) {
    this._queue = this._queue.concat(edges)
    edges = this._queue.splice(0, this._concurrency - this._pending)
    edges.forEach(this._processEdge)
    if (this._pending === 0) return this.emit('finish')
}

RunEdgesTask.prototype._processEdge = function (edge) {
    var self = this
    this._pending++
    this._runEdge(edge, function edgeRun(err) {
        self._pending--
        if (err) {
            self.emit('error', err)
            if (err.signal) self.abort(err.signal)
            else if (self._shy) self.abort()
        } else {
            self._isEdgeDone[edge.index] = true
        }
        if (!self._abort) {
            var nextEdges = getReadyOutEdges(self._isEdgeDone, edge.outFiles)
            return self._processEdges(nextEdges)
        }
        if (self._pending > 0) return
        self.emit('finish', self._signal)
    })
}

RunEdgesTask.prototype.abort = function (signal) {
    this._abort = true
    if (signal) this._signal = signal
}

function getReadyOutEdges(isEdgeDone, files) {
    var edges = []
    files.forEach(function (file) {
        edges = edges.concat(getReadyEdges(isEdgeDone, file.outEdges))
    })
    return edges
}

function getReadyEdges(isEdgeDone, edges) {
    var readyEdges = []
    for (var i = 0; i < edges.length; ++i) {
        var edge = edges[i]
        if (!isEdgeDone.hasOwnProperty(edge.index)) continue
        isEdgeDone[edge.index] = false
        if (isEdgeReady(isEdgeDone, edge)) readyEdges.push(edge)
    }
    return readyEdges
}

function isEdgeReady(isEdgeDone, edge) {
    for (var k = 0; k < edge.inFiles.length; ++k) {
        var file = edge.inFiles[k]
        if (file.inEdge === null) continue
        if (!isEdgeDone.hasOwnProperty(file.inEdge.index)) continue
        if (!isEdgeDone[file.inEdge.index]) return false
    }
    return true
}
