'use strict';
module.exports = updateGraph

var fs = require('fs')
var mkdirp = require('mkdirp')
var util = require('util')
var os = require('os')
var path = require('path')
var mkdirp = require('mkdirp')
var exec = require('child_process').exec
var EventEmitter = require('events').EventEmitter
var queuedFnOf = require('../lib/queued-fn-of')
var runEdges = require('../lib/update/run-edges')
var forwardEvents = require('../lib/forward-events')
var Output = require('./output')
var common = require('./common')
var helpers = require('./helpers')

function updateGraph(data, opts) {
    if (!opts) opts = {}
    var ev = new EventEmitter()
    forwardEvents(ev, update(data, opts), function () {
        if (opts['dry-run']) return ev.emit('finish')
        mkdirp(path.dirname(common.LOG_PATH), function (err) {
            if (err) return helpers.bailoutEv(ev, err)
            var s = data.log.save(fs.createWriteStream(common.LOG_PATH))
            s.end(function () {
                ev.emit('finish')
            })
        })
    })
    return ev
}

function update(data, opts) {
    var ev = new EventEmitter()
    if (data.edges.length === 0) {
        console.log(common.EVERYTHING_UTD)
        process.nextTick(ev.emit.bind(ev, 'finish'))
        return ev
    }
    var st = {data: data, runCount: 0
            , dirs: {}, output: new Output(opts['dry-run'])}
    var reFn = opts['dry-run'] ? dryRunEdge : runEdge
    var re = queuedFnOf(reFn.bind(null, st), os.cpus().length)
    st.output.update(makeUpdateMessage(st, null, opts['dry-run']))
    var res = runEdges(data.edges, re)
    return forwardEvents(ev, res, function (errored) {
        st.output.endUpdate()
        if (!errored) console.log('Done.')
        ev.emit('finish')
    }, function () { st.output.endUpdate() })
}

function dryRunEdge(st, edge, cb) {
    process.nextTick(function () {
        st.runCount++
        st.output.update(makeUpdateMessage(st, edge, true))
        return cb(null)
    })
}

function runEdge(st, edge, cb) {
    var cmd = st.data.cmds[edge.index]
    mkEdgeDirs(st, edge, function (err) {
        if (err) return cb(err)
        exec(cmd, function (err, stdout, stderr) {
            if (!err) st.runCount++
            st.output.update(makeUpdateMessage(st, edge))
            if (stdout.length > 0 || stderr.length > 0) {
                st.output.endUpdate()
                process.stdout.write(stdout)
                process.stderr.write(stderr)
            }
            if (err)
                return cb(new Error(util.format('command failed: %s', cmd)))
            edge.outFiles.forEach(function (file) {
                st.data.log.update(file.path, st.data.imps[file.path])
            })
            return cb(null)
        })
    })
}

function mkEdgeDirs(st, edge, cb) {
    ;(function next(i) {
        if (i >= edge.outFiles.length) return cb(null)
        var file = edge.outFiles[i]
        var dir = path.dirname(file.path)
        if (st.dirs.hasOwnProperty(dir)) return next(i + 1)
        mkdirp(path.dirname(file.path), function (err) {
            if (err) return cb(err)
            st.dirs[dir] = true
            return next(i + 1)
        })
    })(0)
}

function makeUpdateMessage(st, edge, dryRun) {
    var perc = (st.runCount / st.data.edges.length)
    var label = edge ? util.format('%s %s -> %s'
                          , edge.trans.ast.recipeName
                          , edge.inFiles.map(pathOf).join(' ')
                          , edge.outFiles.map(pathOf).join(' ')) : ''
    var action = dryRun ? 'Would update' : 'Updating'
    var message = util.format('%s... %s%  %s', action
                            , helpers.pad((perc * 100).toFixed(1), 5)
                            , label)
    return message
}

function pathOf(file) {
    return file.path
}
