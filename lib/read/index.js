'use strict';
module.exports = read

var EventEmitter = require('events').EventEmitter
var lex = require('./lex')
var parse = require('./parse')
var getAliases = require('./get-aliases')
var expandPaths = require('./expand-paths')
var singlify = require('./singlify')
var sortTranss = require('./sort-transs')

function read(stream, cb) {
    var ev = new EventEmitter()
    var ls = stream.pipe(lex())
    ls.on('error', function (err) {
        var lcb = cb
        cb = null
        return lcb(err)
    })
    parse(ls, function parsed(err, unit) {
        if (cb === null) return
        if (err) return cb(err)
        var transs = null
        try {
            var aliases = getAliases(unit.relations)
            var relations = expandPaths(unit.relations, aliases)
            transs = singlify(relations)
            var res = sortTranss(transs)
            for (var i = 0; i < res[1].length; ++i) ev.emit('error', res[1][i])
            if (res[1].length > 0)
                return cb(new Error('one or more errors, aborting'))
            transs = res[0]
        } catch (err) {
            return cb(err)
        }
        return cb(null, transs, unit)
    })
    return ev
}
