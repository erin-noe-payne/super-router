'use strict';
const _           = require('lodash');
const Q           = require('q');
const utils       = require('./utils');
const METHODS     = require('./METHODS');
const Request     = require('./Request');
const Response    = require('./Response');
const RouteParser = require('route-parser');

/**
 * Route class.
 * A route is defined as a path pattern, method, and handler. Testing requests against routes and executing matching
 * handlers is the core of request processing.
 */
class Route {

  /**
   * Instantiates a new Route.
   *
   * @param {Object} options - The options object
   * @param {Function} options.handler - The handler function to be executed if the route is matched.
   * @param {Function} options.errorHandler - The handler function to be executed if the route throws an error.
   * @param {String} [path='*all'] - The path pattern that the route should be executed against. If not provided,
   *  matches all paths.
   * @param {String | Array} [method='*'] - The method(s) that the route should be executed against. If not provided, mathes
   *  all methods.
   * @returns {Route} - The new route instance.
   */
  constructor(options) {
    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }
    if (!_.isFunction(options.handler)) {
      throw new TypeError('handler must be a function.');
    }
    if (!_.isUndefined(options.errorHandler) && !_.isFunction(options.errorHandler)) {
      throw new TypeError('errorHandler must be a function.');
    }
    if (options.path && !_.isString(options.path)) {
      throw new TypeError('path must be a string.');
    }
    if (options.methods && !utils.isValidMethodArray(options.methods)) {
      throw new TypeError('method must be a valid method string.');
    }

    _.extend(this, options);

    this._path    = utils.normalizePath(options.path || '*all');
    this._methods = this._convertAndNormalizeMethods(options.methods || METHODS.ALL);
    this._handler = options.handler;
    this._errorHandler = options.errorHandler;
    this._parsed  = new RouteParser(this._path);
  }

  /**
   * Returns the route path.
   *
   * @returns {String} - The route path.
   */
  get path() {
    return this._path;
  }

  /**
   * Returns the route method.
   *
   * @returns {String} - The route method.
   */
  get methods() {
    return this._methods;
  }

  /**
   * Returns the route handler.
   *
   * @returns {Function} - The route handler.
   */
  get handler() {
    return this._handler;
  }

  /**
   * Returns the error handler.
   *
   * @returns {Function} - The error handler.
   */
  get errorHandler() {
    return this._errorHandler;
  }

  /**
   * Tests if the given method matches this route
   *
   * @param {String} method - The input method
   * @returns {boolean} - If the method matches this route
   * @private
   */
  _isMethodMatch(method) {
    return (_.contains(this.methods, METHODS.ALL)) || (_.difference(this._convertAndNormalizeMethods(method), this.methods).length === 0);
  }

  /**
   * Converts and normalize method(s) to an array
   *
   * @param {Array | String} methodArray - The input method
   * @returns {Array} - Array of methods
   * @private
   */
  _convertAndNormalizeMethods(methodArray) {
    return this._normalizeAllMethods(this._convertMethodsToArray(methodArray));
  }

  /**
   * Converts method(s) to an array
   *
   * @param {Array | String} methodArray - The input method
   * @returns {Array} - Array of methods
   * @private
   */
  _convertMethodsToArray(methodArray) {
    if (!_.isArray(methodArray)) {
      methodArray = [methodArray];
    }
    return methodArray;
  }

  /**
   * Normalizes all methods in an array
   *
   * @param {Array} methodArray - The input method
   * @returns {Array} - Array of normalized methods
   * @private
   */
  _normalizeAllMethods(methodArray) {
    return _.map(methodArray, function (method) {
      return utils.normalizeMethod(method);
    });
  }

  /**
   * Parses the given path string against this route's path pattern. If the input path is a match, returns
   * an object whose key value pairs are the matched route params and their values. If the path is not a match,
   * returns false.
   *
   * @param {String} path - The input path
   * @returns {Boolean|Object} - False if the path is not a match, an object if it is.
   * @private
   */
  _parsePath(path) {
    return this._parsed.match(path);
  }

  /**
   * Tests whether a given request object is a match against this route, satisfying the path & method requirements.
   *
   * @param {Request} request - The input requiest
   * @returns {Boolean} - Whether the request matches this route.
   */
  isMatch(request) {
    if (!(request instanceof Request)) {
      throw new Error('First argument: request must be a SuperRouter Request instance.');
    }
    return this._isMethodMatch(request.method) && _.isObject(this._parsePath(request.path));
  }

  /**
   * Executes this route against a provided request / response. Returns a promise that will resolve or reject when
   * execution is complete.
   *  - If the request is not a match, returns an empty promise.
   *  - If the request is a match, returns a promise for the return value of the route handler
   *
   * @param {Object} options - The options object
   * @param {Request} options.request - The request the route will be tested & executed against
   * @param {Response} options.response - The response the route handler will be invoked with
   * @returns {Promise} - A promise that will complete when execution is complete.
   */
  execute(options) {
    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }

    const request  = options.request;
    const response = options.response;

    if (!(request instanceof Request)) {
      throw new Error('request must be a SuperRouter Request instance.');
    }
    if (!(response instanceof Response)) {
      throw new Error('response must be a SuperRouter Response instance.');
    }

    request.routeParams = {};
    if (!this.isMatch(request)) {
      return Q();
    }
    try {
      request.routeParams = this._parsePath(request.path);
      if (this.errorHandler) {
        return Q(Q(this.handler(options)).catch((error) => {
          return this.errorHandler({ request, response, error });
        }));
      }
      else {
        return Q(this.handler(options));
      }
    }
    catch (err) {
      return Q.reject(err);
    }
  }

}

module.exports = Route;
