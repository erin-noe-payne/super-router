'use strict';
const _       = require('lodash');
const METHODS = require('./METHODS');

class utils {

  static comparePaths(p1, p2) {
    const PARAM_RE = /\/:[^\/]+/gi;
    p1             = p1.replace(PARAM_RE, '/:');
    p2             = p2.replace(PARAM_RE, '/:');

    if (p1 === p2) {
      return 0;
    }
    if (_.startsWith(p1, p2)) {
      return 1;
    }
    return -1;

  }

  static normalizePath(path) {
    if (_.last(path) === '/' && path.length > 1) {
      path = path.slice(0, -1);
    }
    return path.toLowerCase();
  }

  static normalizeMethod(method) {
    return method.toLowerCase();
  }

  static isValidMethod(method) {
    return _.isString(method) && _.contains(METHODS, this.normalizeMethod(method));
  }
}

module.exports = utils;
