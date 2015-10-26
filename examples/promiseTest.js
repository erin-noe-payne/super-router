'use strict';
const Q = require('q');

Q().then(() => {
  return fn();
}).then(() => {

}).then(() => {

}).catch(console.error);

function fn() {
  try {
    toss();
  } catch (err) {
    return Q.reject(err);
  }
}

function toss() {
  _.find();
}
