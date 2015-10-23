'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _                 = require('lodash');
const PassThrough       = require('stream').PassThrough;

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Response = require('./..').Response;
let response;

describe('SuperRouterResponse', () => {

  beforeEach(() => {
    response = new Response();
  });

  describe('constructor', () => {
    it('should use defaults if no options are provided', () => {
      expect(() => {
        new Response();
      }).to.not.throw();
    });

    it('should throw if options.headers is not defined', () => {
      expect(() => {
        new Response({});
      }).to.throw('headers must be an object');
    });

    it('should throw if options.headers is not an object', () => {
      expect(() => {
        new Response({ headers : 7 });
      }).to.throw('headers must be an object');
    });

    it('should throw if options.headers is not defined', () => {
      expect(() => {
        new Response({headers : {}});
      }).to.throw('statusCode must be a number');
    });

    it('should throw if options.headers is not an object', () => {
      expect(() => {
        new Response({ headers : {}, statusCode : 'asdf' });
      }).to.throw('statusCode must be a number');
    });

    it('should allow construction from a previous response instance', () => {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');

      const res2 = new Response(response);
      expect(res2.statusCode).to.equal(500);
      expect(res2.headers).to.eql({
        'Content-Type' : 'application/json'
      });
    });

    it('should allow arbitrary properties from the constructor', () => {
      response.thing = 7;

      const res2 = new Response(response);
      expect(res2.thing).to.equal(7);
    });

    it('should not propagate changes from the original response to the new one', () => {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.a          = { b : 3 };
      const res2          = new Response(response);
      response.statusCode = 600;
      response.setHeader('Content-Type', 'application/xml');
      response.a.b        = 4;

      expect(res2.statusCode).to.equal(500);
      expect(res2.headers).to.eql({
        'Content-Type' : 'application/json'
      });
      expect(res2.a.b).to.equal(4);
    });

    it('should not inherit internal state from the original response', () => {
      response._locked = true;

      const res2 = new Response(response);
      expect(res2._locked).to.be.false;
    });
  });

  describe('statusCode', () => {
    it('should default to 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should throw an error if assigned a non-numeric value', () => {
      expect(() => {
        response.statusCode = 'asdf';
      }).to.throw('statusCode must be a number.');
    });

    it('should be assignable', () => {
      response.statusCode = 500;
      expect(response.statusCode).to.equal(500);
    });
  });

  describe('headers', () => {
    it('should return undefined for an undefined header', () => {
      expect(response.getHeader('asdf')).to.be.undefined;
    });

    it('should throw if set key is not defined', () => {
      expect(() => {
        response.setHeader();
      }).to.throw('First argument: key must be a string.');
    });

    it('should throw if set key is not a string', () => {
      expect(() => {
        response.setHeader(7);
      }).to.throw('First argument: key must be a string.');
    });

    it('should throw if set value is not defined', () => {
      expect(() => {
        response.setHeader('Content-Type');
      }).to.throw('Second argument: value must be a string.');
    });

    it('should throw if set value is not a string', () => {
      expect(() => {
        response.setHeader('Content-Type', 7);
      }).to.throw('Second argument: value must be a string.');
    });

    it('should be settable', () => {
      response.setHeader('Content-Type', 'application/json');
      expect(response.getHeader('Content-Type')).to.equal('application/json');
    });

    it('should allow clearing of headers', () => {
      response.setHeader('Content-Type', 'application/json');
      expect(response.getHeader('Content-Type')).to.equal('application/json');
      response.clearHeader('Content-Type');
      expect(response.getHeader('Content-Type')).to.be.undefined;
    });
  });

  describe('streaming', () => {
    let inStream;
    let outStream;

    beforeEach(() => {
      inStream  = new PassThrough();
      outStream = new PassThrough();
      inStream.pipe(response).pipe(outStream);
    });

    it('should extend Transform stream', () => {
      expect(response).to.be.instanceof(require('stream').Transform);
    });

    it('should be readable and writable', (done) => {
      inStream.end('hello world');
      outStream.on('data', (chunk) => {
        expect(chunk.toString()).to.equal('hello world');
        done();
      });
    });

    it('should lock headers once data is written to the pipe', (done) => {
      response.setHeader('Content-Type', 'application/json');

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.setHeader('Content-Type', 'application/xml');
        }).to.throw('Cannot set headers after writing to the response.');
        done();
      });
    });

    it('should error on clear header once data is written to the pipe', (done) => {
      response.setHeader('Content-Type', 'application/json');

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.clearHeader('Content-Type');
        }).to.throw('Cannot set headers after writing to the response.');
        done();
      });
    });

    it('should lock statusCode once data is written to the pipe', (done) => {
      response.statusCode = 404;

      inStream.end('chunk');
      outStream.on('data', () => {
        expect(() => {
          response.statusCode = 405;
        }).to.throw('Cannot set statusCode after writing to the response.');
        done();
      });
    });


  });

});
