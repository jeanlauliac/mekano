'use strict';
module.exports = expandPaths

var util = require('util')
var interRep = require('./inter-rep')
var ast = require('./ast')
var errors = require('../errors')

var ALIAS_CYCLE = 'alias reference cycle, for example: %s'
var INVALID_TOKEN = 'invalid reference in path list'
var UNKNOWN_ALIAS = 'unknown alias `%s\''

function expandPaths(rels, aliases) {
    if (!(rels instanceof Array)) throw errors.invalidArg('rels', rels)
    if (!aliases || !(aliases instanceof Object))
        throw errors.invalidArg('aliases', aliases)
    return rels.map(function mapRelation (rel) {
        if (!rel || !(rel instanceof ast.Relation))
            throw errors.invalidArg('rels', rels)
        if (rel.transList.length === 0) return null
        var newTranss = rel.transList.map(function (trans) {
            var refs = expandRefs(trans.targets, aliases)
            return new interRep.ExpTrans(trans, refs)
        })
        var newPrereqs = expandRefs(rel.prereqList, aliases)
        return new interRep.ExpRelation(newPrereqs, newTranss)
    }).filter(function (rel) { return rel !== null })
}

function expandRefs(refs, aliases, stack) {
    if (!stack) stack = []
    var newTokens = []
    for (var i = 0; i < refs.length; ++i) {
        var ref = refs[i]
        if (ref.type === ast.Ref.PATH || ref.type === ast.Ref.PATH_GLOB) {
            newTokens.push(ref)
        } else if (ref.type === ast.Ref.ALIAS) {
            var exp = expandAlias(ref, aliases, stack)
            for (var j = 0; j < exp.length; ++j) newTokens.push(exp[j])
        } else { throw errors.parse(INVALID_TOKEN, ref.location) }
    }
    return newTokens
}

function expandAlias(token, aliases, stack) {
    var ix = indexOf(stack, token)
    if (ix >= 0) {
        var cycleStr = getCycleStr(token, stack, ix)
        throw errors.parse(util.format(ALIAS_CYCLE, cycleStr), token.location)
    }
    if (!aliases.hasOwnProperty(token.value)) {
        var message = util.format(UNKNOWN_ALIAS, token.value)
        throw errors.parse(message, token.location)
    }
    stack = stack.concat([token])
    var expansion = expandRefs(aliases[token.value].refs, aliases, stack)
    return expansion
}

function indexOf(list, item) {
    for (var i = 0; i < list.length; ++i) {
        if (list[i] === item) return i
    }
    return -1
}

function getCycleStr(token, stack, ix) {
    var str = ''
    for (var i = ix; i < stack.length; ++i) {
        var tk = stack[i]
        str += util.format('%s:%s -> ', tk.location, tk.value)
    }
    str += util.format('%s:%s', token.location, token.value)
}
