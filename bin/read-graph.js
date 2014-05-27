'use strict';
module.exports = readGraph

var fs = require('fs')
var glob = require('glob')
var EventEmitter = require('events').EventEmitter
var Log = require('../lib/update/log')
var readInput = require('./read-input')
var forwardEvents = require('../lib/forward-events')
var map = require('../lib/graph/map')
var Scope = require('../lib/scope')
var helpers = require('./helpers')

function readGraph(manifestPath, logPath) {
    var ev = new EventEmitter()
    var ri = readInput.readInput(manifestPath)
    forwardEvents(ev, ri, function inputRead(errored, filePath, transs, unit) {
        if (errored) return ev.emit('finish')
        var gg = getGraph(logPath, transs, unit)
        forwardEvents(ev, gg, function graphGot(errored, data) {
            if (errored) return ev.emit('finish')
            ev.emit('finish', data)
        }, function augmentError(err) { err.filePath = filePath })
    })
    return ev
}

function getGraph(logPath, transs, unit) {
    var ev = new EventEmitter()
    var scope
    try { scope = Scope.fromBinds(unit.binds) }
    catch (err) {
        if (err.name !== 'BindError') throw err
        ev.emit('error', err)
        return ev.emit('finish')
    }
    getLog(logPath, function (err, log) {
        if (err) return helpers.bailoutEv(ev, err)
        var from = map(glob, log, transs)
        forwardEvents(ev, from, function graphMapped(errored, graph) {
            if (errored) return ev.emit('finish')
            ev.emit('finish', {
                log: log, scope: scope, recipes: unit.recipes, graph: graph
            })
        })
    })
    return ev
}

function getLog(logPath, cb) {
    Log.fromStream(fs.createReadStream(logPath), function (err, log) {
        if (err && err.code !== 'ENOENT') return cb(err)
        if (err) log = new Log()
        log.refresh(function (err) {
            return cb(err, log)
        })
    })
}
