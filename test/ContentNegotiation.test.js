'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const PassThrough       = require('stream').PassThrough;
const Transform         = require('stream').Transform;

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Request = require('./..').Request;
const Response = require('./..').Response;
const ContentNegotiation = require('./../lib/middleware/ContentNegotiation.js');

describe('Content Negotiation Middleware', () => {
  describe('exports', () => {
    it('export a middleware function for request', () => {
      expect(ContentNegotiation.request).to.be.a('function');
    });

    it('export a middleware function for response', () => {
      expect(ContentNegotiation.response).to.be.a('function');
    });
  });

  describe('request', () => {

    let request;

    describe('buffering', () => {
      beforeEach(() => {
        request = new Request({
          path    : '/',
          method  : 'get',
          headers : {},
          body    : new PassThrough()
        });
      });

      it('if there is no Content-Type, it should try to parse as json and overwrite body', (done) => {
        const requestData = { hello : 'world' };
        request.body.end(JSON.stringify(requestData));
        ContentNegotiation.request({ request }).then(() => {
          expect(request.body).to.eql(requestData);
          done();
        });

      });

      it('should throw an error if parsing fails', (done) => {
        request.body.end('this is not json');
        ContentNegotiation.request({ request }).catch((error) => {
          expect(error.message).to.equal('failed to parse json in request');
          done();
        });
      });

      it('should set the body to null if nothing is streamed in', (done) => {
        request.body.end();
        ContentNegotiation.request({ request }).then(() => {
          expect(request.body).to.be.null;
          done();
        });

      });

    });
    describe('non-buffering', () => {

      beforeEach(() => {
        const headers = {};
        headers['Transfer-Encoding'] = 'chunked';
        request = new Request({
          path    : '/',
          method  : 'get',
          headers : headers,
          body    : new PassThrough()
        });
      });

      it('should do nothing to the response stream if content-type is multipart', (done) => {
        request.body.end('chunked data');
        ContentNegotiation.request({ request });
        expect(request.body instanceof Transform).to.be.true;
        request.body.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('chunked data');
          done();
        });
      });

    });

  });

  describe('response', () => {
    let request;
    let response;

    beforeEach(() => {
      request = new Request({
        path    : '/',
        method  : 'get',
        headers : {},
        body    : new PassThrough()
      });

      response = new Response();
    });

    describe('JSON', () => {
      it('should treat the response body as JSON and write it as a new stream if no headers are present', (done) => {
        response.setBody({ hello : 'world' });
        ContentNegotiation.response({ request, response });
        response.body.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('{"hello":"world"}');
          expect(response.getHeader('content-type')).to.equal('application/json');
          done();
        });
      });

    });

  });
});
