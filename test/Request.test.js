'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _                 = require('lodash');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Request = require('./..').Request;
let request;

describe('SuperRouterRequest', () => {

  describe('constructor', () => {
    const OPTIONS_ERROR = 'options must be an object.';
    const HEADERS_ERROR = 'headers must be an object.';
    const PATH_ERROR    = 'path must be a string.';
    const METHOD_ERROR  = 'method must be a valid method string.';

    it('should throw if options is undefined', () => {
      expect(() => {
        new Request();
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if options is not an object', () => {
      expect(() => {
        new Request('asdf');
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if options.headers is undefined', () => {
      expect(() => {
        new Request({});
      }).to.throw(HEADERS_ERROR);
    });

    it('should throw if options.headers is not an object', () => {
      expect(() => {
        new Request({ headers : 'asdf' });
      }).to.throw(HEADERS_ERROR);
    });

    it('should throw if options.path is undefined', () => {
      expect(() => {
        new Request({ headers : {} });
      }).to.throw(PATH_ERROR);
    });

    it('should throw if options.path is not a string', () => {
      expect(() => {
        new Request({ headers : {}, path : 7 });
      }).to.throw(PATH_ERROR);
    });

    it('should throw if options.method is undefined', () => {
      expect(() => {
        new Request({ headers : {}, path : '/' });
      }).to.throw(METHOD_ERROR);
    });

    it('should throw if options.method is not a string', () => {
      expect(() => {
        new Request({ headers : {}, path : '/', method : 7 });
      }).to.throw(METHOD_ERROR);
    });

    it('should throw if options.method is not an allowed method value', () => {
      expect(() => {
        new Request({ headers : {}, path : '/', method : 'heart!' });
      }).to.throw(METHOD_ERROR);
    });
  });

  describe('properties', () => {
    beforeEach(() => {
      request = new Request({
        headers : { hello : 'world' },
        path    : '/',
        method  : 'get'
      });
    });

    it('should set properties based on constructed values', () => {
      expect(request.getHeader('hello')).to.equal('world');
      expect(request.path).to.equal('/');
      expect(request.method).to.equal('get');
    });

    it('should defensively copy to protect itself from upstream changes on the headers object', () => {
      const headers = {};
      request       = new Request({
        headers : headers,
        path    : '/',
        method  : 'get'
      });

      headers.a = 1;

      expect(request.getHeader('a')).to.eql(undefined);
    });

    _.each(['path', 'method'], (propertyName) => {
      it(`should throw on assignment to the ${propertyName} property`, () => {
        expect(() => {
          request[propertyName] = 7;
        }).to.throw('Cannot set property');
      });
    });

    it('should allow assignment of arbitrary properties', () => {
      request.body = {};
      expect(request.body).to.eql({});
    });

  });

  describe('streaming', () => {
    beforeEach(() => {
      request = new Request({ headers : {}, path : '/', method : 'get' });
    });

    it('should extend Transform stream', () => {
      expect(request).to.be.instanceof(require('stream').Transform);
    });

    it('should be readable and writable', (done) => {
      const PassThrough = require('stream').PassThrough;
      const inStream = new PassThrough();
      const outStream = new PassThrough();

      inStream.pipe(request).pipe(outStream);

      inStream.end('hello world');
      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('hello world');
        done();
      });
    });
  });

});
