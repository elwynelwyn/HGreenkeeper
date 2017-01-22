'use strict';
module.exports = {
    promiseSequence
};

function promiseSequence (tasks) {
    return tasks.reduce((cur, next) => cur.then(next), Promise.resolve());
}
