'use strict';
module.exports = makeConv

var INCONSISTENT_DSTAR = 'double-star must appear on both side ' +
                         'of the multi transformation'
var MUST_HAVE_STAR = 'single star must always appear ' +
                     'for a multi transformation'

function makeConv(glob, other) {
    var leftPg = glob.indexOf('**')
    var leftPt = other.indexOf('**')
    if (leftPg >= 0 && leftPt < 0 || leftPg < 0 && leftPt >= 0)
        throw new Error(INCONSISTENT_DSTAR)
    var rightPg = glob.lastIndexOf('*')
    var rightPt = other.lastIndexOf('*')
    if (rightPg < 0 || rightPt < 0)
        throw new Error(MUST_HAVE_STAR)
    if (leftPg < 0) {
        leftPg = rightPg
        leftPt = rightPt
    }
    rightPg = glob.length - rightPg - 1
    rightPt = other.length - rightPt - 1
    return function(path) {
        path = other.substr(0, leftPt) + path.substr(leftPg)
        path = path.substr(0, path.length - rightPg) +
               other.substr(other.length - rightPt)
        return path
    }
}
