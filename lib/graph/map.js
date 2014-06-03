'use strict';
module.exports = map

var EventEmitter = require('events').EventEmitter
var Graph = require('./graph')
var Log = require('../update/log')
var ast = require('../read/ast')
var interRep = require('../read/inter-rep')
var asyncMap = require('slide').asyncMap
var mergeLists = require('../merge-lists')
var makeConv = require('./make-conv')
var errors = require('../errors')

var BAD_GLOB_TARGET = 'cannot have a globbing pattern as target of ' +
                      'a simple transformation'
var MULTI_ONE_GLOB = 'multi transformation must have exactly one ' +
                     'prerequisite globbing pattern'
var MULTI_CANT_HAVE_PATH = 'a plain path cannot appear right of ' +
                           'multi transformation'

function map(glob, log, transs) {
    if (typeof glob !== 'function') throw errors.invalidArg('glob', glob)
    if (!(log instanceof Log)) throw errors.invalidArg('log', log)
    if (!(transs instanceof Array)) throw errors.invalidArg('transs', transs)
    var graph = new Graph()
    var st = {
        glob: glob, graph: graph
      , log: log, transs: transs
      , events: new EventEmitter()
    }
    ;(function next(i) {
        if (i >= transs.length) {
            return st.events.emit('finish', graph)
        }
        processTrans(st, transs[i], function (err) {
            if (err) st.events.emit('error', err)
            return next(i + 1)
        })
    })(0)
    return st.events
}

function processTrans(st, trans, cb) {
    if (!st) throw errors.invalidArg('st', st)
    if (!(trans instanceof interRep.PlainTrans))
        throw errors.invalidArg('trans', trans)
    if (typeof cb !== 'function') throw errors.invalidArg('cb', cb)
    if (trans.ast.multi)
        return processMultiTrans(st, trans, cb)
    return processSimpleTrans(st, trans, cb)
}

function processSimpleTrans(st, trans, cb) {
    var outFiles = []
    for (var i = 0; i < trans.targets.length; ++i) {
        var ref = trans.targets[i]
        if (!(ref instanceof ast.Ref)) throw errors.invalidArg('trans', trans)
        if (ref.isA(ast.Ref.PATH_GLOB))
            return cb(errors.parse(BAD_GLOB_TARGET, ref.location))
        var file = st.graph.getFileByPath(ref.value)
        outFiles.push(file)
    }
    var edge = st.graph.pushEdge(trans, outFiles)
    asyncMap(trans.prereqs, function (ref, cb) {
        if (!(ref instanceof ast.Ref)) throw errors.invalidArg('trans', trans)
        if (ref.isA(ast.Ref.PATH)) {
            edge.pushFileIn(st.graph.getFileByPath(ref.value))
            return cb(null)
        }
        mixedGlob(st, ref.value, function (err, files) {
            if (err) return cb(err)
            edge.pushFilesIn(files)
            return cb(null)
        })
    }, function (err) {
        process.nextTick(cb.bind(null, err))
    })
}

function processMultiTrans(st, trans, cb) {
    var patRef = null
    var inFiles = []
    for (var i = 0; i < trans.prereqs.length; ++i) {
        if (!(trans.prereqs[i] instanceof ast.Ref))
            throw errors.invalidArg('trans', trans)
        if (trans.prereqs[i].isA(ast.Ref.PATH)) {
            inFiles.push(st.graph.getFileByPath(trans.prereqs[i].value))
            continue
        }
        if (patRef !== null)
            return process.nextTick(cb.bind(null, new Error(MULTI_ONE_GLOB)))
        patRef = trans.prereqs[i]
    }
    var outConvs = null
    try {
        var mc = makeTokenConv.bind(null, patRef)
        outConvs = trans.targets.map(mc)
    } catch (err) {
        if (err.name !== 'ParseError') throw err
        return process.nextTick(cb.bind(null, err))
    }
    mixedGlob(st, patRef.value, function (err, files) {
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

function makeTokenConv(patRef, otherRef) {
    if (!(patRef instanceof ast.Ref)) throw errors.invalidArg('patRef', patRef)
    if (!(otherRef instanceof ast.Ref))
        throw errors.invalidArg('otherRef', otherRef)
    if (otherRef.isA(ast.Ref.PATH))
        throw errors.parse(MULTI_CANT_HAVE_PATH, otherRef.location)
    try { return makeConv(patRef.value, otherRef.value) }
    catch (err) {
        throw errors.parse(err.message, patRef.location)
    }
}

function mergeFileLists(a, b) {
    if (!(a instanceof Array)) throw errors.invalidArg('a', a)
    if (!(b instanceof Array)) throw errors.invalidArg('b', b)
    return mergeLists(a, b, fileListComparator)
}

function fileListComparator(a, b) {
    if (a.path > b.path) return 1
    if (a.path < b.path) return -1
    return 0
}
