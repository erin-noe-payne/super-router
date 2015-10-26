'use strict';
const _                = require('lodash');
const utils            = require('./utils');
const TransformStream  = require('stream').Transform;
const isReadableStream = require('isstream').isReadable;

class SuperRouterRequest {
  constructor(options) {
    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }

    const headers = options.headers;
    const body    = options.body;

    if (headers != null && !_.isObject(headers)) {
      throw new TypeError('headers must be an object.');
    }
    if (body != null && !isReadableStream(body)) {
      throw new TypeError('body must be a readable stream.');
    }

    this.path   = options.path;
    this.method = options.method;

    this._originalPath    = options.originalPath || options.path;
    this._headers         = new Map();
    _.each(headers, (v, k) => {
      this._headers.set(k, v);
    });
    this._body            = new TransformStream();
    this._body._transform = function (chunk, encoding, done) {
      this.push(chunk);
      return done();
    };
    if (isReadableStream(body)) {
      body.pipe(this._body);
    }

    _.each(options, (v, k) => {
      if (_.isUndefined(this[k])) {
        this[k] = v;
      }
    });
  }

  get originalPath() {
    return this._originalPath;
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
      obj[kv[0]] = kv[1];
    }

    return obj;
  }

  getHeader(key) {
    return this._headers.get(key);
  }

  get body() {
    return this._body;
  }

  set body(val) {
    this._body = val;
  }


}

module.exports = SuperRouterRequest;
