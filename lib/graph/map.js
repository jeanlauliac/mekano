'use strict';
module.exports = map

var minimatch = require('minimatch')
var Graph = require('./graph')
var Token = require('../read/token')
var asyncMap = require('slide').asyncMap
var mergeLists = require('../merge-lists')

function map(fs, transs, cb) {
    var graph = new Graph()
    var st = {fs: fs, graph: graph, pendingGlobs: []}
    return asyncMap(unit.relations, function (relation, cb) {
        mapRelation(st, relation, cb)
    }, function (err) {
        if (err) return cb(err)
        return cb(null, graph)
    })
}

function mapRelation(st, relation, cb) {
    if (relation.alias) return cb()
    if (relation.transList.length !== 1)
        return cb(new Error('cannot build graph from multi-trans relations'))
    if (relation.transList[0].multi)
        return cb(new Error('fat arrow not implemented'))
    var inFiles = []
    var inGlobs = []
    return asyncMap(relation.prereqList, function (fileToken, cb) {
        if (fileToken.type === Token.IDENTIFIER)
            return cb(new Error('cannot have an alias as prerequisite'))
        if (fileToken.type === Token.PATH) {
            inFiles.push(st.graph.getFileByPath(fileToken.value))
            return cb(null)
        }
        st.fs.glob(fileToken.value, {}, function (err, matches) {
            if (err) return cb(err)
            var res = st.graph.getFilesByGlob(fileToken.value)
            res = mergeFileLists(res, st.graph.getFilesByPaths(matches))
            inGlobs.push(fileToken.value)
            inFiles = inFiles.concat(res)
            return cb(null)
        })
    }, function (err) {
        if (err) return cb(err)
        return mapRelation2(st, relation, inFiles, inGlobs, cb)
    })
}

function mapRelation2(st, relation, inFiles, inGlobs, cb) {
    var outFiles = []
    return asyncMap(relation.transList[0].targets, function (fileToken, cb) {
        if (fileToken.type === Token.IDENTIFIER)
            return cb(new Error('cannot have an alias as target'))
        if (fileToken.type === Token.PATH_GLOB)
            return cb(new Error('cannot have a glob as single arrow target'))
        var file = st.graph.getFileByPath(fileToken.value)
        outFiles.push(file)
        for (var i = 0; i < st.pendingGlobs.length; ++i) {
            var g = st.pendingGlobs[i]
            if (minimatch(file.path, g.glob))
                st.graph.pushRelationFilesIn(g.rel, [file])
        }
        return cb(null)
    }, function (err) {
        if (err) return cb(err)
        var recipe = relation.transList[0].recipeName
        var rel = st.graph.pushRelation(recipe, inFiles, outFiles)
        for (var i = 0; i < inGlobs.length; ++i) {
            st.pendingGlobs.push({glob: inGlobs[i], rel: rel})
        }
        return cb(null, rel)
    })
}

function fileListComparator(a, b) {
    if (a.filePath > b.filePath) return 1
    if (a.filePath < b.filePath) return -1
    return 0
}

function mergeFileLists(a, b) {
    return mergeLists(a, b, fileListComparator)
}


////////
//
// *.out Mangle => *.mgl
// foo.c Compile -> foo.o
// *.o Link -> a.out
// bar.c Compile -> bar.o


////////
// generators:
//      "value", *.out Mangle => *.mgl
//
// foo.c Compile -> foo.o
// *.o Link -> a.out
// bar.c Compile -> bar.o

