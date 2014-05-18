'use strict';

var test = require('tape')
var identify = require('../../lib/update/identify')

var TEST_LOG = {
    isUpToDate: function () {
        return false
    }
}

var tg = require('../test-graph')
var TEST_FILES = [tg.foo_c, tg.foo_o, tg.bar_c, tg.bar_o, tg.a_out]

test('update.identify()', function (t) {
    var edges = identify(TEST_LOG, TEST_FILES, {})
    t.equals(edges[0], tg.foo_o.inEdge)
    t.equals(edges[1], tg.bar_o.inEdge)
    t.equals(edges[2], tg.a_out.inEdge)
    t.end()
})
