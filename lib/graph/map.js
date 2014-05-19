'use strict';
module.exports = map

var EventEmitter = require('events').EventEmitter
var Graph = require('./graph')
var Token = require('../read/token')
var asyncMap = require('slide').asyncMap
var mergeLists = require('../merge-lists')
var makeConv = require('./make-conv')

var BAD_GLOB_TARGET = 'cannot have a globbing pattern as target of ' +
                      'a simple transformation'
var MULTI_ONE_GLOB = 'multi transformation must have exactly one ' +
                     'prerequisite globbing pattern'
var MULTI_CANT_HAVE_PATH = 'a plain path cannot appear right of ' +
                           'multi transformation'

function map(glob, log, transs, cb) {
    var graph = new Graph()
    var st = {
        glob: glob, graph: graph
      , log: log, transs: transs
      , events: new EventEmitter()
    }
    ;(function next(i) {
        if (i >= transs.length) return cb(null, graph)
        processTrans(st, transs[i], function (err) {
            if (err) st.events.emit('error', err)
            return next(i + 1)
        })
    })(0)
    return st.events
}

function processTrans(st, trans, cb) {
    if (trans.ast.multi)
        return processMultiTrans(st, trans, cb)
    return processSimpleTrans(st, trans, cb)
}

function processSimpleTrans(st, trans, cb) {
    var outFiles = []
    for (var i = 0; i < trans.targets.length; ++i) {
        var token = trans.targets[i]
        if (token.type === Token.PATH_GLOB)
            return cb(Token.error(token, BAD_GLOB_TARGET))
        var file = st.graph.getFileByPath(token.value)
        outFiles.push(file)
    }
    var edge = st.graph.pushEdge(trans, outFiles)
    asyncMap(trans.prereqs, function (token, cb) {
        if (token.type === Token.PATH) {
            edge.pushFileIn(st.graph.getFileByPath(token.value))
            return cb(null)
        }
        mixedGlob(st, token.value, function (err, files) {
            if (err) return cb(err)
            edge.pushFilesIn(files)
            return cb(null)
        })
    }, cb)
}

function processMultiTrans(st, trans, cb) {
    var patToken = null
    var inFiles = []
    for (var i = 0; i < trans.prereqs.length; ++i) {
        if (trans.prereqs[i].type === Token.PATH) {
            inFiles.push(st.graph.getFileByPath(trans.prereqs[i].value))
            continue
        }
        if (patToken !== null) return cb(new Error(MULTI_ONE_GLOB))
        patToken = trans.prereqs[i]
    }
    var outConvs = null
    try {
        var mc = makeTokenConv.bind(null, patToken)
        outConvs = trans.targets.map(mc)
    } catch (err) {
        return cb(err)
    }
    mixedGlob(st, patToken.value, function (err, files) {
        if (err) return cb(err)
        files.forEach(function (file) {
            var outFiles = outConvs.map(function (outConv) {
                return st.graph.getFileByPath(outConv(file.path))
            })
            var edge = st.graph.pushEdge(trans, outFiles)
            edge.pushFilesIn(inFiles)
            edge.pushFileIn(file)
        })
        return cb(null)
    })
}

function mixedGlob(st, pattern, cb) {
    st.glob(pattern, function foundGlobMatches(err, matches) {
        if (err) return cb(err)
        matches = matches.filter(function (path) {
            return !st.log.isGenerated(path)
        })
        var matchFiles = st.graph.getFilesByGlob(pattern)
        var graphFiles = st.graph.getFilesByPaths(matches)
        var inFiles = mergeFileLists(matchFiles, graphFiles)
        return cb(null, inFiles)
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

function mergeFileLists(a, b) {
    return mergeLists(a, b, fileListComparator)
}

function fileListComparator(a, b) {
    if (a.filePath > b.filePath) return 1
    if (a.filePath < b.filePath) return -1
    return 0
}
