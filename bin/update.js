'use strict';
module.exports = update

var util = require('util')
var fs = require('fs')
var glob = require('glob')
var read = require('../lib/read')
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var imprint = require('../lib/update/imprint')
var Log = require('../lib/update/log')
var expandCmds = require('../lib/update/expand-cmds')
var identify = require('../lib/update/identify')
var runEdges = require('../lib/update/run-edges')
var Scope = require('../lib/scope')

var DEFAULT_PATHS = ['Neomakefile', 'neomakefile'];
var NO_MAKEFILE = 'Neomakefile not found'

function update(opts, cb) {
    openSomeInput(opts.file, function (err, input, filePath) {
        if (err) return cb(err)
        updateInput(input, filePath, cb)
    })
}

function openSomeInput(filePath, cb) {
    if (filePath === '-') return cb(null, process.stdin, '<stdin>')
    if (filePath) return openInput(filePath, cb)
    ;(function next(i) {
        if (i >= DEFAULT_PATHS.length) return cb(new Error(NO_MAKEFILE))
        openInput(DEFAULT_PATHS[i], function (err, stream) {
            if (err) return next(i + 1)
            return cb(null, stream, DEFAULT_PATHS[i])
        })
    })(0)
}

function openInput(filePath, cb) {
    var stream = fs.createReadStream(filePath)
    stream.on('open', function () { return cb(null, stream, filePath) })
    stream.on('error', function (err) { return cb(err) })
}

function updateInput(input, filePath, cb) {
    read(input, function (err, transs, unit) {
        if (err) {
            err.filePath = filePath
            err.message = util.format('%s: %s', filePath, err.message)
            return cb(err)
        }
        var log = new Log()
        var scope = Scope.fromBinds(unit.binds)
        map(glob, log, transs, function (err, graph) {
            if (err) return cb(err)
            updateGraph(log, scope, unit.recipes, graph, cb)
        })
    })
}

function updateGraph(log, scope, recipes, graph, cb) {
    var files = sort(graph.files)
    var cmds = expandCmds(scope, recipes, graph.edges)
    imprint(fs, files, cmds, function (err, imps) {
        var edges = identify(log, files, imps)
        runEdges(edges, runEdge, function (err) {
            if (err) return cb(err)
            return cb(null)
        })
    })
}

function runEdge(edge, cb) {
    console.log('%s %s -> %s'
              , edge.inFiles.map(pathOf).join(' ')
              , edge.trans.ast.recipeName
              , edge.outFiles.map(pathOf).join(' '))
    setImmediate(cb.bind(null, null))
}

function pathOf(file) {
    return file.path
}
