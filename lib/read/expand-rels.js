'use strict';
module.exports = expandRels

var util = require('util')
var interRep = require('./inter-rep')
var ast = require('./ast')
var errors = require('../errors')
var expandRefs = require('./expand-refs')

var UNKNOWN_ALIAS = 'unknown alias `%s\''

function expandRels(rels, aliases) {
    if (!(rels instanceof Array)) throw errors.invalidArg('rels', rels)
    if (!aliases || !(aliases instanceof Object))
        throw errors.invalidArg('aliases', aliases)
    var exa = expandAliasFromArray.bind(null, aliases)
    var etr = expandTranss.bind(null, exa)
    var newRels = []
    for (var i = 0; i < rels.length; ++i) {
        var rel = rels[i]
        if (!(rel instanceof ast.Relation))
            throw errors.invalidArg('rels', rels)
        if (rel.transList.length === 0) continue
        var newTranss = rel.transList.map(etr)
        var newPrereqs = expandRefs(rel.prereqList, exa)
        newRels.push(new interRep.ExpRelation(newPrereqs, newTranss))
    }
    return newRels
}

function expandTranss(exa, trans) {
    var refs = expandRefs(trans.targets, exa)
    return new interRep.ExpTrans(trans, refs)
}

function expandAliasFromArray(aliases, ref) {
    if (!aliases.hasOwnProperty(ref.value)) {
        var message = util.format(UNKNOWN_ALIAS, ref.value)
        throw errors.parse(message, ref.location)
    }
    return aliases[ref.value].refs
}
