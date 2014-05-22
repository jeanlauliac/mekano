'use strict';
module.exports = expandPaths

var util = require('util')
var interRep = require('./inter-rep')
var Token = require('./token')
var errors = require('../errors')

var ALIAS_CYCLE = 'alias reference cycle, for example: %s'
var NO_PATH_INTERPOL = 'interpolation as a path not supported in this version'
var INVALID_TOKEN = 'invalid token in path list'
var UNKNOWN_ALIAS = 'unknown alias `%s\''

function expandPaths(rels, aliases) {
    return rels.map(function mapRelation (rel) {
        if (rel.transList.length === 0) return null
        var newTranss = rel.transList.map(function (trans) {
            var tokens = expandTokens(trans.targets, aliases)
            return new interRep.ExpTrans(trans, tokens)
        })
        var newPrereqs = expandTokens(rel.prereqList, aliases)
        return new interRep.ExpRelation(newPrereqs, newTranss)
    }).filter(function (rel) { return rel !== null })
}

function expandTokens(tokens, aliases, stack) {
    if (!stack) stack = []
    var newTokens = []
    for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i]
        if (token.type === Token.PATH || token.type === Token.PATH_GLOB) {
            newTokens.push(token)
        } else if (token.type === Token.IDENTIFIER) {
            var exp = expandAlias(token, aliases, stack)
            for (var j = 0; j < exp.length; ++j) newTokens.push(exp[j])
        } else if (token.type === Token.INTERPOLATION) {
            throw errors.parse(NO_PATH_INTERPOL, token.location)
        } else { throw errors.parse(INVALID_TOKEN, token.location) }
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
    var expansion = expandTokens(aliases[token.value].refs, aliases, stack)
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
