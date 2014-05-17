'use strict';

var test = require('tape')
var imprint = require('../../lib/update/imprint')

var tg = require('../test-graph')
var TEST_FILES = [tg.foo_c, tg.foo_o, tg.bar_c, tg.bar_o, tg.a_out]

var TEST_CMDS = [
    'gcc -c foo.c -o foo.o'
  , 'gcc -c bar.c -o bar.o'
  , 'ld foo.o bar.o -o a.out'
]

var TEST_FS = {
    lstat: function (path, cb) {
        return cb(null, {mtime: new Date(42)})
    }
}

test('update.imprint()', function (t) {
    imprint(TEST_FS, TEST_FILES, TEST_CMDS, function testImps(err, imps) {
        TEST_FILES.forEach(function (file) {
            t.equal(typeof imps[file.path], 'number')
        })
        TEST_CMDS[0] = 'beep'
        imprint(TEST_FS, TEST_FILES, TEST_CMDS, function testImps2(err, imps2) {
            t.notEqual(imps['foo.o'], imps2['foo.o'])
            t.equal(imps['bar.o'], imps2['bar.o'])
            t.notEqual(imps['a.out'], imps2['a.out'])
            t.end()
        })
    })
})
