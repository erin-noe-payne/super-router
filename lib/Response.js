'use strict';
const _               = require('lodash');
const TransformStream = require('stream').Transform;


class SuperRouterResponse extends TransformStream {
  constructor(options) {
    super({ objectMode : true });

    if (!_.isObject(options)) {
      options = {
        headers    : {},
        statusCode : 200
      };
    }

    if (!_.isObject(options.headers)) {
      throw new TypeError('headers must be an object');
    }

    this._locked = false;
    this.on('readable', () => {
      this._locked = true;
    });

    this._headers   = new Map();
    _.each(options.headers, (v, k) => {
      this._headers.set(k, v);
    });
    this.statusCode = options.statusCode;

    _.each(options, (v, k) => {
      if (_.isUndefined(this[k])) {
        this[k] = v;
      }
    });
  }

  get statusCode() {
    return this._statusCode;
  }

  set statusCode(val) {
    if (this._locked) {
      throw new Error('Cannot set statusCode after writing to the response.');
    }
    if (!_.isNumber(val)) {
      throw new TypeError('statusCode must be a number.');
    }
    this._statusCode = val;
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

  setHeader(key, value) {
    if (this._locked) {
      throw new Error('Cannot set headers after writing to the response.');
    }
    if (!_.isString(key)) {
      throw new TypeError('First argument: key must be a string.');
    }
    if (!_.isString(value)) {
      throw new TypeError('Second argument: value must be a string.');
    }
    return this._headers.set(key, value);
  }

  clearHeader(key) {
    if (this._locked) {
      throw new Error('Cannot set headers after writing to the response.');
    }

    this._headers.delete(key);
  }

  _transform(chunk, encoding, done) {
    this.push(chunk);
    return done();
  }

}

module.exports = SuperRouterResponse;
