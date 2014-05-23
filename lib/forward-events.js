'use strict';
module.exports = forwardEvents

var EventEmitter = require('events').EventEmitter

function forwardEvents(to, from, onFinish, augmentError) {
    var errored = false
    if (to === null) { to = new EventEmitter() }
    from.on('error', function forwardError(err) {
        errored = true
        if (augmentError) augmentError(err)
        to.emit('error', err)
    }).on('warning', function forwardWarning(err) {
        if (augmentError) augmentError(err)
        to.emit('warning', err)
    }).on('finish', function forwardFinish() {
        var args = Array.prototype.slice.call(arguments)
        args.unshift(errored)
        if (onFinish) return onFinish.apply(null, args)
    })
    return to
}
