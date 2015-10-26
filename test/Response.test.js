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

const Response = require('./..').Response;
let response;

describe('Response', () => {

  beforeEach(() => {
    response = new Response();
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

  describe('body', () => {
    let inStream;
    let outStream;

    beforeEach(() => {
      inStream  = new PassThrough();
      outStream = new PassThrough();
    });

    describe('property', () => {
      beforeEach(() => {
        inStream.pipe(response.body).pipe(outStream);
      });

      it('should extend Transform stream', () => {
        expect(response.body).to.be.instanceof(Transform);
      });

      it('should be readable and writable', (done) => {
        inStream.end('hello world');
        outStream.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('hello world');
          done();
        });
      });

      it('should throw if you assign to body', () => {
        expect(() => {
          response.body = 'asdf';
        }).to.throw('Cannot set property');
      });
    });

    describe('#setBody', () => {

      it('should pipe if the input is a readable stream', (done) => {
        inStream.end('hello world');

        response.setBody(inStream);
        response.body.pipe(outStream);

        outStream.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('hello world');
          done();
        });
      });

      it('should .end to itself with the input value otherwise', (done) => {
        response.setBody('goodbye cruel world');
        response.body.pipe(outStream);

        outStream.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('goodbye cruel world');
          done();
        });
      });

      it('should break piping from previous sources', (done) => {
        inStream.end('hello world');
        inStream.pipe(response.body);

        response.setBody('goodbye cruel world');
        response.body.pipe(outStream);

        outStream.on('data', (chunk) => {
          expect(chunk.toString()).to.equal('goodbye cruel world');
          done();
        });
      });
    });

    describe('#getBody', () => {
      it('should return a reference to the body stream after construction', () => {
        response = new Response();

        expect(response.getBody()).to.equal(response.body);
      });

      it('should return a reference to the body stream after we setBody to a readable stream ', () => {
        response.setBody(inStream);
        expect(response.getBody()).to.equal(response.body);
      });

      it('should return a reference to the assigned balue if we setBody to a non-stream value', () => {
        response.setBody('hello world');
        expect(response.getBody()).to.equal('hello world');
      });
    });

  });


});
