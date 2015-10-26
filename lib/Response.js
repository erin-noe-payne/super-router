'use strict';
const _                = require('lodash');
const TransformStream  = require('stream').Transform;
const isReadableStream = require('isstream').isReadable;


class SuperRouterResponse {
  constructor() {
    this._locked = false;
    this.setBody();

    this._headers   = new Map();
    this.statusCode = 200;
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

  get body() {
    return this._body;
  }

  setBody(body) {
    this._body            = new TransformStream({ objectMode : true });
    this._body._transform = function (chunk, encoding, done) {
      this.push(chunk);
      return done();
    };
    this._body.on('readable', () => {
      this._locked = true;
    });

    if (isReadableStream(body)) {
      body.pipe(this._body);
    }
    else if (!_.isUndefined(body)) {
      this._body.end(body);
    }
  }

}

module.exports = SuperRouterResponse;
