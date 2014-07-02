'use strict';
module.exports = status

var EventEmitter = require('events').EventEmitter
var readGraph = require('./read-graph')
var common = require('./common')
var forwardEvents = require('../lib/forward-events')

function status(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    return forwardEvents.noErr(ev, rg, function (data) {
        showStatus(data)
        ev.emit('finish')
    })
}

function showStatus(data) {
    if (data.edges.length === 0) {
        return console.log(common.EVERYTHING_UTD)
    }
    var files = {}
    data.files.forEach(function (file) {
        if (file.inEdge === null) return
        if (!data.log.isGenerated(file.path)) {
            files[file.path] = 2
        } else if (!data.log.isUpToDate(file.path, data.imps[file.path])) {
            files[file.path] = 1
        }
    })
    console.log('Files to be generated:\n')
    for (var path in files) {
        if (!files.hasOwnProperty(path)) continue
        var label = files[path] === 1 ? 'dirty:   ' : 'missing: '
        console.log('    %s %s', label, path)
    }
    console.log()
}
