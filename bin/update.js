'use strict';
module.exports = update

var util = require('util')
var fs = require('fs')
var os = require('os')
var glob = require('glob')
var path = require('path')
var mkdirp = require('mkdirp')
var readline = require('readline')
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

var DEFAULT_PATHS = ['Mekanofile', 'mekanofile']
var LOG_PATH = '.mekano/log.json'
var NO_MANIFEST = 'Mekanofile not found'

function update(opts) {
    var ev = new EventEmitter()
    openSomeInput(opts.file, function (err, input, filePath) {
        if (err) {
            ev.emit('error', err)
            ev.emit('finish')
        }
        mkdirp('.mekano', function (err) {
            if (err) {
                ev.emit('error', err)
                ev.emit('finish')
            }
            updateInput(input, filePath).on('error', function (err) {
                ev.emit('error', err)
            }).on('warning', function (err) {
                ev.emit('warning', err)
            }).on('finish', function () {
                ev.emit('finish')
            })
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
    stream.on('error', function (err) { return cb(err) })
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
    Log.fromStream(fs.createReadStream(LOG_PATH), function (err, log) {
        if (err) log = new Log()
        var scope
        try { scope = Scope.fromBinds(unit.binds) }
        catch (err) {
            if (err.name !== 'BindError') throw err
            ev.emit('error', err)
            return ev.emit('finish')
        }
        var errored = false
        map(glob, log, transs).on('error', function (err) {
            ev.emit('error', err)
            errored = true
        }).on('finish', function (graph) {
            if (errored) return ev.emit('finish')
            var errored2 = false
            updateGraph(log, scope, unit.recipes, graph)
                .on('error', function (err) {
                    ev.emit('error', err)
                    errored2 = true
                }).on('finish', function () {
                    log.save(fs.createWriteStream(LOG_PATH))
                        .end(function () {
                            ev.emit('finish')
                        })
                })
        })
    })
    return ev
}

function updateGraph(log, scope, recipes, graph) {
    var files = sort(graph.files)
    var cmds = expandCmds(scope, recipes, graph.edges)
    var ev = new EventEmitter()
    imprint(fs, files, cmds, function (err, imps) {
        if (err) { ev.emit('error', err); return ev.emit('finish') }
        var edges = identify(log, files, imps)
        if (edges.length === 0) {
            console.log('Everything is up to date.')
            return ev.emit('finish')
        }
        var st = {cmds: cmds, edges: edges, runCount: 0, log: log
                , imps: imps, dirs: {}}
        var re = queuedFnOf(runEdge.bind(null, st), os.cpus().length)
        updateOutput(0, '')
        var errored = false
        runEdges(edges, re).on('finish', function () {
            console.log()
            if (!errored) console.log('Done.')
            ev.emit('finish')
        }).on('error', function (err) {
            console.log()
            errored = true
            ev.emit('error', err)
        })
    })
    return ev
}

function runEdge(st, edge, cb) {
    var cmd = st.cmds[edge.index]
    mkEdgeDirs(st, edge, function (err) {
        if (err) return cb(err)
        exec(cmd, function (err, stdout, stderr) {
            if (!err) st.runCount++
            var perc = (st.runCount / st.edges.length)
            readline.clearLine(process.stdout, 0)
            readline.cursorTo(process.stdout, 0)
            updateOutput(perc, util.format('%s %s -> %s'
              , edge.trans.ast.recipeName
              , edge.inFiles.map(pathOf).join(' ')
              , edge.outFiles.map(pathOf).join(' ')))
            if (stdout.length > 0 || stderr.length > 0) {
                process.stdout.write('\n')
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

function updateOutput(perc, label) {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(util.format('%s %s%  %s'
      , 'Updating...'
      , pad((perc * 100).toFixed(1), 5)
      , label), 'utf8')
}

function pad(str, len) {
    while (str.length < len) str = ' ' + str
    return str
}

function makePercBar(perc, len) {
    var str = '|'
    var i = 0
    for (; i < len && perc > i / len; ++i)
        str += '='
    for (; i < len; ++i)
        str += ' '
    return str + '|'
}

function pathOf(file) {
    return file.path
}
