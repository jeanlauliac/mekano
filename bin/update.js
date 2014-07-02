'use strict';
module.exports = update

var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')
var updateGraph = require('./update-graph')

function update(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    forwardEvents.noErr(ev, rg, function graphRead(data) {
        var ug = updateGraph(data, opts)
        forwardEvents(ev, ug, function graphUpdated(errored, signal) {
            ev.emit('finish', signal)
        })
    })
    return ev
}
