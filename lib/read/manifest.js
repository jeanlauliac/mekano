'use strict';
module.exports = {
    open: open
  , read: read
  , readTranss: readTranss
}

var util = require('util')
var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var fromStream = require('./from-stream')
var forwardEvents = require('../forward-events')
var helpers = require('../helpers')

var DEFAULT_PATHS = ['Mekanofile', 'mekanofile']
var NO_MANIFEST_FILE = 'no such manifest file `%s\''
var NO_MANIFEST = 'Mekanofile not found'

function read(filePath) {
    var ev = new EventEmitter()
    open(filePath, function (err, input, filePath) {
        if (err) return helpers.bailoutEv(ev, err)
        var rt = readTranss(input, filePath)
        forwardEvents(ev, rt, function (errored, data) {
            if (errored) return ev.emit('finish')
            data.filePath = filePath
            ev.emit('finish', data)
        })
    })
    return ev
}

function open(filePath, cb) {
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
    var rt = fromStream.readTranss(input)
    forwardEvents(ev, rt, function transsReady(errored, data) {
        if (errored) return ev.emit('finish')
        ev.emit('finish', data)
    }, augmentError)
    return ev
}
