'use strict';
module.exports = {
    bailoutEv: bailoutEv
  , pad: pad
  , padRight: padRight
}

function bailoutEv(ev, err) {
    ev.emit('error', err)
    ev.emit('finish')
}

function pad(str, len) {
    while (str.length < len) str = ' ' + str
    return str
}

function padRight(str, len) {
    while (str.length < len) str = str + ' '
    return str
}
