'use strict';
module.exports = update

var util = require('util')
var fs = require('fs')
var os = require('os')
var glob = require('glob')
var path = require('path')
var mkdirp = require('mkdirp')
var exec = require('child_process').exec
var EventEmitter = require('events').EventEmitter
var read = require('../lib/read')
var queuedFnOf = require('../lib/queued-fn-of')
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var imprint = require('../lib/update/imprint')
var Log = require('../lib/update/log')
var expandCmds = require('../lib/update/expand-cmds')
var identify = require('../lib/update/identify')
var runEdges = require('../lib/update/run-edges')
var Scope = require('../lib/scope')
var forwardEvents = require('../lib/forward-events')
var Output = require('./output')

var DEFAULT_PATHS = ['Mekanofile', 'mekanofile']
var LOG_PATH = '.mekano/log.json'
var NO_MANIFEST_FILE = 'no such manifest file `%s\''
var NO_MANIFEST = 'Mekanofile not found'

function update(opts) {
    var ev = new EventEmitter()
    openSomeInput(opts.file, function (err, input, filePath) {
        if (err) return bailoutEv(ev, err)
        mkdirp('.mekano', function (err) {
            if (err) return bailoutEv(ev, err)
            forwardEvents(ev, updateInput(input, filePath))
        })
    })
    return ev
}

function openSomeInput(filePath, cb) {
    if (filePath === '-') return cb(null, process.stdin, '<stdin>')
    if (filePath) return openInput(filePath, cb)
    ;(function next(i) {
        if (i >= DEFAULT_PATHS.length) return cb(new Error(NO_MANIFEST))
        openInput(DEFAULT_PATHS[i], function (err, stream) {
            if (err) return next(i + 1)
            return cb(null, stream, DEFAULT_PATHS[i])
        })
    })(0)
}

function openInput(filePath, cb) {
    var stream = fs.createReadStream(filePath)
    stream.on('open', function () { return cb(null, stream, filePath) })
    stream.on('error', function (err) {
        if (err.code === 'ENOENT')
            err = new Error(util.format(NO_MANIFEST_FILE, filePath))
        return cb(err)
    })
}

function updateInput(input, filePath) {
    var ev = new EventEmitter()
    forwardEvents(ev, read(input), function transsReady(errored, transs, unit) {
        if (errored) return ev.emit('finish')
        forwardEvents(ev, updateTranss(transs, unit), function transsUpdated() {
            ev.emit('finish')
        })
    }, function (err) { err.filePath = filePath })
    return ev
}

function updateTranss(transs, unit) {
    var ev = new EventEmitter()
    var scope
    try { scope = Scope.fromBinds(unit.binds) }
    catch (err) {
        if (err.name !== 'BindError') throw err
        ev.emit('error', err)
        return ev.emit('finish')
    }
    getLog(function (err, log) {
        if (err) return bailoutEv(ev, err)
        if (err) log = new Log()
        var from = map(glob, log, transs)
        forwardEvents(ev, from, function graphMapped(errored, graph) {
            if (errored) return ev.emit('finish')
            var from = updateGraph(log, scope, unit.recipes, graph)
            forwardEvents(ev, from, function graphUpdated() {
                var s = log.save(fs.createWriteStream(LOG_PATH))
                s.end(function () {
                    ev.emit('finish')
                })
            })
        })
    })
    return ev
}

function getLog(cb) {
    Log.fromStream(fs.createReadStream(LOG_PATH), function (err, log) {
        if (err && err.code !== 'ENOENT') return cb(err)
        if (err) log = new Log()
        log.refresh(function (err) {
            return cb(err, log)
        })
    })
}

function updateGraph(log, scope, recipes, graph) {
    var files = sort(graph.files)
    var cmds = expandCmds(scope, recipes, graph.edges)
    var ev = new EventEmitter()
    imprint(fs, files, cmds, function (err, imps) {
        if (err) return bailoutEv(ev, err)
        var edges = identify(log, files, imps)
        if (edges.length === 0) {
            console.log('Everything is up to date.')
            return ev.emit('finish')
        }
        var st = {cmds: cmds, edges: edges, runCount: 0, log: log
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
