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
var runEdges = require('../lib/update/run-edges')
var forwardEvents = require('../lib/forward-events')
var Output = require('./output')
var readData = require('./read-data')
var common = require('./common')
var helpers = require('./helpers')

function update(opts) {
    var ev = new EventEmitter()
    return forwardEvents(ev, readData(opts.file, common.LOG_PATH)
                       , function (errored, data) {
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

function updateGraph(data) {
    var ev = new EventEmitter()
    if (data.edges.length === 0) {
        console.log(common.EVERYTHING_UTD)
        process.nextTick(ev.emit.bind(ev, 'finish'))
        return ev
    }
    var st = {data: data, runCount: 0
            , dirs: {}, output: new Output()}
    var re = queuedFnOf(runEdge.bind(null, st), os.cpus().length)
    st.output.update(makeUpdateMessage(st))
    return forwardEvents(ev, runEdges(data.edges, re), function (errored) {
        st.output.endUpdate()
        if (!errored) console.log('Done.')
        ev.emit('finish')
    }, function () { st.output.endUpdate() })
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

function makeUpdateMessage(st, edge) {
    var perc = (st.runCount / st.data.edges.length)
    var label = edge? util.format('%s %s -> %s'
                          , edge.trans.ast.recipeName
                          , edge.inFiles.map(pathOf).join(' ')
                          , edge.outFiles.map(pathOf).join(' ')) : ''
    var message = util.format('Updating... %s%  %s'
                            , helpers.pad((perc * 100).toFixed(1), 5)
                            , label)
    return message
}

function pathOf(file) {
    return file.path
}
