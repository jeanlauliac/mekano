'use strict';
module.exports = singlify

var interRep = require('./inter-rep')

function singlify(rels) {
    var transs = []
    for (var i = 0; i < rels.length; ++i) {
        var trs = singlifyRelation(rels[i])
        for (var j = 0; j < trs.length; ++j) transs.push(trs[j])
    }
    return transs
}

function singlifyRelation(rel) {
    var transs = []
    var prereqs = rel.prereqs
    for (var i = 0; i < rel.transs.length; ++i) {
        var tr = rel.transs[i]
        transs.push(new interRep.PlainTrans(tr.ast, prereqs, tr.targets))
        prereqs = tr.targets
    }
    return transs
}
