'use strict';
module.exports = clean

var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')
var util = require('util')
var fs = require('fs')
var extractCliRefs = require('../lib/extract-cli-refs')
var mkdirp = require('mkdirp')
var helpers = require('../lib/helpers')
var path = require('path')

var DRY_REM = 'Would remove: %s'
var REM = 'Removing: %s'

function clean(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, opts.argv.remain)
    forwardEvents.noErr(ev, rg, function graphRead(data) {
        var ecr = extractCliRefs(data.graph, data.cliRefs)
        forwardEvents.noErr(ev, ecr, function refExtracted(files) {
            files = cleanSort(files, function (file) {
                return data.log.isGenerated(file.path)
            })
            var cf = cleanFiles(data, files, opts)
            forwardEvents(ev, cf, function cleaned() {
                if (opts['dry-run']) return ev.emit('finish')
                mkdirp(path.dirname(common.LOG_PATH), function (err) {
                    if (err) return helpers.bailoutEv(ev, err)
                    var s = data.log.save(fs.createWriteStream(common.LOG_PATH))
                    s.end(function () {
                        ev.emit('finish')
                    })
                })
            })
        })
    })
    return ev
}

function cleanFiles(data, files, opts) {
    var ev = new EventEmitter()
    if (files.length === 0)
        return alreadyClean(ev, data, opts)
    var unlink = opts['dry-run'] ? dryUnlink : fs.unlink
    var msgTpl = opts['dry-run'] ? DRY_REM : REM
    if (opts.robot) msgTpl = opts['dry-run'] ? 'wr %s' : ' r %s'
    ;(function next(i) {
        if (i === files.length) {
            if (opts['robot']) console.log(' D')
            else console.log('Done.')
            return ev.emit('finish')
        }
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

function alreadyClean(ev, data, opts) {
    if (opts['robot']) {
        console.log(' D')
    } else {
        if (data.cliRefs.length === 0) {
            console.log('Nothing to clean.')
        } else {
            var list = data.cliRefs.map(function (ref) {
                return ref.value
            }).join(', ')
            console.log(util.format('Those are clean: %s', list))
        }
    }
    process.nextTick(ev.emit.bind(ev, 'finish'))
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
