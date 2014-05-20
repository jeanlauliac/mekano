'use strict';
module.exports = update

var util = require('util')
var fs = require('fs')
var os = require('os')
var glob = require('glob')
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

var DEFAULT_PATHS = ['Neomakefile', 'neomakefile']
var LOG_PATH = '.mekano/log.json'
var NO_MAKEFILE = 'Neomakefile not found'

function update(opts, cb) {
    var ev = new EventEmitter()
    openSomeInput(opts.file, function (err, input, filePath) {
        if (err) return cb(err)
        updateInput(input, filePath, cb).on('error', function (err) {
            ev.emit('error', err)
        })
    })
    return ev
}

function openSomeInput(filePath, cb) {
    if (filePath === '-') return cb(null, process.stdin, '<stdin>')
    if (filePath) return openInput(filePath, cb)
    ;(function next(i) {
        if (i >= DEFAULT_PATHS.length) return cb(new Error(NO_MAKEFILE))
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

function updateInput(input, filePath, cb) {
    var ev = read(input, function (err, transs, unit) {
        if (err) {
            err.filePath = filePath
            err.message = util.format('%s: %s', filePath, err.message)
            return cb(err)
        }
        Log.fromStream(fs.createReadStream(LOG_PATH), function (err, log) {
            if (err) log = new Log()
            var scope = Scope.fromBinds(unit.binds)
            map(glob, log, transs, function (err, graph) {
                if (err) return cb(err)
                updateGraph(log, scope, unit.recipes, graph, function (err) {
                    log.save(fs.createWriteStream(LOG_PATH)).end(function () {
                        return cb(err)
                    })
                }).on('error', function (err) {
                    ev.emit('error', err)
                })
            })
        })
    })
    return ev
}

function updateGraph(log, scope, recipes, graph, cb) {
    var files = sort(graph.files)
    var cmds = expandCmds(scope, recipes, graph.edges)
    var ev = new EventEmitter()
    imprint(fs, files, cmds, function (err, imps) {
        if (err) return cb(err)
        var edges = identify(log, files, imps)
        if (edges.length === 0) {
            console.log('Everything is up to date.')
            return cb(null)
        }
        var st = {cmds: cmds, edges: edges, runCount: 0, log: log, imps: imps}
        var re = queuedFnOf(runEdge.bind(null, st), os.cpus().length)
        updateOutput(0, '')
        runEdges(edges, re, function (err) {
            console.log()
            if (err) return cb(err)
            console.log('Done.')
            return cb(null)
        }).on('error', function (err) { ev.emit('error', err) })
    })
    return ev
}

function runEdge(st, edge, cb) {
    var cmd = st.cmds[edge.index]
    setTimeout(function() {
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
    }, 250)
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
