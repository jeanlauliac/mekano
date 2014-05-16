'use strict';
module.exports = map

var minimatch = require('minimatch')
var Graph = require('./graph')
var Token = require('../read/token')
var asyncMap = require('slide').asyncMap
var mergeLists = require('../merge-lists')

var BAS_GLOB_TARGET = 'cannot have a glob as target of a simple transformation'

function map(fs, transs, cb) {
    var graph = new Graph()
    var st = {
        fs: fs, graph: graph
      , pendingSimpleTrans: {}
      , pendingMultiTrans: {}}
    ;(function next(i) {
        if (i >= transs.length) return cb(null, graph)
        processTrans(st, transs[i], function (err) {
            if (err) return cb(err)
            return next(i + 1)
        })
    })(0)
}

function processTrans(st, trans, cb) {
    if (trans.ast.multi) {
        return //processMultiTrans(st, trans, cb)
    }
    return processSimpleTrans(st, trans, cb)
}

function processSimpleTrans(st, trans, cb) {
    var outFiles = []
    var token = null
    for (var i = 0; i < trans.targets.length; ++i) {
        token = trans.targets[i]
        if (token.type === Token.PATH_GLOB)
            return cb(Token.error(token, BAS_GLOB_TARGET))
        var file = st.graph.getFileByPath(token.value)
        outFiles.push(file)
    }
    var edge = st.graph.pushEdge(trans, outFiles)
    asyncMap(trans.prereqs, function (token, cb) {
        if (token.type === Token.PATH) {
            edge.pushFileIn(st.graph.getFileByPath(token.value))
            return cb(null)
        }
        st.fs.glob(token.value, function foundGlobMatches(err, matches) {
            if (err) return cb(err)
            var matchFiles = st.graph.getFilesByGlob(token.value)
            var graphFiles = st.graph.getFilesByPaths(matches)
            var inFiles = mergeFileLists(matchFiles, graphFiles)
            edge.pushFileIn(inFiles)
            createSimplePendingTrans(st, token.value, edge)
            return cb(null)
        })
    }, function (err) {
        if (err) return cb(err)
        updatePendingTranss(st, outFiles)
        return cb(null)
    })
}

function createSimplePendingTrans(st, glob, edge) {
    if (!st.processTrans.hasOwnProperty(glob))
        st.processTrans[glob] = []
    st.processTrans[glob].push(edge)
}

function updatePendingTranss(st, newFiles) {
    updateSimplePendingTranss(st, newFiles)
    //updateMultiPendingTranss(st, newFiles)
}

function updateSimplePendingTranss(st, newFiles) {
    for (var i = 0; i < st.newFiles; ++i) {
        for (var glob in st.pendingSimpleTrans) {
            if (!st.pendingSimpleTrans.hasOwnProperty(glob)) continue
            if (!minimatch(newFiles[i].path, glob)) continue
            var edges = st.pendingSimpleTrans[glob]
            for (var j = 0; j < edges.length; ++j) {
                edges[j].pushFileIn(newFiles[i])
            }
        }
    }
}

function fileListComparator(a, b) {
    if (a.filePath > b.filePath) return 1
    if (a.filePath < b.filePath) return -1
    return 0
}

function mergeFileLists(a, b) {
    return mergeLists(a, b, fileListComparator)
}
