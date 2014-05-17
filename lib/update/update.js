'use strict';
module.exports = update

var asyncMap = require('slide').asyncMap
var EventEmitter = require('events').EventEmitter

function update(fs, graph, files, cb) {
    var st = {
        fs: fs
      , graph: graph
      , states: {}
      , events: new EventEmitter()
      , wantedEdgeCount: 0
      , doneEdgeCount: 0
      , nextEdges: []
    }
    for (var i = 0; i < files.length; ++i) {
        st.states[files[i].path] = {
            file: files[i], stats: null, upToDate: true
        }
    }
    initNextEdges(st, files, function (err) {
        if (err) return cb(err)
        processEdges(st, function (err) {
            return cb(err)
        })
    })
    return st.events
}

var TODO_NOT_DIRTY = false

function initNextEdges(st, files, cb) {
    asyncMap(files, function (file, cb) {
        if (file.inEdge !== null) return cb(null)
        var state = st.states[file.path]
        st.fs.lstat(file.path, function (err, stats) {
            if (err) return cb(err)
            state.stats = stats
            if (TODO_NOT_DIRTY) return cb(null)
            forwardNotReady(st, file)
            for (var i = 0; i < file.outEdges.length; ++i) {
                var edge = file.outEdges[i]
                if (isEdgeReady(st, edge)) st.nextEdges.push(edge)
            }
            return cb(null)
        })
    }, cb)
}

function forwardNotReady(st, file) {
    for (var i = 0; i < file.outEdges.length; ++i) {
        var edge = file.outEdges[i]
        var wantedEdge = true
        for (var j = 0; j < edge.outFiles.length; ++j) {
            var outFile = edge.outFiles[j]
            if (!st.states.hasOwnProperty(outFile.path)) continue
            if (!st.states[outFile.path].upToDate) {
                wantedEdge = false
                break
            }
            st.states[outFile.path].upToDate = false
            forwardNotReady(st, outFile)
        }
        if (wantedEdge) st.wantedEdgeCount += 1
    }
}

function processEdges(st, cb) {
    ;(function next() {
        if (st.nextEdges.length === 0) return cb(null)
        var edge = st.nextEdges.pop()
        processEdge(st, edge, function (err) {
            if (err) return cb(err)
            return next()
        })
    })()
}

function processEdge(st, edge, cb) {
    st.events.emit('progress', {
        edge: edge
      , done: st.doneEdgeCount
      , total: st.wantedEdgeCount
    })
    process.nextTick(function (err) {
        if (err) return cb(err)
        st.doneEdgeCount++
        edge.outFiles.forEach(function (file) {
            if (!st.states.hasOwnProperty(file.path)) return
            st.states[file.path].upToDate = true
            file.outEdges.forEach(function (outEdge) {
                if (isEdgeReady(st, outEdge)) st.nextEdges.push(outEdge)
            })
        })
        return cb(null)
    })
}

function isEdgeReady(st, edge) {
    for (var k = 0; k < edge.inFiles.length; ++k) {
        if (!st.states[edge.inFiles[k].path].upToDate) {
            return false
        }
    }
    return true
}
