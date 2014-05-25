'use strict';
module.exports = update

var util = require('util')
var fs = require('fs')
var os = require('os')
var path = require('path')
var mkdirp = require('mkdirp')
var exec = require('child_process').exec
var EventEmitter = require('events').EventEmitter
var queuedFnOf = require('../lib/queued-fn-of')
var sort = require('../lib/update/sort')
var imprint = require('../lib/update/imprint')
var expandCmds = require('../lib/update/expand-cmds')
var identify = require('../lib/update/identify')
var runEdges = require('../lib/update/run-edges')
var forwardEvents = require('../lib/forward-events')
var Output = require('./output')
var readGraph = require('./read-graph')

var LOG_PATH = '.mekano/log.json'

function update(opts) {
    var ev = new EventEmitter()
    return forwardEvents(ev, readGraph(opts.file, LOG_PATH)
                       , function (errored, data) {
        if (errored) return ev.emit('finish')
        forwardEvents(ev, updateGraph(data), function graphUpdated() {
            var s = data.log.save(fs.createWriteStream(LOG_PATH))
            s.end(function () {
                ev.emit('finish')
            })
        })
    })
}

function updateGraph(data) {
    var files = sort(data.graph.files)
    var cmds = expandCmds(data.scope, data.recipes, data.graph.edges)
    var ev = new EventEmitter()
    imprint(fs, files, cmds, function (err, imps) {
        if (err) return bailoutEv(ev, err)
        var edges = identify(data.log, files, imps)
        if (edges.length === 0) {
            console.log('Everything is up to date.')
            return ev.emit('finish')
        }
        var st = {cmds: cmds, edges: edges, runCount: 0, log: data.log
                , imps: imps, dirs: {}, output: new Output()}
        var re = queuedFnOf(runEdge.bind(null, st), os.cpus().length)
        st.output.update(makeUpdateMessage(st))
        forwardEvents(ev, runEdges(edges, re), function (errored) {
            st.output.endUpdate()
            if (!errored) console.log('Done.')
            ev.emit('finish')
        }, function () { st.output.endUpdate() })
    })
    return ev
}

function runEdge(st, edge, cb) {
    var cmd = st.cmds[edge.index]
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
                st.log.update(file.path, st.imps[file.path])
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

function makeUpdateMessage(st, edge) {
    var perc = (st.runCount / st.edges.length)
    var label = edge? util.format('%s %s -> %s'
                          , edge.trans.ast.recipeName
                          , edge.inFiles.map(pathOf).join(' ')
                          , edge.outFiles.map(pathOf).join(' ')) : ''
    var message = util.format('Updating... %s%  %s'
                            , pad((perc * 100).toFixed(1), 5)
                            , label)
    return message
}

function pad(str, len) {
    while (str.length < len) str = ' ' + str
    return str
}

function bailoutEv(ev, err) {
    ev.emit('error', err)
    ev.emit('finish')
}

function pathOf(file) {
    return file.path
}
