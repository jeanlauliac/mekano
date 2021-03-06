'use strict';
module.exports = readGraph

var fs = require('fs')
var Log = require('../lib/update/log')
var EventEmitter = require('events').EventEmitter
var manifest = require('../lib/read/manifest')
var forwardEvents = require('../lib/forward-events')
var Scope = require('../lib/scope')
var helpers = require('../lib/helpers')
var refreshGraph = require('./refresh-graph')
var errors = require('../lib/errors')
var expandRefs = require('../lib/read/expand-refs')
var expandCliTokens = require('../lib//expand-cli-tokens')
var aliasFromArray = require('../lib/read/alias-from-array')

function readGraph(manifestPath, logPath, argv) {
    if (manifestPath && typeof manifestPath !== 'string')
        throw errors.invalidArg('manifestPath', manifestPath)
    if (typeof logPath !== 'string')
        throw errors.invalidArg('logPath', logPath)
    if (!(argv instanceof Array))
        throw errors.invalidArg('argv', argv)
    var ev = new EventEmitter()
    var ri = manifest.read(manifestPath)
    forwardEvents.noErr(ev, ri, function inputRead(data) {
        var cliRes = expandCliTokens(argv)
        data.cliScope = cliRes[0]
        var eax = aliasFromArray.bind(null, data.aliases)
        try { data.cliRefs = expandRefs(cliRes[1], eax) }
        catch (err) {
            if (err.name === 'ParseError') return helpers.bailoutEv(ev, err)
            throw err
        }
        var gg = getGraph(logPath, data)
        forwardEvents.noErr(ev, gg, function graphGot(data) {
            ev.emit('finish', data)
        }, function augmentError(err) { err.filePath = data.filePath })
    })
    return ev
}

function getGraph(logPath, data) {
    var ev = new EventEmitter()
    data.recipes = data.unit.recipes
    process.nextTick(function () {
        try { data.scope = Scope.fromBinds(data.unit.binds, data.cliScope) }
        catch (err) {
            if (err.name !== 'BindError') throw err
            return helpers.bailoutEv(ev, err)
        }
        getLog(logPath, function (err, log) {
            if (err) return helpers.bailoutEv(ev, err)
            data.log = log
            forwardEvents(ev, refreshGraph(data), function () {
                ev.emit('finish', data)
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
