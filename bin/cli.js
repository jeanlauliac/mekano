#!/usr/bin/env node
'use strict';

var nopt = require('nopt')
var abbrev = require('abbrev')
var util = require('util')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter

var KNOWN_OPTS = {
    'dry-run': Boolean, 'file': String, 'silent': Boolean, 'robot': Boolean
  , 'force': Boolean, 'version': Boolean, 'shy': Boolean
}

var SHORTHANDS = {
    'f': ['--file'], 'n': ['--dry-run'], 's': ['--silent']
  , 'F': ['--force'], 'v': ['--version'], 'y': ['--shy'], 'r': ['--robot']
}

function main() {
    if (process.getuid && process.getuid() === 0) return noRoot()
    var opts = nopt(KNOWN_OPTS, SHORTHANDS)
    if (opts.version) return version()
    if (opts.argv.remain.length === 0) opts.argv.remain.push('help')
    var cmdAbbr = opts.argv.remain.shift()
    var command = COMMANDS[cmdAbbr]
    if (!command) {
        console.error(util.format('unknow command `%s\'', cmdAbbr))
        return 1
    }
    process.stdout.on('error', function (err) {
        if (err.code !== 'EPIPE') throw err
    })
    var ev = Commands[command](opts)
    var errored = false
    var finished = false
    ev.on('error', function (err) {
        log('error', err)
        errored = true
    }).on('warning', function (err) {
        log('warning', err)
    }).on('finish', function (signal) {
        finished = true
        if (signal) return process.kill(process.pid, signal)
        if (errored) return process.exit(1)
        process.exit(0)
    })
    process.on('exit', function () {
        if (!finished)
            throw new Error('finish event not called; this is a bug!')
    })
}

function log(type, err) {
    var str = ''
    if (err.filePath) {
        str += err.filePath + ':'
        if (err.location) str += err.location + ':'
        else str += ' '
    }
    str += type + ': '
    str += err.message
    console.error(str)
}

var Commands = {}
Commands.update = require('./update')
Commands.watch = require('./watch')
Commands.status = require('./status')
Commands.aliases = require('./aliases')
Commands.clean = require('./clean')
Commands.print = require('./print')

Commands.help = function () {
    var ev = new EventEmitter()
    var f = fs.createReadStream(path.join(__dirname, 'help'), 'utf8')
    f.pipe(process.stderr)
    f.on('end', function () { ev.emit('finish') })
    return ev
}

var COMMANDS = getCommandAbbrev()

function getCommandAbbrev() {
    var cmds = []
    for (var command in Commands) {
        cmds.push(command)
    }
    return abbrev(cmds)
}

function noRoot() {
    console.error('error: cowardly refusing to execute as root')
    console.error('error: bugs in the tool or recipes could cause grave losses')
    process.exit(9)
}

function version() {
    console.log(require('../package').version)
}

main()
