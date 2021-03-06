'use strict';
module.exports = {
    readTranss: readTranss
  , readUnit: readUnit
}

var EventEmitter = require('events').EventEmitter
var errors = require('../errors')
var lex = require('./lex')
var parse = require('./parse')
var getAliases = require('./get-aliases')
var expandRels = require('./expand-rels')
var singlify = require('./singlify')
var sortTranss = require('./sort-transs')
var forwardEvents = require('../forward-events')

function readTranss(stream) {
    var ev = new EventEmitter()
    var data = {}
    var ru = readUnit(stream)
    return forwardEvents(ev, ru, function unitRead(errored, unit) {
        data.unit = unit
        var res = null
        try {
            data.aliases = getAliases(unit.relations)
            var relations = expandRels(unit.relations, data.aliases)
            var transs = singlify(relations)
            res = sortTranss(transs)
        } catch (err) {
            if (err.name !== 'ParseError') throw err
            ev.emit('error', err)
            ev.emit('finish', null, unit)
        }
        for (var i = 0; i < res[1].length; ++i)
            ev.emit('error', res[1][i])
        data.transs = res[0]
        ev.emit('finish', data)
    })
}

function readUnit(stream) {
    if (!stream || !stream.read) throw errors.invalidArg('stream', stream)
    var ev = new EventEmitter()
    var ls = stream.pipe(lex())
    var done = false
    ls.on('error', function (err) {
        if (done) return
        done = true
        ev.emit('error', err)
        ev.emit('finish')
    })
    forwardEvents(ev, parse(ls), function parsed(errored, unit) {
        if (done) return
        done = true
        ev.emit('finish', unit)
    })
    return ev
}
