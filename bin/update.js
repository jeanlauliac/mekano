'use strict';
module.exports = update

var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')
var helpers = require('./helpers')
var updateGraph = require('./update-graph')

function update(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH)
    return forwardEvents(ev, rg, function (errored, data) {
        if (errored) return ev.emit('finish')
        forwardEvents(ev, updateGraph(data), function graphUpdated() {
            mkdirp(path.dirname(common.LOG_PATH), function (err) {
                if (err) return helpers.bailoutEv(ev, err)
                var s = data.log.save(fs.createWriteStream(common.LOG_PATH))
                s.end(function () {
                    ev.emit('finish')
                })
            })
        })
    })
}
