'use strict';
module.exports = {
    readInput: readInput
  , openSomeInput: openSomeInput
  , readTranss: readTranss
}

var util = require('util')
var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var read = require('../lib/read')
var forwardEvents = require('../lib/forward-events')
var helpers = require('./helpers')

var DEFAULT_PATHS = ['Mekanofile', 'mekanofile']
var NO_MANIFEST_FILE = 'no such manifest file `%s\''
var NO_MANIFEST = 'Mekanofile not found'

function readInput(filePath) {
    var ev = new EventEmitter()
    openSomeInput(filePath, function (err, input, filePath) {
        if (err) return helpers.bailoutEv(ev, err)
        var rt = readTranss(input, filePath)
        forwardEvents(ev, rt, function (errored, transs, unit) {
            ev.emit('finish', filePath, transs, unit)
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

function readTranss(input, filePath) {
    var ev = new EventEmitter()
    var augmentError = function augmentError(err) { err.filePath = filePath }
    var rt = read.readTranss(input)
    forwardEvents(ev, rt, function transsReady(errored, transs, unit) {
        if (errored) return ev.emit('finish')
        ev.emit('finish', transs, unit)
    }, augmentError)
    return ev
}
