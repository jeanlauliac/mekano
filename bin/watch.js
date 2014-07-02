'use strict';
module.exports = watch

var path = require('path')
var gaze = require('gaze')
var debounce = require('debounce')
var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var refreshGraph = require('./refresh-graph')
var common = require('./common')
var helpers = require('../lib/helpers')
var updateGraph = require('./update-graph')

var DELAY_MS = 500

function watch(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    forwardEvents.noErr(ev, rg, function graphRead(data) {
        var ug = updateGraph(data, opts)
        forwardEvents(ev, ug, function graphUpdated() {
            forwardEvents(ev, watchAndUpdate(data, opts))
        })
    })
    return ev
}

function watchAndUpdate(data, opts) {
    var ev = new EventEmitter()
    var patterns = getSourcePatterns(data.transs)
    var truce = false
    var gz
    var update = debounce(function () {
        truce = true
        forwardEvents(ev, refreshGraph(data), function(errored) {
            if (errored) {
                truce = false
                return
            }
            forwardEvents(ev, updateGraph(data), function (errored, signal) {
                if (signal && signal !== 'SIGINT') {
                    gz.close()
                    return ev.emit('finish', signal)
                }
                truce = false
            })
        })
    }, DELAY_MS)
    gz = gaze(patterns, function (err) {
        if (err) return helpers.bailoutEv(ev, err)
        if (!opts.robot) console.error('Watching...')
        this.on('all', function (event, filePath) {
            if (truce) return
            truce = true
            console.log(path.relative('.', filePath) + ' was ' + event)
            update()
        })
    })
    return ev
}

function getSourcePatterns(transs) {
    var patterns = []
    transs.forEach(function (trans) {
        trans.prereqs.forEach(function (ref) {
            patterns.push(ref.value)
        })
    })
    return patterns
}
