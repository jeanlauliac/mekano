'use strict';
module.exports = expandCmds

var Scope = require('../scope.js')

function expandCmds(scope, recipes, edges) {
    var cmds = new Array(edges.length)
    for (var i = 0; i < edges.length; ++i) {
        cmds[i] = expand(scope, recipes, edges[i])
    }
    return cmds
}

function expand(unitScope, recipes, edge) {
    var interpol = recipes[edge.trans.ast.recipeName].command
    var scope = new Scope(unitScope)
    scope.set('in', edge.inFiles.map(function (file) {
        return file.path
    }).join(' '))
    scope.set('out', edge.outFiles.map(function (file) {
        return file.path
    }).join(' '))
    var command = interpol.expand(scope)
    return command
}
