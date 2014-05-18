'use strict';
module.exports = read

var lex = require('./lex')
var parse = require('./parse')
var getAliases = require('./get-aliases')
var expandPaths = require('./expand-paths')
var singlify = require('./singlify')

function read(stream, cb) {
    var ls = stream.pipe(lex())
    parse(ls, function parsed(err, unit) {
        if (err) return cb(err)
        var transs = null
        try {
            var aliases = getAliases(unit.relations)
            var relations = expandPaths(unit.relations, aliases)
            transs = singlify(relations)
        } catch (err) {
            return cb(err)
        }
        return cb(null, transs)
    })
}
