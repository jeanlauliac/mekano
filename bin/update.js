'use strict';
module.exports = update

var fs = require('fs')

var DEFAULT_PATHS = ['Neomakefile', 'neomakefile'];
var NO_MAKEFILE = 'Neomakefile not found'

var fs = require('fs')
var glob = require('glob')
var read = require('../lib/read')
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var imprint = require('../lib/update/imprint')
var Log = require('../lib/update/log')
var identify = require('../lib/update/identify')
var runEdges = require('../lib/update/run-edges')

function update(opts, cb) {
    openSomeInput(opts.file, function (err, input) {
        if (err) return cb(err)
        updateInput(input, cb)
    })
}

function openSomeInput(filePath, cb) {
    if (filePath === '-') return cb(null, process.stdin)
    if (filePath) return openInput(filePath, cb)
    ;(function next(i) {
        if (i >= DEFAULT_PATHS.length) return cb(new Error(NO_MAKEFILE))
        openInput(DEFAULT_PATHS[i], function (err, stream) {
            if (err) return next(i + 1)
            return cb(null, stream)
        })
    })(0)
}

function openInput(filePath, cb) {
    var stream = fs.createReadStream(filePath)
    stream.on('open', function () { return cb(null, stream) })
    stream.on('error', function (err) { return cb(err) })
}

function updateInput(input, cb) {
    read(input, function (err, transs) {
        if (err) return cb(err)
        console.log(transs)
        map(glob, transs, function (err, graph) {
            if (err) return cb(err)
            updateGraph(graph, cb)
        })
    })
}

function updateGraph(graph, cb) {
    var files = sort(graph.files)
    var imps = imprint(files)
    var log = new Log()
    var edges = identify(log, files, imps)
    runEdges(edges, runEdge, function (err) {
        if (err) return cb(err)
        return cb(null)
    })
}

function runEdge(edge, cb) {
    console.log('%s -> %s'
              , edge.inFiles.map(pathOf).join(' ')
              , edge.outFiles.map(pathOf).join(' '))
    setImmediate(cb.bind(null, null))
}

function pathOf(file) {
    return file.path
}
