'use strict';
module.exports = singlify

var interRep = require('./inter-rep')

function singlify(rels) {
    var transs = []
    var aliases = {}
    for (var i = 0; i < rels.length; ++i) {
        var res = singlifyRelation(rels[i])
        var trs = res.transs
        for (var j = 0; j < trs.length; ++j) transs.push(trs[j])
        if (res.alias) aliases[res.alias.ast.name] = res.alias
    }
    return {transs: transs, aliases: aliases}
}

function singlifyRelation(rel) {
    var res = {transs: [], alias: null}
    var prereqs = rel.prereqList
    for (var i = 0; i < rel.transList.length; ++i) {
        var tr = rel.transList[i]
        res.transs.push(new interRep.Trans(prereqs, tr))
        prereqs = tr.targets
    }
    if (rel.alias) {
        res.alias = new interRep.Alias(rel.alias, prereqs)
    }
    return res
}
