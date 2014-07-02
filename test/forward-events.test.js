'use strict';

var test = require('tape')
var forwardEvents = require('../lib/forward-events')
var EventEmitter = require('events').EventEmitter

test('forwardEvents()', function (t) {
    var to = new EventEmitter()
    var from = new EventEmitter()
    forwardEvents(to, from, function (errored, str) {
        t.equal(errored, false)
        t.equal(str, 'foobar')
        t.end()
    })
    from.emit('finish', 'foobar')
})

test('forwardEvents() w/ error', function (t) {
    var to = new EventEmitter()
    var from = new EventEmitter()
    var errors = []
    var warnings = []
    forwardEvents(to, from, function (errored, str) {
        t.equal(errored, true)
        t.equal(errors[0], 'cake')
        t.equal(errors[1], 'fizz')
        t.equal(warnings[0], 'baz')
        t.equal(str, 'foobar')
        t.end()
    })
    to.on('error', function (err) { errors.push(err) })
    to.on('warning', function (err) { warnings.push(err) })
    from.emit('error', 'cake')
    from.emit('warning', 'baz')
    from.emit('error', 'fizz')
    from.emit('finish', 'foobar')
})

test('forwardEvents.noErr()', function (t) {
    var to = new EventEmitter()
    var from = new EventEmitter()
    forwardEvents.noErr(to, from, function () {
        t.fail('shouldn\t call this')
    })
    to.on('error', function(err) { t.equal(err, 'cake') })
    to.on('finish', function () { t.end() })
    from.emit('error', 'cake')
    from.emit('finish')
})
