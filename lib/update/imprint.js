'use strict';
module.exports = imprint

var murmur = require('murmurhash-js')
var util = require('util')
var Token = require('../read/token')

var MAX_IMPRINT = Math.pow(2, 32)
var NOT_SORTED = 'input file array is not properly sorted'
var NOT_FOUND = 'file not found `%s\''

function imprint(fs, files, edgeCmds, cb) {
    var st = {
        imps: []
      , fs: fs
      , edgeCmds: edgeCmds
    }
    ;(function next(i) {
        if (i >= files.length) return cb(null, st.imps)
        var file = files[i]
        if (file.inEdge === null) {
            return fromSource(st, file, function (err, imp) {
                if (err) return cb(err)
                st.imps[file.path] = imp
                return next(i + 1)
            })
        }
        var imp = fromEdge(st, file.inEdge)
        st.imps[file.path] = imp
        return next(i + 1)
    })(0)
}

function fromSource(st, file, cb) {
    st.fs.lstat(file.path, function (err, stats) {
        if (err && err.code === 'ENOENT') {
            err = new Error(util.format(NOT_FOUND, file.path))
        }
        if (err) return cb(err)
        return cb(null, stats.mtime.getTime())
    })
}

function fromEdge(st, edge) {
    var sum = 0
    edge.inFiles.forEach(function (file) {
        if (!st.imps.hasOwnProperty(file.path)) throw new Error(NOT_SORTED)
        sum = (sum + st.imps[file.path]) % MAX_IMPRINT
    })
    return murmur(st.edgeCmds[edge.index], sum)
}
