'use strict';
module.exports = readGraph

var fs = require('fs')
var Log = require('../lib/update/log')
var EventEmitter = require('events').EventEmitter
var readInput = require('./read-input')
var forwardEvents = require('../lib/forward-events')
var Scope = require('../lib/scope')
var helpers = require('./helpers')
var refreshGraph = require('./refresh-graph')
var errors = require('../lib/errors')

function readGraph(manifestPath, logPath, targets) {
    if (manifestPath && typeof manifestPath !== 'string')
        throw errors.invalidArg('manifestPath', manifestPath)
    if (typeof logPath !== 'string')
        throw errors.invalidArg('logPath', logPath)
    if (!(targets instanceof Array))
        throw errors.invalidArg('targets', targets)
    var ev = new EventEmitter()
    var ri = readInput.readInput(manifestPath)
    forwardEvents(ev, ri, function inputRead(errored, filePath, transs, unit) {
        if (errored) return ev.emit('finish')
        var gg = getGraph(logPath, transs, unit, targets)
        forwardEvents(ev, gg, function graphGot(errored, data) {
            if (errored) return ev.emit('finish')
            ev.emit('finish', data)
        }, function augmentError(err) { err.filePath = filePath })
    })
    return ev
}

function getGraph(logPath, transs, unit, targets) {
    var ev = new EventEmitter()
    var data = {recipes: unit.recipes, transs: transs}
    try { data.scope = Scope.fromBinds(unit.binds) }
    catch (err) {
        if (err.name !== 'BindError') throw err
        ev.emit('error', err)
        return ev.emit('finish')
    }
    getLog(logPath, function (err, log) {
        if (err) return helpers.bailoutEv(ev, err)
        data.log = log
        forwardEvents(ev, refreshGraph(data, targets), function () {
            ev.emit('finish', data)
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
