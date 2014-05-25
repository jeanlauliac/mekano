'use strict';
module.exports = status

var EventEmitter = require('events').EventEmitter
var readData = require('./read-data')
var common = require('./common')
var forwardEvents = require('../lib/forward-events')

function status(opts) {
    var ev = new EventEmitter()
    return forwardEvents(ev, readData(opts.file, common.LOG_PATH)
                       , function (errored, data) {
        if (errored) return ev.emit('finish')
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
