'use strict';
const _                = require('lodash');
const utils            = require('./utils');
const TransformStream  = require('stream').Transform;
const isReadableStream = require('isstream').isReadable;

/**
 * SuperRouter Request object.
 */
class Request {
  /**
   * Constructs a new request object.
   *
   * @param {object} options
   * @param {string} path - The request path
   * @param {string} method - The request method
   * @param {object} [headers={}] - The request headers
   * @param {ReadableStream} [body] - The request body stream
   * @returns {Request} Request object
   */
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
      this._headers.set(k.toLowerCase(), v.toLowerCase());
    });
    this._body            = new TransformStream();
    this._body._transform = function (chunk, encoding, done) {
      return done(null, chunk);
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

  /**
   * Returns the original path of the request. The original path is the path that the request
   * was initialized with, and cannot be changed, even if the path is later updated.
   *
   * @returns {string} - Original path
   */
  get originalPath() {
    return this._originalPath;
  }

  /**
   * Returns the request path
   *
   * @returns {string} - Request path
   */
  get path() {
    return this._path;
  }

  /**
   * Sets the request path.
   *
   * @param {string} path - The new request path
   * @returns {void}
   */
  set path(path) {
    if (!_.isString(path)) {
      throw new TypeError('path must be a string.');
    }
    this._path = utils.normalizePath(path);
  }

  /**
   * Returns the request method. Request method will be lower-cased.
   *
   * @returns {string} - The request method.
   */
  get method() {
    return this._method;
  }

  /**
   * Sets the request method. Input is case-insensitive.
   *
   * @param {string} method - The new request method.
   * @returns {void}
   */
  set method(method) {
    if (!(utils.isValidMethod(method))) {
      throw new TypeError('method must be a valid method string.');
    }
    this._method = utils.normalizeMethod(method);
  }

  /**
   * Returns the request headers as a plain object. Keys and values are lower-cased.
   *
   * @returns {object} - The request headers.
   */
  get headers() {
    const obj = {};
    for (const kv of this._headers) {
      obj[kv[0]] = kv[1];
    }

    return obj;
  }

  /**
   * Returns the value of a request header. Input is case-insensitive.
   *
   * @param {string} key - The request header key
   * @returns {string} - The request header value
   */
  getHeader(key) {
    return this._headers.get(key.toLowerCase());
  }

  /**
   * Returns the underlying request body stream.
   *
   * @returns {TransformStream} - The request body stream.
   */
  get body() {
    return this._body;
  }

  /**
   * Sets the request body value.
   *
   * @param {*} val - The new request body value.
   * @returns {void}
   */
  set body(val) {
    this._body = val;
  }
}

module.exports = Request;
