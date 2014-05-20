#!/usr/bin/env node
'use strict';

var nopt = require('nopt')
var abbrev = require('abbrev')
var util = require('util')
var fs = require('fs')
var path = require('path')

var KNOWN_OPTS = {
    'dry-run': Boolean, 'file': String, 'silent': Boolean
  , 'force': Boolean, 'version': Boolean
}

var SHORTHANDS = {
    'f': ['--force'], 'n': ['--dry-run'], 's': ['--silent']
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
    var ev = Commands[command](opts, function (err) {
        if (err) {
            console.error('fatal: %s', err.message)
            if (err.code) process.exit(err.code)
            process.exit(1)
        }
        process.exit(0)
    })
    if (ev.on) {
        ev.on('error', function (err) {
            console.error('error: %s', err.message)
        })
    }
}

var Commands = {}
Commands.update = require('./update')

Commands.status = function () {

}

Commands.clean = function () {

}

Commands.aliases = function () {

}

Commands.trace = function () {

}

Commands.help = function (opts, cb) {
    var f = fs.createReadStream(path.join(__dirname, 'help'), 'utf8')
    f.pipe(process.stderr)
    f.on('end', function () {
        return cb(null)
    })
}

main()
