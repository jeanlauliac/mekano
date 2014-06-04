'use strict';
module.exports = print

var EventEmitter = require('events').EventEmitter
var forwardEvents = require('../lib/forward-events')
var readGraph = require('./read-graph')
var common = require('./common')
var helpers = require('./helpers')
var util = require('util')
var dotify = require('../lib/graph/dotify')

var ONE_ARG = '`print\' needs one and only one argument'
var UNKNOWN_TYPE = 'unknown print type `%s\''

var TPL_BIND = '%s = `%s`;'
var TPL_RECIPE = '%s: `%s`;'

function print(opts) {
    var ev = new EventEmitter()
    var rg = readGraph(opts.file, common.LOG_PATH, [])
    forwardEvents(ev, rg, function graphRead(errored, data) {
        if (errored) return ev.emit('finish')
        if (opts.argv.remain.length !== 1)
            return helpers.bailoutEv(ev, new Error(ONE_ARG))
        var type = opts.argv.remain[0]
        switch (type) {
            case 'manifest':
                return printManifest(ev, data, opts)
            case 'dot':
                return printDot(ev, data, opts)
        }
        var err = new Error(util.format(UNKNOWN_TYPE, type))
        return  helpers.bailoutEv(ev, err)
    })
    return ev
}

function printManifest(ev, data) {
    var binds = data.scope.getPairs()
    for (var i = 0; i < binds.length; ++i) {
        var value = escapeInterpolation(binds[i].value)
        console.log(TPL_BIND, binds[i].name, value)
    }
    console.log()
    for (var name in data.recipes) {
        console.log(TPL_RECIPE, name, data.recipes[name].command.toString())
    }
    console.log()
    for (var j = 0; j < data.transs.length; ++j) {
        var trans = data.transs[j]
        var str = ''
        str += trans.prereqs.map(valueOf).join(' ')
        str += ' ' + trans.ast.recipeName + ' '
        if (trans.ast.multi) str += '=>'
        else str += '->'
        str += ' ' + trans.targets.map(valueOf).join(' ') + ';'
        console.log(str)
    }
    ev.emit('finish')
}

function printDot(ev, data) {
    dotify(data.graph, process.stdout, function (err) {
        if (err) ev.emit('error', err)
        ev.emit('finish')
    })
}

function valueOf(trans) {
    return trans.value
}

function escapeInterpolation(str) {
    return str.replace('$', '$$').replace('`', '$`')
}
