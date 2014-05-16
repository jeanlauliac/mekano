'use strict';
module.exports = dotify

var util = require('util')

var FILE_TPL = '    %s [shape=box];\n'
var REL_TPL = '    %s [label=%s];\n'
var IN_EDGE_TPL = '    {%s} -> %s;\n'
var OUT_EDGE_TPL = '    %s -> {%s};\n'

function dotify(graph, stream, cb) {
    var output = function(str, cb) {
        stream.write(str, 'utf8', cb)
    }
    output('digraph {\n', function (err) {
        if (err) return cb(err)
        outputFiles(graph, output, function (err) {
            if (err) return cb(err)
            outputRelations(graph, output, function (err) {
                if (err) return cb(err)
                output('}\n', cb)
            })
        })
    })
}

function outputFiles(graph, output, cb) {
    ;(function next(i) {
        if (i >= graph.files.length) return cb()
        var str = util.format(FILE_TPL, JSON.stringify(graph.files[i].path))
        output(str, function (err) {
            if (err) return cb(err)
            return next(i + 1)
        })
    })(0)
}

function outputRelations(graph, output, cb) {
    ;(function next(i) {
        if (i >= graph.edges.length) return cb()
        var edge = graph.edges[i]
        var relJsonName = JSON.stringify('__rel__' + edge.outFiles[0].path)
        var str = util.format(REL_TPL, relJsonName, JSON.stringify(edge.trans.ast.recipeName))
        str += util.format(IN_EDGE_TPL, dotifyFiles(edge.inFiles), relJsonName)
        str += util.format(OUT_EDGE_TPL, relJsonName, dotifyFiles(edge.outFiles))
        output(str, function (err) {
            if (err) return cb(err)
            return next(i + 1)
        })
    })(0)
}

function dotifyFiles(files) {
    return files.map(JsonyFile).join('; ')
}

function JsonyFile(file) {
    return JSON.stringify(file.path)
}
