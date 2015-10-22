'use strict';
const _               = require('lodash');
const TransformStream = require('stream').Transform;
const METHODS = require('./METHODS')

class SuperRouterRequest extends TransformStream {
  constructor(options) {
    super();

    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }
    if (!_.isObject(options.headers)) {
      throw new TypeError('headers must be an object.');
    }
    if (!_.isString(options.path)) {
      throw new TypeError('path must be a string.');
    }
    if (!(_.isString(options.method)
      && _.contains(METHODS, options.method.toLocaleLowerCase()))) {
      throw new TypeError('method must be a valid method string.');
    }

    this._headers = new Map();
    _.each(options.headers, (v, k) => {
      this._headers.set(k, v);
    });
    this._path    = options.path;
    this._method  = options.method;
  }

  get path() {
    return this._path;
  }

  get method() {
    return this._method;
  }

  getHeader(key) {
    return this._headers.get(key);
  }

  _transform(chunk, encoding, done) {
    this.push(chunk);
    return done();
  }

}

module.exports = SuperRouterRequest;
