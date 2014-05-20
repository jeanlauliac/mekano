'use strict';
module.exports = runEdges

var EventEmitter = require('events').EventEmitter

function runEdges(edges, runEdge, cb) {
    var st = {
        runEdge: runEdge
      , edges: edges
      , events: new EventEmitter()
      , done: {}
    }
    for (var k = 0; k < edges.length; ++k)
        st.done[edges[k].index] = false
    var pending = 0
    var gerr = null
    ;(function nextEdges(edges) {
        edges.forEach(function forEdge(edge) {
            pending++
            runEdge(edge, function edgeRun(err) {
                pending--
                if (err) {
                    gerr = new Error('one or more errors during update')
                    st.events.emit('error', err)
                    if (pending === 0) cb(gerr)
                    return
                }
                st.done[edge.index] = true
                nextEdges(getReadyOutEdges(st, edge.outFiles))
            })
        })
        if (pending === 0) return cb(gerr)
    })(getReadyEdges(st, edges))
    return st.events
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
        st.done[edge.index] = false
        if (isEdgeReady(st, edge)) readyEdges.push(edge)
    }
    return readyEdges
}

function isEdgeReady(st, edge) {
    for (var k = 0; k < edge.inFiles.length; ++k) {
        var file = edge.inFiles[k]
        if (file.inEdge === null) continue
        if (!st.done.hasOwnProperty(file.inEdge.index))
            throw new Error('missing incoming edge')
        if (!st.done[file.inEdge.index]) return false
    }
    return true
}
