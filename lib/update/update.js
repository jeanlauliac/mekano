'use strict';
module.exports = update

var minimatch = require('minimatch')
var Graph = require('./graph')
var Token = require('../read/token')
var asyncMap = require('slide').asyncMap

function update(fs, graph, targets, cb) {
    var st = {
        files: {}
    }

}

function loadFile(st, graph, target) {
    if (st.files.hasOwnProperty(target.path)) {
        if (st.files.visiting)
            throw new Error('file dependency cycle detected')
        return
    }
    st.files[target.path] = {file: target, visiting: true}
    var inFiles = target.inRel.inFiles
    for (var i = 0; i < inFiles.length; ++i) {
        loadFile(st, graph, inFiles[i])
    }
    st.files[target.path].visiting = false
}
