'use strict';
module.exports = update

var fs = require('fs')

var DEFAULT_PATHS = ['Neomakefile', 'neomakefile'];
var NO_MAKEFILE = 'Neomakefile not found'

function update(opts, cb) {
    openInputStream(opts.file, function (err, input) {
        if (err) return cb(err)
        console.error(input)

    })
}

function openInputStream(filePath, cb) {
    process.stdin.setEncoding('utf8')
    if (filePath === '-') return cb(null, process.stdin)
    if (filePath) return tryCreateReadStream(filePath, cb)
    ;(function next(i) {
        if (i >= DEFAULT_PATHS.length) return cb(new Error(NO_MAKEFILE))
        tryCreateReadStream(DEFAULT_PATHS[i], function (err, stream) {
            if (err) return next(i + 1)
            return cb(null, stream)
        })
    })(0)
}

function tryCreateReadStream(filePath, cb) {
    var stream = fs.createReadStream(filePath, {encoding: 'utf8'})
    stream.on('open', function () { return cb(null, stream) })
    stream.on('error', function (err) { return cb(err) })
}
