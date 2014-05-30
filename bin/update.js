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
    forwardEvents(ev, rg, function graphRead(errored, data) {
        if (errored) return ev.emit('finish')
        var ug = updateGraph(data, opts)
        forwardEvents(ev, ug, function graphUpdated() {
            ev.emit('finish')
        })
    })
    return ev
}
