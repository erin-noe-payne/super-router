'use strict';
const _           = require('lodash');
const Q           = require('q');
const utils       = require('./utils');
const METHODS     = require('./METHODS');
const Request     = require('./Request');
const Response    = require('./Response');
const RouteParser = require('route-parser');

class Route {
  constructor(options) {
    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }
    if (!_.isFunction(options.handler)) {
      throw new TypeError('handler must be a function.');
    }
    if (options.path && !_.isString(options.path)) {
      throw new TypeError('path must be a string.');
    }
    if (options.method && !utils.isValidMethod(options.method)) {
      throw new TypeError('method must be a valid method string.');
    }

    this._path    = utils.normalizePath(options.path || '*all');
    this._method  = utils.normalizeMethod(options.method || METHODS.ALL);
    this._handler = options.handler;
    this._parsed  = new RouteParser(this._path);

    _.extend(this, options);
  }

  get path() {
    return this._path;
  }

  get method() {
    return this._method;
  }

  get handler() {
    return this._handler;
  }

  _isMethodMatch(method) {
    return (this.method === METHODS.ALL) || (this.method === utils.normalizeMethod(method));
  }

  _parsePath(path) {
    return this._parsed.match(path);
  }

  isMatch(request) {
    if (!(request instanceof Request)) {
      throw new Error('First argument: request must be a SuperRouter Request instance.');
    }
    return this._isMethodMatch(request.method) && _.isObject(this._parsePath(request.path));
  }

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
      return Q(this.handler({ request, response }));
    }
    catch (err) {
      return Q.reject(err);
    }
  }

}

module.exports = Route;
