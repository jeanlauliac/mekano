'use strict';
module.exports = clean

var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')
var util = require('util')
var fs = require('fs')
var extractCliRefs = require('./extract-cli-refs')

var DRY_REM = 'Would remove: %s'
var REM = 'Removing: %s'

function clean(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    forwardEvents(ev, rg, function graphRead(errored, data) {
        if (errored) return ev.emit('finish')
        var ecr = extractCliRefs(data.graph, data.cliRefs)
        forwardEvents(ev, ecr, function refExtracted(errored, files) {
            if (errored) return ev.emit('finish')
            files = cleanSort(files, function (file) {
                return data.log.isGenerated(file.path)
            })
            forwardEvents(ev, cleanFiles(data, files, opts))
        })
    })
    return ev
}

function cleanFiles(data, files, opts) {
    var ev = new EventEmitter()
    if (files.length === 0) {
        if (!opts.robot) console.log('Nothing to clean.')
        return process.nextTick(ev.emit.bind(ev, 'finish'))
    }
    var unlink = opts['dry-run'] ? dryUnlink : fs.unlink
    var msgTpl = opts['dry-run'] ? DRY_REM : REM
    ;(function next(i) {
        if (i === files.length) return ev.emit('finish')
        if (!opts.robot)
            console.log(util.format(msgTpl, files[i].path))
        unlink(files[i].path, function (err) {
            if (err) {
                ev.emit('error', err)
                return next(i + 1)
            }
            data.log.forget(files[i].path)
            return next(i + 1)
        })
    })(0)
    return ev
}

function dryUnlink(filePath, cb) {
    setImmediate(cb.bind(null, null))
}

function cleanSort(targets, iter) {
    var st = {marks: {}, stack: [], list: [], iter: iter}
    for (var i = 0; i < targets.length; ++i)
        cleanVisit(st, targets[i])
    return st.list
}

function cleanVisit(st, target) {
    var marks = st.marks
    if (marks.hasOwnProperty(target.path)) {
        if (!marks[target.path].visiting) return
        throw new Error('cycle errors should not happen here')
    }
    var mark = marks[target.path] = {
        file: target, visiting: true, index: st.stack.length
    }
    st.stack.push(target)
    target.outEdges.forEach(function (outEdge) {
        outEdge.outFiles.forEach(function (outFile) {
            cleanVisit(st, outFile)
        })
    })
    st.stack.pop()
    if (st.iter(target)) st.list.push(target)
    mark.visiting = false
}
