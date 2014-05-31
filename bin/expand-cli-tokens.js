'use strict';
module.exports = expandCliTokens

var Scope = require('../lib/scope')
var ast = require('../lib/read/ast')
var errors = require('../lib/errors')

var RE_BIND = /^(.+)=(.*)$/

function expandCliTokens(argv) {
    if (!(argv instanceof Array))
        throw errors.invalidArg('argv', argv)
    var scope = new Scope()
    var refs = []
    argv.forEach(function (arg) {
        if (typeof arg !== 'string')
            throw errors.invalidArg('argv', argv)
        var match = arg.match(RE_BIND)
        if (match !== null)
            return scope.set(match[1], match[2])
        refs.push(ast.Ref.fromString(arg))
    })
    return [scope, refs]
}
