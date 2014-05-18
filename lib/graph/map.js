'use strict';
module.exports = map

var minimatch = require('minimatch')
var Graph = require('./graph')
var Token = require('../read/token')
var asyncMap = require('slide').asyncMap
var mergeLists = require('../merge-lists')
var makeConv = require('./make-conv')

var BAS_GLOB_TARGET = 'cannot have a globbing pattern as target of ' +
                      'a simple transformation'
var MULTI_ONE_GLOB = 'multi transformation must have one ' +
                     'single globbing pattern as prerequisite'
var MULTI_CANT_HAVE_PATH = 'a plain path cannot appear right of ' +
                           'multi transformation'

function map(glob, transs, cb) {
    var graph = new Graph()
    var st = {
        glob: glob, graph: graph
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
        return processMultiTrans(st, trans, cb)
    }
    return processSimpleTrans(st, trans, cb)
}

function processSimpleTrans(st, trans, cb) {
    var outFiles = []
    for (var i = 0; i < trans.targets.length; ++i) {
        var token = trans.targets[i]
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
        st.glob(token.value, function foundGlobMatches(err, matches) {
            if (err) return cb(err)
            var matchFiles = st.graph.getFilesByGlob(token.value)
            var graphFiles = st.graph.getFilesByPaths(matches)
            var inFiles = mergeFileLists(matchFiles, graphFiles)
            edge.pushFilesIn(inFiles)
            createSimplePendingTrans(st, token.value, edge)
            return cb(null)
        })
    }, function (err) {
        if (err) return cb(err)
        updatePendingTranss(st, outFiles)
        return cb(null)
    })
}

function createSimplePendingTrans(st, pattern, edge) {
    if (!st.pendingSimpleTrans.hasOwnProperty(pattern))
        st.pendingSimpleTrans[pattern] = []
    st.pendingSimpleTrans[pattern].push(edge)
}

function processMultiTrans(st, trans, cb) {
    if (trans.prereqs.length !== 1 || trans.prereqs[0].type !== Token.PATH_GLOB)
        return cb(new Error(MULTI_ONE_GLOB))
    var pattern = trans.prereqs[0].value
    if (!st.pendingMultiTrans.hasOwnProperty(pattern))
        st.pendingMultiTrans[pattern] = []
    var info = null
    try {
        var outConvs = trans.targets.map(
            makeTokenConv.bind(null, trans.prereqs[0]))
        info = {trans: trans, outConvs: outConvs}
        st.pendingMultiTrans[pattern].push(info)
    } catch (err) {
        return cb(err)
    }
    st.glob(pattern, function foundGlobMatches(err, matches) {
        if (err) return cb(err)
        var matchFiles = st.graph.getFilesByGlob(pattern)
        var graphFiles = st.graph.getFilesByPaths(matches)
        var inFiles = mergeFileLists(matchFiles, graphFiles)
        for (var i = 0; i < inFiles.length; ++i)
            updateMultiTrans(st, info, inFiles[i])
        return cb(null)
    })
}

function makeTokenConv(patToken, otherToken) {
    if (otherToken.type === Token.PATH)
        throw Token.error(otherToken, MULTI_CANT_HAVE_PATH)
    try { return makeConv(patToken.value, otherToken.value) }
    catch (err) {
        throw Token.error(patToken, err.message)
    }
}

function updatePendingTranss(st, newFiles) {
    for (var i = 0; i < newFiles.length; ++i) {
        updateSimplePendingTranss(st, newFiles[i])
        updateMultiPendingTranss(st, newFiles[i])
    }
}

function updateSimplePendingTranss(st, newFile) {
    for (var pattern in st.pendingSimpleTrans) {
        if (!st.pendingSimpleTrans.hasOwnProperty(pattern)) continue
        if (!minimatch(newFile.path, pattern)) continue
        var edges = st.pendingSimpleTrans[pattern]
        for (var j = 0; j < edges.length; ++j) {
            edges[j].pushFileIn(newFile)
        }
    }
}

function updateMultiPendingTranss(st, newFile) {
    for (var pattern in st.pendingMultiTrans) {
        if (!st.pendingMultiTrans.hasOwnProperty(pattern)) continue
        if (!minimatch(newFile.path, pattern)) continue
        var infos = st.pendingMultiTrans[pattern]
        for (var j = 0; j < infos.length; ++j) {
            updateMultiTrans(st, infos[j], newFile)
        }
    }
}

function updateMultiTrans(st, info, newFile) {
    console.error('>>>>', newFile)
    var outFiles = []
    for (var i = 0; i < info.outConvs.length; ++i) {
        var conv = info.outConvs[i]
        var file = st.graph.getFileByPath(conv(newFile.path))
        outFiles.push(file)
        console.error('##### ', file)
    }
    var edge = st.graph.pushEdge(info.trans, outFiles)
    edge.pushFileIn(newFile)
    updatePendingTranss(st, outFiles)
}

function fileListComparator(a, b) {
    if (a.filePath > b.filePath) return 1
    if (a.filePath < b.filePath) return -1
    return 0
}

function mergeFileLists(a, b) {
    return mergeLists(a, b, fileListComparator)
}
