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
var errors = require('../lib/errors')

var SOME_UTD = 'Those are already up-to-date: %s.'
var CMD_FAIL = 'command failed, code %d: %s'
var CMD_SIGFAIL = 'command failed, signal %s: %s'
var DRY_REM_ORPHAN = 'Would remove orphan `%s\'.'
var REM_ORPHAN = 'Removing orphan `%s\'.'

var SIGS = ['SIGINT', 'SIGHUP', 'SIGTERM', 'SIGQUIT']

function updateGraph(data, opts) {
    if (!opts) opts = {}
    var ev = new EventEmitter()
    unlinkOrphans(data, opts, function (err) {
        if (err) return helpers.bailoutEv(ev, err)
        var uev = update(data, opts)
        var sigInfo = registerSigs(function onSignal(signal) {
            uev.emit('signal', signal)
        })
        forwardEvents(ev, uev, function () {
            unregisterSigs(sigInfo)
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
    return ev
}

function update(data, opts) {
    var res
    var ev = new EventEmitter()
    if (opts['robot']) console.log(' e %d', data.edges.length)
    if (data.edges.length === 0) return alreadyUpToDate(ev, data, opts)
    var st = {data: data, runCount: 0, opts: opts
            , sigints: {}, stopFns: {}
            , dirs: {}, output: new Output(opts['dry-run'])}
    st.updateMessage = opts['robot'] ? updateRobotMessage : updateMessage
    var reFn = opts['dry-run'] ? dryRunEdge : runEdge
    var re = queuedFnOf(reFn.bind(null, st), os.cpus().length)
    st.updateMessage(st, null)
    res = runEdges(data.edges, re)
    ev.on('signal', function (signal) {
        if (signal !== 'SIGINT') {
            res.emit('signal', signal)
            for (var j in st.stopFns) st.stopFns[j]()
            return
        }
        for (var i in st.sigints) st.sigints[i] = true
    })
    return forwardEvents(ev, res, function (errored) {
        st.output.endUpdate()
        if (!errored) {
            if (opts['robot']) console.log(' D')
            else console.log('Done.')
        }
        ev.emit('finish')
    }, function () { st.output.endUpdate() })
}

function runEdge(st, edge, cb) {
    st.sigints[edge.index] = false
    var cmd = st.data.cmds[edge.index]
    mkEdgeDirs(st, edge, function (err) {
        if (err) return cb(err)
        var stopped = false
        exec(cmd, function (err, stdout, stderr) {
            if (stopped) return
            delete st.stopFns[edge.index]
            var sigint = st.sigints[edge.index]
            delete st.sigints[edge.index]
            if (!err) st.runCount++
            st.updateMessage(st, edge)
            if (stdout.length > 0 || stderr.length > 0) {
                st.output.endUpdate()
                process.stdout.write(stdout)
                process.stderr.write(stderr)
            }
            if (err) {
                var message
                if (err.code) message = util.format(CMD_FAIL, err.code, cmd)
                else message = util.format(CMD_SIGFAIL, err.signal, cmd)
                var nerr = new Error(message)
                if (err.signal === 'SIGINT' && sigint)
                    nerr.signal = 'SIGINT'
                return cb(nerr)
            }
            edge.outFiles.forEach(function (file) {
                st.data.log.update(file.path, st.data.imps[file.path])
            })
            return cb(null)
        })
        st.stopFns[edge.index] = function stopRunEdge () {
            delete st.stopFns[edge.index]
            stopped = true
            st.updateMessage(st, edge)
            return cb(new Error('aborting, recipe process will detach'))
        }
    })
}

function dryRunEdge(st, edge, cb) {
    process.nextTick(function () {
        st.runCount++
        st.updateMessage(st, edge)
        return cb(null)
    })
}

function unlinkOrphans(data, opts, cb) {
    if (typeof cb !== 'function') throw errors.invalidArg('cb', cb)
    var orphans = data.log.getPaths().filter(function (filePath) {
        var file = data.graph.getFile(filePath)
        return file === null
    })
    if (orphans.length === 0) return process.nextTick(cb.bind(null, null))
    var unlink = opts['dry-run'] ? dryUnlink : fs.unlink
    var msgTpl = opts['dry-run'] ? DRY_REM_ORPHAN : REM_ORPHAN
    ;(function next(i) {
        if (i === orphans.length) return cb(null)
        unlink(orphans[i], function (err) {
            if (err) return cb(err)
            if (!opts.robot)
                console.log(util.format(msgTpl, orphans[i]))
            data.log.forget(orphans[i])
            return next(i + 1)
        })
    })(0)
}

function dryUnlink(filePath, cb) {
    setImmediate(cb.bind(null, null))
}

function alreadyUpToDate(ev, data, opts) {
    if (opts['robot']) {
        console.log(' D')
    } else {
        if (data.cliRefs.length === 0) {
            console.log(common.EVERYTHING_UTD)
        } else {
            var list = data.cliRefs.map(function (ref) {
                return ref.value
            }).join(', ')
            console.log(util.format(SOME_UTD, list))
        }
    }
    process.nextTick(ev.emit.bind(ev, 'finish'))
    return ev
}

function registerSigs(fn) {
    var info = {sigs: {}}
    SIGS.forEach(function (sig) {
        var bfn = info.sigs[sig] = fn.bind(null, sig)
        process.on(sig, bfn)
    })
    return info
}

function unregisterSigs(info) {
    SIGS.forEach(function (sig) {
        process.removeListener(sig, info.sigs[sig])
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

function updateRobotMessage(st, edge) {
    if (!edge) return
    var name = edge.trans.ast.recipeName
    var inFiles = edge.inFiles.map(pathOf).join(' ')
    var outFiles = edge.outFiles.map(pathOf).join(' ')
    var modifier = st.opts['dry-run'] ? 'w' : ' '
    var message = util.format('%sU %d %s %s -- %s', modifier, st.runCount
                            , name, inFiles, outFiles)
    console.log(message)
}

function updateMessage(st, edge) {
    var perc = (st.runCount / st.data.edges.length)
    var label = ''
    if (edge) {
        var name = edge.trans.ast.recipeName
        var inFiles = edge.inFiles.map(pathOf).join(' ')
        var outFiles = edge.outFiles.map(pathOf).join(' ')
        label = util.format('%s %s -> %s', name, inFiles, outFiles)
    }
    var action = st.opts['dry-run'] ? 'Would update' : 'Updating'
    var percStr = helpers.pad((perc * 100).toFixed(1), 5)
    var message = util.format('%s... %s%  %s', action, percStr, label)
    st.output.update(message)
}

function pathOf(file) {
    return file.path
}
