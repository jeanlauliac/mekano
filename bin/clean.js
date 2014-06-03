'use strict';
module.exports = clean

var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')

function clean(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    forwardEvents(ev, rg, function graphRead(errored, data) {
        if (errored) return ev.emit('finish')
        console.error('CAKE')
        ev.emit('finish')
    })
    return ev
}
