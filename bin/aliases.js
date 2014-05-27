'use strict';
module.exports = aliases

var EventEmitter = require('events').EventEmitter
var readInput = require('./read-input')
var forwardEvents = require('../lib/forward-events')
var read = require('../lib/read')
var getAliases = require('../lib/read/get-aliases')
var helpers = require('./helpers')

function aliases(opts) {
    var ev = new EventEmitter()
    readInput.openSomeInput(opts.file, function (err, input, filePath) {
        if (err) return helpers.bailoutEv(ev, err)
        var rt = readUnit(input, filePath)
        forwardEvents(ev, rt, function (errored, unit) {
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
    var rt = read.readUnit(input)
    forwardEvents(ev, rt, function unitReady(errored, unit) {
        if (errored) return ev.emit('finish')
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
        console.log('    %s  %s', helpers.padRight(name, max)
                  , aliases[name].ast.desc)
    }
    console.log()
}
