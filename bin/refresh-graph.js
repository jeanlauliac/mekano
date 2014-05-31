'use strict';
module.exports = refreshGraph

var fs = require('fs')
var glob = require('glob')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var map = require('../lib/graph/map')
var ast = require('../lib/read/ast')
var sort = require('../lib/update/sort')
var expandCmds = require('../lib/update/expand-cmds')
var imprint = require('../lib/update/imprint')
var identify = require('../lib/update/identify')
var forwardEvents = require('../lib/forward-events')
var helpers = require('./helpers')
var errors = require('../lib/errors')

var NO_MATCH = 'no file matches the pattern `%s\''
var NO_SUCH_FILE = 'no such file `%s\', put patterns into "quotes" to avoid ' +
                   'shell expansion'

function refreshGraph(data) {
    if (!data) throw errors.invalidArg('data', data)
    var ev = new EventEmitter()
    var from = map(glob, data.log, data.transs)
    forwardEvents(ev, from, function graphMapped(errored, graph) {
        if (errored) return ev.emit('finish')
        data.graph = graph
        var rd = refreshData(data)
        forwardEvents(ev, rd, function () {
            ev.emit('finish', data)
        })
    })
    return ev
}

function refreshData(data) {
    var ev = new EventEmitter()
    var et = extractCliRefs(data)
    forwardEvents(ev, et, function cliRefGot(errored, files) {
        if (errored) return ev.emit('finish')
        try {
            data.files = sort(files)
            data.cmds = expandCmds(data.scope, data.recipes, data.graph.edges)
        } catch (err) {
            if (err.name === 'BindError' ||
                err.name === 'ParseError') return helpers.bailoutEv(ev, err)
            throw err
        }
        imprint(fs, data.files, data.cmds, function imprinted(err, imps) {
            if (err) return helpers.bailoutEv(ev, err)
            data.imps = imps
            data.edges = identify(data.log, data.files, imps)
            return ev.emit('finish', data)
        })
    })
    return ev
}

function extractCliRefs(data) {
    var ev = new EventEmitter()
    process.nextTick(function () {
        var files = []
        if (data.cliRefs.length === 0) {
            return ev.emit('finish', data.graph.files)
        }
        data.cliRefs.forEach(function (ref) {
            var err
            if (!(ref instanceof ast.Ref) || ref.isA(ast.Ref.ALIAS))
                throw errors.invalidArg('data', data)
            if (ref.isA(ast.Ref.PATH_GLOB)) {
                var newFiles = data.graph.getFilesByGlob(ref.value)
                if (newFiles.length === 0) {
                    err = new Error(util.format(NO_MATCH, ref.value))
                    return ev.emit('warning', err)
                }
                files = files.concat(newFiles)
                return
            }
            var newFile = data.graph.getFile(ref.value)
            if (newFile === null) {
                err = new Error(util.format(NO_SUCH_FILE, ref.value))
                return ev.emit('error', err)
            }
            files.push(newFile)
        })
        ev.emit('finish', files)
    })
    return ev
}
