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
    var prereqs = rel.prereqList
    for (var i = 0; i < rel.transList.length; ++i) {
        var tr = rel.transList[i]
        transs.push(new interRep.Trans(prereqs, tr))
        prereqs = tr.targets
    }
    return transs
}
