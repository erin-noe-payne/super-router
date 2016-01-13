'use strict';
const _                = require('lodash');
const TransformStream  = require('stream').Transform;
const isReadableStream = require('isstream').isReadable;

/**
 * SuperRouter Response object.
 */
class Response {
  constructor() {
    this.setBody();

    this._headers   = new Map();
    this._statusCode = 200;
    this.ended = false;
  }

  /**
   * Gets the status code of the response.
   * @returns {number} - the status code
   */
  get statusCode() {
    return this._statusCode;
  }

  /**
   * Sets the status code of the response.
   * @param {number} val - The new status code
   * @returns {void}
   */
  set statusCode(val) {
    if (!_.isFinite(val)) {
      throw new TypeError('statusCode must be a number.');
    }
    this._statusCode = val;
  }

  /**
   * Gets the headers of the response as a plain object. Response header key / value pairs are all
   * lower-cased.
   * @returns {Object} - Response headers
   */
  get headers() {
    const obj = {};
    for (const kv of this._headers) {
      obj[kv[0]] = kv[1];
    }

    return obj;
  }

  /**
   * Gets the value of a response header. Keys are case-insensitive. Returns undefined if the header
   * is not set.
   * @param {string} key - the header key
   * @returns {string} - the header value.
   */
  getHeader(key) {
    if (!_.isString(key)) {
      throw new TypeError('First argument: key must be a string.');
    }
    return this._headers.get(key.toLowerCase());
  }

  /**
   * Sets the value of a response header. Keys and values are case-insensitive.
   * @param {string} key - the response header key
   * @param {string} value - the response header value
   * @returns {void}
   */
  setHeader(key, value) {
    if (!_.isString(key)) {
      throw new TypeError('First argument: key must be a string.');
    }
    if (!_.isString(value)) {
      throw new TypeError('Second argument: value must be a string.');
    }
    this._headers.set(key.toLowerCase(), value);
  }

  /**
   * Clears the value of a response header.
   * @param {string} key - the response header to clear
   * @returns {void}
   */
  clearHeader(key) {
    if (!_.isString(key)) {
      throw new TypeError('First argument: key must be a string.');
    }
    this._headers.delete(key.toLowerCase());
  }

  /**
   * Returns the underlying response body stream.
   * @returns {TransformStream} - The response body stream.
   */
  get body() {
    return this._body;
  }

  /**
   * Returns the response body according to how it was most recently set. If the body is being
   * used as a stream, will return the body stream. If the body is being written with values, will
   * return the last assigned value.
   * @returns {*} - The response body value
   */
  getBody() {
    return this._lastAssignedBody;
  }

  /**
   * Sets the value of the response body. If the value is a readable stream, it will be piped into
   * the underlying response body stream. If the value is plain type, it will be written to the
   * underlying body stream.
   * @param {ReadableStream|*} body - The new body value
   * @returns {void}
   */
  setBody(body) {
    this._body             = new TransformStream({ objectMode : true });
    this._body._transform  = function (chunk, encoding, done) {
      return done(null, chunk);
    };
    this._lastAssignedBody = this._body;

    if (isReadableStream(body)) {
      body.pipe(this._body);
      body.on('error', (err) => {
        this._body.emit('error', err);
      });
    }
    else if (!_.isUndefined(body)) {
      this._body.end(body);
      this._lastAssignedBody = body;
    }
  }

  /**
   * Sets the ended property to signal an early return of the Response
   * @returns {void}
   */
  end() {
    this.ended = true;
  }

  /**
   * Returns a string representation of the response
   *
   * @returns {string} - representation of the response
   */
  toString() {

    const copyOfHeaders = _.clone(this.headers);
    const authInfo = copyOfHeaders.authorization;
    if (authInfo != null) {
      copyOfHeaders.authorization = `...${authInfo.slice(-4)}`;
    }

    return `Response: ${JSON.stringify({
      statusCode : this.statusCode,
      headers    : this.headers,
      body       : this.getBody()
    }, null, 2)}`;
  }

}

module.exports = Response;
