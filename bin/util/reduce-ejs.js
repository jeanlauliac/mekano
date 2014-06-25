#!/usr/bin/env node
'use strict';

var fs = require('fs')
var path = require('path')
var ejs = require('ejs')

main()
function main() {
    var files = process.argv.slice(2)
    files.forEach(forFile)
}

function forFile(filePath) {
    var nextPath = null
    var opts = {
        inner: ''
      , template: function (newPath) {
            nextPath = path.join(path.dirname(filePath), newPath)
        }
    }
    while (filePath !== null) {
        opts.inner = ejs.render(fs.readFileSync(filePath, 'utf8'), opts)
        filePath = nextPath
        nextPath = null
    }
    process.stdout.write(opts.inner)
}
