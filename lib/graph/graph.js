'use strict';
module.exports = Graph

var util = require('util')
var minimatch = require('minimatch')

var FILE_NOT_IN_GRAPH = 'file `%s\' does not belong to this graph'
var MULTI_IN_REL = 'cannot have multiple relations targeting file `%s\''
var AT_LEAST_OUT = 'a relation needs at least one target'

function Graph() {
    defProp(this, 'files', [])
    defProp(this, 'rels', [])
    defProp(this, '_filesByPath', {})
}

Graph.prototype.getFileByPath = function(path) {
    if (this._filesByPath.hasOwnProperty(path)) return this._filesByPath[path]
    var file = new File(this, path)
    this.files.push(file)
    this._filesByPath[path] = file
    return file
}

Graph.prototype.getFilesByPaths = function(paths) {
    return paths.map(this.getFileByPath.bind(this))
}

Graph.prototype.getFilesByGlob = function(glob) {
    var res = []
    for (var i = 0; i < this.files.length; ++i) {
        if (minimatch(this.files[i].path, glob)) {
            res.push(this.files[i])
        }
    }
    return res
}

Graph.prototype.pushRelation = function(recipe, inFiles, outFiles) {
    this._checkOwnership(inFiles)
    this._checkOwnership(outFiles)
    for (i = 0; i < outFiles.length; ++i)
        if (outFiles[i].inRel !== null)
            throw new Error(util.format(MULTI_IN_REL, outFiles[i].path))
    var rel = new Relation(recipe, inFiles, outFiles)
    for (var i = 0; i < inFiles.length; ++i)
        inFiles[i].outRels.push(rel)
    for (i = 0; i < outFiles.length; ++i)
        outFiles[i].inRel = rel
    this.rels.push(rel)
    return rel
}

Graph.prototype.pushRelationFilesIn = function(rel, inFiles) {
    this._checkOwnership(inFiles)
    for (var i = 0; i < inFiles.length; ++i) {
        rel.inFiles.push(inFiles[i])
        inFiles[i].outRels.push(rel)
    }
    return rel
}

Graph.prototype._checkOwnership = function(files) {
    for (var i = 0; i < files.length; ++i) {
        if (files[i].graph !== this)
            throw new Error(util.format(FILE_NOT_IN_GRAPH, files[i].path))
    }
}

function File(graph, path, inRel, outRels) {
    defProp(this, 'graph', graph || [])
    defProp(this, 'path', path || [])
    this.inRel = inRel || null
    defProp(this, 'outRels', outRels || [])
}

function Relation(recipe, inFiles, outFiles) {
    if (outFiles.length < 1) throw new Error(AT_LEAST_OUT)
    defProp(this, 'recipe', recipe)
    defProp(this, 'inFiles', inFiles)
    defProp(this, 'outFiles', outFiles)
}

function defProp(o, name, value) {
    Object.defineProperty(o, name, {value: value, enumerable: true})
}
