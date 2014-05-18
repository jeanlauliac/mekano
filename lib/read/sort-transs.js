'use strict';
module.exports = sortTranss

var util = require('util')
var minimatch = require('minimatch')

function sortTranss(transs) {
    var st = {
        marks: {}
      , sorted: []
      , stack: []
      , transs: transs
      , errors: []
    }
    for (var i = 0; i < transs.length; ++i) {
        if (st.marks.hasOwnProperty(i)) continue
        visit(st, i)
    }
    return [st.sorted, st.errors]
}

function visit(st, i) {
    if (st.marks.hasOwnProperty(i)) {
        if (st.marks[i].sorted === true) return
        return st.errors.push(cycleError(st, i))
    }
    var trans = st.transs[i]
    st.marks[i] = {sorted: false, stackIndex: st.stack.length}
    for (var j = 0; j < st.transs.length; ++j) {
        if (j === i) continue
        if (st.marks.hasOwnProperty(j) && st.marks[j].sorted) continue
        var otherTrans = st.transs[j]
        var done = false
        for (var k = 0; k < trans.prereqs.length && !done; ++k) {
            for (var l = 0; l < otherTrans.targets.length && !done; ++l) {
                st.stack.push(trans.prereqs[k])
                if (intersect(trans.prereqs[k].value
                            , otherTrans.targets[l].value)) {
                    visit(st, j)
                    done = true
                }
                st.stack.pop()
            }
        }
    }
    st.marks[i].sorted = true
    st.sorted.push(st.transs[i])
}

function intersect(pattern1, pattern2) {
    return minimatch(pattern1, pattern2) ||
           minimatch(pattern2, pattern1)
}

function cycleError(st, i) {
    var index = st.marks[i].stackIndex
    var str = util.format('%s:%s', st.stack[index].location
                                 , st.stack[index].value)
    for (var j = st.stack.length - 1; j >= index; --j) {
        str += ' -> ' + util.format('%s:%s', st.stack[j].location
                                   , st.stack[j].value)
    }
    return new Error('transformation dependency cycle: ' + str)
}
