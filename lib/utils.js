'use strict';
const _       = require('lodash');
const METHODS = require('./METHODS');

class utils {

  static normalizePath(path) {
    if (_.last(path) === '/' && path.length > 1) {
      return path.slice(0, -1);
    }
    return path;
  }

  static normalizeMethod(method) {
    return method.toLowerCase();
  }

  static isValidMethod(method) {
    return _.isString(method) && _.contains(METHODS, this.normalizeMethod(method));
  }
}

module.exports = utils;
