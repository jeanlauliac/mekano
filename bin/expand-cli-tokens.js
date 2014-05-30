'use strict';
module.exports = expandCliTokens

var fs = require('fs')
var glob = require('glob')
var util = require('util')
var EventEmitter = require('events').EventEmitter
var map = require('../lib/graph/map')
var sort = require('../lib/update/sort')
var expandCmds = require('../lib/update/expand-cmds')
var imprint = require('../lib/update/imprint')
var Scope = require('../lib/interpolation')
var identify = require('../lib/update/identify')
var forwardEvents = require('../lib/forward-events')
var ast = require('../lib/read/ast')
var helpers = require('./helpers')
var errors = require('../lib/errors')

var RE_BIND = /^(.+)=(.*)$/

function expandCliTokens(argv) {
    if (!(argv instanceof Array))
        throw errors.invalidArg('argv', argv)
    var scope = new Scope()
    var refs = []
    argv.forEach(function (arg) {
        if (typeof arg === 'string')
            throw errors.invalidArg('argv', argv)
        var match = arg.match(RE_BIND)
        if (match !== null) {
            scope.set(match[1], match[2])
            return
        }
        refs.push(ast.Ref.fromString(arg))
    })
    return [scope, refs]
}
