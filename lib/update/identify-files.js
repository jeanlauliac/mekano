'use strict';
module.exports = identifyFiles

function identifyFiles(graph, files) {
    var marks = {}
    if (!files) files = graph.files
    for (var i = 0; i < files.length; ++i)
        visit(graph, files[i], marks, [])
    var result = []
    for (var path in marks) {
        if (!marks.hasOwnProperty(path)) continue
        result.push(marks[path].file)
    }
    return result
}

function visit(graph, target, marks, stack) {
    if (marks.hasOwnProperty(target.path)) {
        if (!marks[target.path].visiting) return
        var index = marks[target.path].index
        var str = target.path
        for (var j = stack.length - 1; j >= index; --j) {
            str += ' -> ' + stack[j].path
        }
        throw new Error('file dependency cycle: ' + str)
    }
    marks[target.path] = {file: target, visiting: true, index: stack.length}
    stack.push(target)
    if (target.inEdge !== null) {
        var inFiles = target.inEdge.inFiles
        for (var i = 0; i < inFiles.length; ++i) {
            visit(graph, inFiles[i], marks, stack)
        }
    }
    marks[target.path].visiting = false
    stack.pop()
}
