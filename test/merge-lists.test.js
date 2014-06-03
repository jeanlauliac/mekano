'use strict';

var test = require('tape')
var mergeLists = require('../lib/merge-lists')

var TEST_A_LIST = [5, 2, 3, 0, 7, 1, 4]
var TEST_B_LIST = [6, 3, 4, 5, 1, 7]
var TEST_RES_LIST = [0, 1, 2, 3, 4, 5, 6, 7]

test('mergeLists()', function (t) {
    var l = mergeLists(TEST_A_LIST, TEST_B_LIST, numberComp)
    t.same(l, TEST_RES_LIST)
    t.end()
})

function numberComp(a, b) {
    return a - b
}
