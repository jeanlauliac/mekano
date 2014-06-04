'use strict';
module.exports = expandCmds

var util = require('util')
var Scope = require('../scope.js')
var errors = require('../errors')

function expandCmds(scope, recipes, edges) {
    var cmds = new Array(edges.length)
    for (var i = 0; i < edges.length; ++i) {
        cmds[i] = expand(scope, recipes, edges[i])
    }
    return cmds
}

function expand(unitScope, recipes, edge) {
    var recipeName = edge.trans.ast.recipeName
    if (!recipes.hasOwnProperty(recipeName))
        throw errors.bind(util.format('unknown recipe `%s\'', recipeName))
    var interpol = recipes[recipeName].command
    var scope = new Scope(unitScope)
    scope.set('in', edge.inFiles.map(escapedPathOf).join(' '))
    scope.set('out', edge.outFiles.map(escapedPathOf).join(' '))
    var command = interpol.expand(scope)
    return command
}

function escapedPathOf(file) {
    return file.path.replace(/([^\w-.])/g, '\\$1')
}
