'use strict';
module.exports = getAliases

var util = require('util')
var interRep = require('./inter-rep')
var expandRefs = require('./expand-refs')
var errors = require('../errors')

var ALIAS_CYCLE = 'alias reference cycle, for example: %s'
var UNKNOWN_ALIAS = 'unknown alias `%s\''

function getAliases(rels) {
    var marks = {}
    for (var i = 0; i < rels.length; ++i) {
        var rel = rels[i]
        if (rel.alias === null) continue
        var refs = rel.prereqList
        if (rel.transList.length > 0)
            refs = rel.transList[rel.transList.length - 1].targets
        marks[rel.alias.name] = {ast: rel.alias, refs: refs
                               , done: false, doing: false, index: 0}
    }
    var aliases = {}
    for (var name in marks) {
        if (!marks.hasOwnProperty(name)) continue
        var mark = marks[name]
        var xpRefs = mark.done ? mark.refs : expandAlias(marks, name, [])
        aliases[name] = new interRep.Alias(mark.ast, xpRefs)
    }
    return aliases
}

function expandAlias(marks, name, stack) {
    var mark = marks[name]
    if (mark.doing) throw cycleError(marks, stack, marks[name].index)
    mark.index = stack.length
    stack = stack.concat([name])
    mark.doing = true
    mark.refs = expandRefs(marks[name].refs, function (ref) {
        if (!marks.hasOwnProperty(ref.value)) {
            var message = util.format(UNKNOWN_ALIAS, ref.value)
            throw errors.parse(message, ref.location)
        }
        if (marks[ref.value].done) return marks[ref.value].refs
        return expandAlias(marks, ref.value, stack)
    })
    mark.doing = false
    mark.done = true
    return mark.refs
}

function cycleError(marks, stack, ix) {
    var str = ''
    for (var i = ix; i < stack.length; ++i) {
        var name = stack[i]
        var mark = marks[name]
        str += util.format('%s:%s -> ', mark.ast.location, name)
    }
    var location = marks[stack[ix]].ast.location
    str += util.format('%s:%s', location, stack[ix])
    return errors.parse(util.format(ALIAS_CYCLE, str), location)
}
