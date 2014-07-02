'use strict';
module.exports = aliases

var EventEmitter = require('events').EventEmitter
var manifest = require('../lib/read/manifest')
var forwardEvents = require('../lib/forward-events')
var fromStream = require('../lib/read/from-stream')
var getAliases = require('../lib/read/get-aliases')
var helpers = require('../lib/helpers')

function aliases(opts) {
    var ev = new EventEmitter()
    manifest.open(opts.file, function (err, input, filePath) {
        if (err) return helpers.bailoutEv(ev, err)
        var rt = readUnit(input, filePath)
        forwardEvents.noErr(ev, rt, function (unit) {
            var aliases
            try { aliases = getAliases(unit.relations) }
            catch (err) {
                if (err.name !== 'ParseError') throw err;
                return helpers.bailoutEv(ev, err)
            }
            printAliases(aliases)
            ev.emit('finish')
        })
    })
    return ev
}

function readUnit(input, filePath) {
    var ev = new EventEmitter()
    var augmentError = function augmentError(err) { err.filePath = filePath }
    var rt = fromStream.readUnit(input)
    forwardEvents.noErr(ev, rt, function unitReady(unit) {
        ev.emit('finish', unit)
    }, augmentError)
    return ev
}

function printAliases(aliases) {
    console.log('Available aliases:\n')
    var max = 0
    for (var name in aliases) {
        if (name.length > max) max = name.length
    }
    for (name in aliases) {
        if (!aliases.hasOwnProperty(name)) continue
        var desc = aliases[name].ast.desc
        if (desc === null) desc = ''
        console.log('    %s  %s', helpers.padRight(name, max), desc)
    }
    console.log()
}
