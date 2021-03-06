'use strict';
module.exports = identify

function identify(log, files, imps) {
    var edges = []
    var done = {}
    files.forEach(function (file) {
        if (file.inEdge === null) return
        if (!log.isUpToDate(file.path, imps[file.path]) &&
            !done.hasOwnProperty(file.inEdge.index)) {
            edges.push(file.inEdge)
            done[file.inEdge.index] = true
        }
    })
    return edges
}
