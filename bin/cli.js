#!/usr/bin/env node
'use strict';

var nopt = require('nopt')
var abbrev = require('abbrev')
var util = require('util')
var fs = require('fs')
var path = require('path')
var EventEmitter = require('events').EventEmitter

var KNOWN_OPTS = {
    'dry-run': Boolean, 'file': String, 'silent': Boolean
  , 'force': Boolean, 'version': Boolean
}

var SHORTHANDS = {
    'f': ['--file'], 'n': ['--dry-run'], 's': ['--silent']
  , 'F': ['--force'], 'v': ['--version']
}

var COMMANDS = abbrev([
    'update', 'status', 'clean', 'aliases', 'trace', 'help'
])

function main() {
    var opts = nopt(KNOWN_OPTS, SHORTHANDS)
    if (opts.argv.remain.length === 0) opts.argv.remain.push('help')
    var cmdAbbr = opts.argv.remain.shift()
    var command = COMMANDS[cmdAbbr]
    if (!command) {
        console.error(util.format('unknow command `%s\'', cmdAbbr))
        return 1
    }
    var ev = Commands[command](opts)
    var errored = false
    var finished = false
    ev.on('error', function (err) {
        log('error', err)
        errored = true
    }).on('warning', function (err) {
        log('warning', err)
    }).on('finish', function () {
        finished = true
        if (errored)
            process.exit(1)
        process.exit(0)
    })
    process.on('exit', function () {
        if (!finished)
            throw new Error('finish event not called; this is a bug!')
    })
}

function log(type, err) {
    var str = ''
    if (err.filePath && err.location)
        str += util.format('%s:%s: ', err.filePath, err.location)
    str += type + ': '
    str += err.message
    console.error(str)
}

var Commands = {}
Commands.update = require('./update')
Commands.status = require('./status')

Commands.clean = function () {
    
}

Commands.aliases = function () {

}

Commands.trace = function () {

}

Commands.help = function () {
    var ev = new EventEmitter()
    var f = fs.createReadStream(path.join(__dirname, 'help'), 'utf8')
    f.pipe(process.stderr)
    f.on('end', function () { ev.emit('finish') })
    return ev
}

main()
