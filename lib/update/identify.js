'use strict';
module.exports = identify

function identify(log, imps, files) {
    var edges = []
    var done = {}
    files.forEach(function (file) {
        console.log('>>>', file.path)
        if (file.inEdge === null) return
        if (!log.isUpToDate(file, imps[file.path]) &&
            !done.hasOwnProperty(file.inEdge.index)) {
            edges.push(file.inEdge)
            done[file.inEdge.index] = true
        }
    })
    return edges
}
