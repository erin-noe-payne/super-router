'use strict';
const _               = require('lodash');
const TransformStream = require('stream').Transform;


class SuperRouterResponse extends TransformStream {
  constructor() {
    super();

    this._locked     = false;
    this._headers    = new Map();
    this._statusCode = 200;

    this.on('readable', () => {
      this._locked = true;
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
