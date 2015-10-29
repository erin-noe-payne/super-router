'use strict';
const _       = require('lodash');
const METHODS = require('./METHODS');

/**
 * Utility class
 * @private
 */
class utils {

  /**
   * Compares two path pattern strings, as used in routing. Returns 0 if they are the same (they would match
   * the same request path). Returns 1 if the first path is a parent to the second path. Returns -1 if the
   * second path is a parent, sibling, or cousin.
   *
   * @param {String} p1 - first path string
   * @param {String} p2 - first path string
   * @returns {Number} - The comparator value
   */
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

  /**
   * Normalizes path strings for routing and requests.
   *  - Strips trailing slashes
   *  - Lowercases path parts other than route params
   *
   * @param {String} path - The path string
   * @returns {String} - The normalized path
   */
  static normalizePath(path) {
    while (_.last(path) === '/' && path.length > 1) {
      path = path.slice(0, -1);
    }
    return path.replace(/\/[^:][^\/]+/gi, (match) => {
      return match.toLowerCase();
    });
  }

  /**
   * Normalizes a method string to lower case
   *
   * @param {string} method - The method string
   * @returns {string} - The nrormalized method
   */
  static normalizeMethod(method) {
    return method.toLowerCase();
  }

  /**
   * Tests if a method string is valid.
   *
   * @param {String} method - The method string
   * @returns {Boolean} - If the method is valid
   */
  static isValidMethod(method) {
    return _.isString(method) && _.contains(METHODS, this.normalizeMethod(method));
  }
}

module.exports = utils;
