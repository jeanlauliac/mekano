'use strict';
module.exports = refreshGraph

var fs = require('fs')
var glob = require('glob')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var expandCmds = require('../lib/update/expand-cmds')
var imprint = require('../lib/update/imprint')
var identify = require('../lib/update/identify')
var forwardEvents = require('../lib/forward-events')
var helpers = require('./helpers')
var errors = require('../lib/errors')

var NO_MATCH = 'no file matches the pattern `%s\''

function refreshGraph(data, targets) {
    if (!data) throw errors.invalidArg('data', data)
    if (!(targets instanceof Array))
        throw errors.invalidArg('targets', targets)
    var ev = new EventEmitter()
    var from = map(glob, data.log, data.transs)
    forwardEvents(ev, from, function graphMapped(errored, graph) {
        if (errored) return ev.emit('finish')
        data.graph = graph
        var rd = refreshData(data, targets)
        forwardEvents(ev, rd, function () {
            ev.emit('finish', data)
        })
    })
    return ev
}

function refreshData(data, targets) {
    var ev = new EventEmitter()
    var et = extractTargets(data.graph, targets)
    forwardEvents(ev, et, function (errored, files) {
        data.targets = targets
        data.files = sort(files)
        data.cmds = expandCmds(data.scope, data.recipes, data.graph.edges)
        imprint(fs, data.files, data.cmds, function (err, imps) {
            if (err) return helpers.bailoutEv(ev, err)
            data.imps = imps
            data.edges = identify(data.log, data.files, imps)
            return ev.emit('finish', data)
        })
    })
    return ev
}

function extractTargets(graph, targets) {
    var ev = new EventEmitter()
    process.nextTick(function () {
        var files = []
        if (targets.length === 0) {
            return ev.emit.bind(ev, 'finish', graph.files)
        }
        targets.forEach(function (target) {
            if (typeof target !== 'string')
                throw errors.invalidArg('targets', targets)
            var newFiles = graph.getFilesByGlob(target)
            if (newFiles.length === 0) {
                var err = new Error(util.format(NO_MATCH, target))
                return ev.emit('warning', err)
            }
            files = files.concat(newFiles)
        })
        ev.emit('finish', files)
    })
    return ev
}
