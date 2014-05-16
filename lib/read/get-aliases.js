'use strict';
module.exports = getAliases

var interRep = require('./inter-rep')

function getAliases(rels) {
    var aliases = {}
    for (var i = 0; i < rels.length; ++i) {
        var rel = rels[i]
        if (rel.alias === null) continue
        var refs = rel.prereqList
        if (rel.transList.length > 0)
            refs = rel.transList[rel.transList.length - 1].targets
        aliases[rel.alias.name] = new interRep.Alias(rel.alias, refs)
    }
    return aliases
}
