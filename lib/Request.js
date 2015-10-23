'use strict';
const _               = require('lodash');
const utils           = require('./utils');
const TransformStream = require('stream').Transform;

class SuperRouterRequest extends TransformStream {
  constructor(options) {
    super();

    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }
    if (!_.isObject(options.headers)) {
      throw new TypeError('headers must be an object.');
    }

    this._headers = new Map();
    _.each(options.headers, (v, k) => {
      this._headers.set(k, v);
    });
    this.path     = options.path;
    this.method   = options.method;
    _.assign(this, options);
  }

  get path() {
    return this._path;
  }

  set path(val) {
    if (!_.isString(val)) {
      throw new TypeError('path must be a string.');
    }
    this._path = utils.normalizePath(val);
  }

  get method() {
    return this._method;
  }

  set method(val) {
    if (!(utils.isValidMethod(val))) {
      throw new TypeError('method must be a valid method string.');
    }
    return this._method = utils.normalizeMethod(val);
  }

  get headers() {
    const obj = {};
    for (const kv of this._headers) {
      console.log(kv);
      obj[kv[0]] = kv[1];
    }

    return obj;
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
