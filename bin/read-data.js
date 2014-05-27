'use strict';
module.exports = readData

var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var readGraph = require('./read-graph')
var forwardEvents = require('../lib/forward-events')
var sort = require('../lib/update/sort')
var expandCmds = require('../lib/update/expand-cmds')
var imprint = require('../lib/update/imprint')
var identify = require('../lib/update/identify')
var helpers = require('./helpers')

function readData(manifestPath, logPath) {
    var ev = new EventEmitter()
    var rg = readGraph(manifestPath, logPath)
    return forwardEvents(ev, rg, function (errored, data) {
        if (errored) return ev.emit('finish')
        data.files = sort(data.graph.files)
        data.cmds = expandCmds(data.scope, data.recipes, data.graph.edges)
        imprint(fs, data.files, data.cmds, function (err, imps) {
            if (err) return helpers.bailoutEv(ev, err)
            data.imps = imps
            data.edges = identify(data.log, data.files, imps)
            return ev.emit('finish', data)
        })
    })
}
