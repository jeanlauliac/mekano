#!/usr/bin/env node
'use strict';

var fs = require('fs')
var ejs = require('ejs')

main()
function main() {
    var files = process.argv.slice(2)
    var res = files.reduce(function forFile(inner, filePath) {
        var opts = {
            inner: inner
        }
        return ejs.render(fs.readFileSync(filePath, 'utf8'), opts)
    }, '')
    process.stdout.write(res)
}
