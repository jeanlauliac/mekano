'use strict';

var test = require('tape')
var update = require('../../lib/update/update')

var tg = require('./test-graph')
var TEST_SUBGRAPH = [tg.foo_o, tg.foo_c, tg.a_out, tg.bar_o, tg.bar_c]

var TEST_FS = {
    lstat: function (path, cb) {
        return cb(null, {mtime: new Date(42)})
    }
}

test('update.update()', function (t) {
    update(TEST_FS, tg.graph, TEST_SUBGRAPH, function (err) {
        t.error(err)
        t.end()
    }).on('progress', function (st) {
        console.error('[%d/%d]', st.done, st.total, st.edge.outFiles)
    })
})
