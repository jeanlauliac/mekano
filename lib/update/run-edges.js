'use strict';
module.exports = runEdges

var util = require('util')
var EventEmitter = require('events').EventEmitter

var SIG_ABORT = 'aborting because of signal: %s'

function runEdges(edges, runEdge, maxPending) {
    var st = {
        runEdge: runEdge
      , edges: edges
      , done: {}
    }
    var signal = null
    var task = new EventEmitter()
    task.on('signal', function (sig) { signal = sig })
    for (var k = 0; k < edges.length; ++k)
        st.done[edges[k].index] = false
    var pending = 0
    var queued = []
    ;(function nextEdges(edges) {
        queued = queued.concat(edges)
        edges = queued.splice(0, maxPending - pending)
        edges.forEach(function forEdge(edge) {
            pending++
            runEdge(edge, function edgeRun(err) {
                pending--
                if (!err) st.done[edge.index] = true
                if (err) {
                    task.emit('error', err)
                    if (err.signal) signal = err.signal
                }
                if (signal === null)
                    return nextEdges(getReadyOutEdges(st, edge.outFiles))
                if (pending > 0) return
                if (signal !== null) {
                    var nerr = new Error(util.format(SIG_ABORT, signal))
                    nerr.signal = signal
                    task.emit('error', nerr)
                }
                task.emit('finish')
            })
        })
        if (pending === 0) return task.emit('finish')
    })(getReadyEdges(st, edges))
    return task
}

function getReadyOutEdges(st, files) {
    var edges = []
    files.forEach(function (file) {
        edges = edges.concat(getReadyEdges(st, file.outEdges))
    })
    return edges
}

function getReadyEdges(st, edges) {
    var readyEdges = []
    for (var i = 0; i < edges.length; ++i) {
        var edge = edges[i]
        if (!st.done.hasOwnProperty(edge.index)) continue
        st.done[edge.index] = false
        if (isEdgeReady(st, edge)) readyEdges.push(edge)
    }
    return readyEdges
}

function isEdgeReady(st, edge) {
    for (var k = 0; k < edge.inFiles.length; ++k) {
        var file = edge.inFiles[k]
        if (file.inEdge === null) continue
        if (!st.done.hasOwnProperty(file.inEdge.index)) continue
        if (!st.done[file.inEdge.index]) return false
    }
    return true
}
