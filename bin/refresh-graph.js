'use strict';
module.exports = refreshGraph

var fs = require('fs')
var glob = require('glob')
var EventEmitter = require('events').EventEmitter
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var expandCmds = require('../lib/update/expand-cmds')
var imprint = require('../lib/update/imprint')
var identify = require('../lib/update/identify')
var forwardEvents = require('../lib/forward-events')
var helpers = require('../lib/helpers')
var errors = require('../lib/errors')
var extractCliRefs = require('../lib/extract-cli-refs')

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
    var et = extractCliRefs(data.graph, data.cliRefs)
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
