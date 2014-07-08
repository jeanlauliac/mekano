'use strict';
module.exports = forwardEvents

var EventEmitter = require('events').EventEmitter
var errors = require('../lib/errors')

function forwardEvents(to, from, onFinish, augmentError) {
    var errored = false
    if (to === null) to = new EventEmitter()
    if (!(to instanceof EventEmitter)) throw errors.invalidArg('to', to)
    if (!(from instanceof EventEmitter)) throw errors.invalidArg('from', from)
    if (onFinish && typeof onFinish !== 'function')
        throw errors.invalidArg('onFinish', onFinish)
    if (augmentError && typeof augmentError !== 'function')
        throw errors.invalidArg('augmentError', augmentError)
    from.on('error', function forwardError(err) {
        errored = true
        if (augmentError) augmentError(err)
        to.emit('error', err)
    }).on('warning', function forwardWarning(err) {
        if (augmentError) augmentError(err)
        to.emit('warning', err)
    }).on('finish', function forwardFinish() {
        var args = Array.prototype.slice.call(arguments)
        if (onFinish) {
            args.unshift(errored)
            return onFinish.apply(null, args)
        }
        to.emit.apply(to, ['finish'].concat(args))
    })
    return to
}

forwardEvents.noErr = function noErr (to, from, onSuccess, augmentError) {
    return forwardEvents(to, from, function noErrFinish() {
        var args = Array.prototype.slice.call(arguments)
        var errored = args.shift()
        if (errored) return to.emit('finish')
        onSuccess.apply(null, args)
    }, augmentError)
}
