'use strict';
module.exports = singlify

var ast = require('./ast')

function singlify(unit) {
    var newUnit = new ast.Unit(unit.recipes, [], unit.binds)
    for (var i = 0; i < unit.relations.length; ++i) {
        var newRels = singlifyRelation(unit.relations[i])
        for (var j = 0; j < newRels.length; ++j)
            newUnit.relations.push(newRels[j])
    }
    return newUnit
}

function singlifyRelation(rel) {
    if (rel.transList.length === 0 && rel.transList.alias === null)
        return []
    if (rel.transList.length === 1 && rel.transList.alias === null ||
        rel.transList.length === 0 && rel.transList.alias !== null)
        return [rel]
    var newRels = []
    var prereqList = rel.prereqList
    for (var i = 0; i < rel.transList.length; ++i) {
        newRels.push(new ast.Relation(prereqList, [rel.transList[i]]))
        prereqList = rel.transList[i].targets
    }
    if (rel.alias) {
        newRels.push(new ast.Relation(prereqList, [], rel.alias))
    }
    return newRels
}
