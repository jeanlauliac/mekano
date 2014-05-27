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
var helpers = require('./helpers')

function refreshGraph(data) {
    var ev = new EventEmitter()
    var from = map(glob, data.log, data.transs)
    forwardEvents(ev, from, function graphMapped(errored, graph) {
        if (errored) return ev.emit('finish')
        data.graph = graph
        refreshData(data, function (err) {
            if (err) return helpers.bailoutEv(ev, err)
            ev.emit('finish', data)
        })
    })
    return ev
}

function refreshData(data, cb) {
    data.files = sort(data.graph.files)
    data.cmds = expandCmds(data.scope, data.recipes, data.graph.edges)
    imprint(fs, data.files, data.cmds, function (err, imps) {
        if (err) return cb(err)
        data.imps = imps
        data.edges = identify(data.log, data.files, imps)
        return cb(null, data)
    })
}
