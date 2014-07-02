'use strict';
module.exports = Graph

var util = require('util')
var minimatch = require('minimatch')
var errors = require('../errors')

var FILE_NOT_IN_GRAPH = 'file `%s\' does not belong to this graph'
var MULTI_IN_EDGE = 'cannot have multiple edges targeting file `%s\''
var AT_LEAST_OUT = 'an edge needs at least one target'

function Graph() {
    defProp(this, 'files', [])
    defProp(this, 'edges', [])
    defProp(this, '_filesByPath', {})
}

Graph.prototype.getFile = function(path) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
    if (!this._filesByPath.hasOwnProperty(path)) return null
    return this._filesByPath[path]
}

Graph.prototype.getFileByPath = function(path) {
    if (typeof path !== 'string') throw errors.invalidArg('path', path)
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
    if (typeof glob !== 'string') throw errors.invalidArg('glob', glob)
    var res = []
    for (var i = 0; i < this.files.length; ++i) {
        if (minimatch(this.files[i].path, glob)) {
            res.push(this.files[i])
        }
    }
    return res
}

Graph.prototype.pushEdge = function(recipe, outFiles, inFiles) {
    var index = this.edges.length
    var edge = new Edge(this, index, recipe, outFiles)
    if (inFiles) edge.pushFilesIn(inFiles)
    this.edges.push(edge)
    return edge
}

Graph.File = File
function File(graph, path) {
    Object.defineProperty(this, 'graph', {value: graph})
    defProp(this, 'path', path)
    this.inEdge = null
    defProp(this, 'outEdges', [])
}

Graph.Edge = Edge
function Edge(graph, index, trans, outFiles) {
    if (outFiles.length < 1) throw new Error(AT_LEAST_OUT)
    checkOwnership(graph, outFiles)
    for (var i = 0; i < outFiles.length; ++i) {
        if (outFiles[i].inEdge !== null)
            throw new Error(util.format(MULTI_IN_EDGE, outFiles[i].path))
    }
    Object.defineProperty(this, 'graph', {value: graph})
    defProp(this, 'index', index)
    defProp(this, 'trans', trans)
    defProp(this, 'inFiles', [])
    defProp(this, 'outFiles', outFiles)
    for (i = 0; i < outFiles.length; ++i)
        outFiles[i].inEdge = this
}

Edge.prototype.pushFilesIn = function(inFiles) {
    for (var i = 0; i < inFiles.length; ++i) {
        this.pushFileIn(inFiles[i])
    }
}

Edge.prototype.pushFileIn = function(inFile) {
    if (inFile.graph !== this.graph)
        throw new Error(util.format(FILE_NOT_IN_GRAPH, inFile.path))
    this.inFiles.push(inFile)
    inFile.outEdges.push(this)
}

function checkOwnership(graph, files) {
    for (var i = 0; i < files.length; ++i) {
        if (files[i].graph !== graph)
            throw new Error(util.format(FILE_NOT_IN_GRAPH, files[i].path))
    }
}

function defProp(o, name, value) {
    Object.defineProperty(o, name, {value: value, enumerable: true})
}
