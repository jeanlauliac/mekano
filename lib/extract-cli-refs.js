'use strict';
module.exports = extractCliRefs

var util = require('util')
var EventEmitter = require('events').EventEmitter
var ast = require('../lib/read/ast')
var errors = require('../lib/errors')
var Graph = require('../lib/graph/graph')

var NO_MATCH = 'no file matches the pattern `%s\''
var NO_SUCH_FILE = 'no such file `%s\', put patterns into "quotes" to avoid ' +
                   'shell expansion'

function extractCliRefs(graph, refs) {
    var ev = new EventEmitter()
    if (!(graph instanceof Graph)) throw errors.invalidArg('graph', graph)
    if (!(refs instanceof Array)) throw errors.invalidArg('refs', refs)
    process.nextTick(function () {
        if (refs.length === 0)
            return ev.emit('finish', graph.files)
        var st = {ev: ev, graph: graph, refs: refs, files: []}
        refs.forEach(extractSingleRef.bind(null, st))
        ev.emit('finish', st.files)
    })
    return ev
}

function extractSingleRef(st, ref) {
    var err
    if (!(ref instanceof ast.Ref) || ref.isA(ast.Ref.ALIAS))
        throw errors.invalidArg('refs', st.refs)
    if (ref.isA(ast.Ref.PATH_GLOB)) {
        var newFiles = st.graph.getFilesByGlob(ref.value)
        if (newFiles.length === 0) {
            err = new Error(util.format(NO_MATCH, ref.value))
            return st.ev.emit('warning', err)
        }
        st.files = st.files.concat(newFiles)
        return
    }
    var newFile = st.graph.getFile(ref.value)
    if (newFile === null) {
        err = new Error(util.format(NO_SUCH_FILE, ref.value))
        return st.ev.emit('error', err)
    }
    st.files.push(newFile)
}
