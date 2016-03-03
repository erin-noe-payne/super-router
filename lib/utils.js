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
    let uri;
    let querystring = '';
    const startOfQuerystring = path.indexOf('?');

    // split up the querystring and uri, so we don't mess with querystring values
    if (startOfQuerystring !== -1) {
      uri = path.slice(0, startOfQuerystring);
      querystring = path.slice(startOfQuerystring);
    }
    else {
      uri = path;
    }

    // remove trailing slashes
    while (_.last(uri) === '/' && uri.length > 1) {
      uri = uri.slice(0, -1);
    }

    // lowercase everything that isn't a route param
    uri = uri.replace(/\/[^:][^\/]+/gi, (match) => {
      return match.toLowerCase();
    });

    return uri + querystring;
  }

  /**
   * Normalizes a method string to lower case
   *
   * @param {string} method - The method string
   * @returns {string} - The nrormalized method
   */
  static normalizeMethod(method) {
    return method.toUpperCase();
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

  /**
  * Tests if a method array is valid.
  *
  * @param {Array} methodArray - The method array
  * @returns {Boolean} - If the method array is valid
  */
  static isValidMethodArray(methodArray) {
    if (_.isArray(methodArray)) {
      return _.every(methodArray, (method) => {
        return this.isValidMethod(method);
      });
    }
    else {
      return this.isValidMethod(methodArray);
    }
  }
}

module.exports = utils;
