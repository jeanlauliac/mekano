'use strict';
module.exports = updateGraph

var fs = require('fs')
var mkdirp = require('mkdirp')
var util = require('util')
var os = require('os')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var runEdges = require('../lib/update/run-edges')
var EdgeRunner = require('../lib/update/edge-runner')
var forwardEvents = require('../lib/forward-events')
var Output = require('./output')
var common = require('./common')
var helpers = require('../lib/helpers')
var errors = require('../lib/errors')

var SOME_UTD = 'Those are already up-to-date: %s'
var DRY_REM_ORPHAN = 'Would remove orphan: %s'
var REM_ORPHAN = 'Removing orphan: %s'

var SIGS = ['SIGINT', 'SIGHUP', 'SIGTERM', 'SIGQUIT']

function updateGraph(data, opts) {
    if (!data) throw errors.invalidArg('data', data)
    if (!opts) opts = {}
    return new UpdateGraphTask(data, opts)
}

util.inherits(UpdateGraphTask, EventEmitter)
function UpdateGraphTask(data, opts) {
    this._data = data
    this._dryRun = opts['dry-run'] || false
    this._robot = opts['robot'] || false
    this._shy = opts['shy'] || false
    this._edgeRunner = new EdgeRunner(data.cmds, this._getEdgeRunnerOpts())
    this._runCount = 0
    this._output = new Output(this._dryRun)
    var self = this
    unlinkOrphans(data, opts, function (err) {
        if (err) return helpers.bailoutEv(self, err)
        self._safeUpdate()
    })
}

UpdateGraphTask.prototype._getEdgeRunnerOpts = function () {
    if (!this._dryRun) return null
    return {exec: this._dryExec.bind(this), mkdirP: dryMkdirP.bind(null)}
}

UpdateGraphTask.prototype._safeUpdate = function () {
    var self = this
    var sigInfo = registerSigs(function onSignal(signal) {
        if (signal !== 'SIGINT') self._runEdges.abort(signal)
        self._edgeRunner.abort(signal)
    })
    this._update(function (errored, signal) {
        unregisterSigs(sigInfo)
        if (self._dryRun) return self.emit('finish')
        self._finalize(signal)
    })
}

UpdateGraphTask.prototype._finalize = function (signal) {
    var self = this
    mkdirp(path.dirname(common.LOG_PATH), function (err) {
        if (err) return helpers.bailoutEv(self, err)
        var s = self._data.log.save(fs.createWriteStream(common.LOG_PATH))
        s.end(function () {
            self.emit('finish', signal)
        })
    })
}

UpdateGraphTask.prototype._update = function (cb) {
    if (this._robot) console.log(' e %d', this._data.edges.length)
    if (this._data.edges.length === 0) return this._alreadyUpToDate()
    if (this._robot) this._updateMessage = this._updateRobotMessage
    var reFn = this._runEdge.bind(this)
    var reOpts = {concurrency: os.cpus().length, shy: this._shy}
    this._updateMessage(null)
    var self = this
    var res = runEdges(this._data.edges, reFn, reOpts)
    forwardEvents(this, res, function (errored, signal) {
        if (!errored) {
            self._updateMessage(null)
        }
        self._output.endUpdate()
        cb(errored, signal)
    }, function () { self._output.endUpdate() })
}

UpdateGraphTask.prototype._runEdge = function (edge, cb) {
    var self = this
    this._edgeRunner.run(edge, function (err, stdout, stderr) {
        var res = {err: err, stdout: stdout, stderr: stderr}
        self._doneRunEdge(edge, res, cb)
    })
}

UpdateGraphTask.prototype._doneRunEdge = function (edge, res, cb) {
    this._updateMessage(edge)
    if (res.stdout.length > 0 || res.stderr.length > 0) {
        this._output.endUpdate()
        process.stdout.write(res.stdout)
        process.stderr.write(res.stderr)
    }
    if (res.err) return cb(res.err)
    this._runCount++
    var self = this
    edge.outFiles.forEach(function (file) {
        self._data.log.update(file.path, self._data.imps[file.path])
    })
    return cb(null)
}

UpdateGraphTask.prototype._alreadyUpToDate = function () {
    if (!this._robot) {
        if (this._data.cliRefs.length === 0) {
            console.log(common.EVERYTHING_UTD)
        } else {
            var list = this._data.cliRefs.map(function (ref) {
                return ref.value
            }).join(', ')
            console.log(util.format(SOME_UTD, list))
        }
    }
    process.nextTick(this.emit.bind(this, 'finish'))
}

UpdateGraphTask.prototype._updateRobotMessage = function (edge) {
    if (!edge) return
    var name = edge.trans.ast.recipeName
    var inFiles = edge.inFiles.map(pathOf).join(' ')
    var outFiles = edge.outFiles.map(pathOf).join(' ')
    var modifier = this._dryRun ? 'w' : ' '
    var message = util.format('%sU %d %s %s -- %s', modifier, this._runCount
                            , name, inFiles, outFiles)
    console.log(message)
}

UpdateGraphTask.prototype._updateMessage = function (edge) {
    var perc = (this._runCount / this._data.edges.length)
    var label
    if (edge) {
        var name = edge.trans.ast.recipeName
        var inFiles = edge.inFiles.map(pathOf).join(' ')
        var outFiles = edge.outFiles.map(pathOf).join(' ')
        label = util.format('%s %s -> %s', name, inFiles, outFiles)
    } else if (this._runCount === this._data.edges.length) {
        label = 'Done.'
    } else {
        label = 'Updating...'
    }
    var percStr = helpers.pad((perc * 100).toFixed(1), 5)
    var message = util.format('[%s%] %s', percStr, label)
    this._output.update(message)
}


UpdateGraphTask.prototype._dryExec = function (cmd, opts, cb) {
    if (!cb) {
        cb = opts
        opts = {}
    }
    var tpl = this._robot ? 'wR %s\n' : 'would run: %s\n'
    var stdout = util.format(tpl, cmd)
    process.nextTick(cb.bind(null, null, stdout, ''))
}

function dryMkdirP(dir, opts, cb) {
    if (!cb) {
        cb = opts
        opts = {}
    }
    process.nextTick(cb.bind(null, null))
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
        if (!opts.robot)
            console.log(util.format(msgTpl, orphans[i]))
        unlink(orphans[i], function (err) {
            if (err) return cb(err)
            data.log.forget(orphans[i])
            return next(i + 1)
        })
    })(0)
}

function dryUnlink(filePath, cb) {
    setImmediate(cb.bind(null, null))
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

function pathOf(file) {
    return file.path
}
