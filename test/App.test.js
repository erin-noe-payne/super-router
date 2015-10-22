'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const proxyquire        = require('proxyquire');
const _                 = require('lodash');
const Q                 = require('q');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect  = chai.expect;
const sandbox = sinon.sandbox.create();

const Request  = require('../lib/Request');
const Response = require('../lib/Response');
const Route    = require('../lib/Route');

let App;
let app;

describe.only('App', () => {

  beforeEach(() => {
    App = require('../lib/App');
    app = new App();
  });

  describe('constructor', () => {

  });

  describe('use', () => {
    let mockRoute;

    beforeEach(() => {
      mockRoute = sinon.spy();
      App       = proxyquire('../lib/App', {
        './Route' : mockRoute
      });
      app       = new App();
    });


    it('should run the input through the Route constructor if it is not a Route instance', () => {
      const opts = {};
      app.use(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should not run the input through the Route constructor if it is a Route instance', () => {
      const route = new mockRoute({ handler : sinon.spy() });
      mockRoute.reset();

      app.use(route);
      expect(mockRoute).to.not.have.been.called;
    });
  });

  describe('useError', () => {
    let mockRoute;

    beforeEach(() => {
      mockRoute = sinon.spy();
      App       = proxyquire('../lib/App', {
        './Route' : mockRoute
      });
      app       = new App();
    });


    it('should run the input through the Route constructor if it is not a Route instance', () => {
      const opts = {};
      app.useError(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should not run the input through the Route constructor if it is a Route instance', () => {
      const route = new mockRoute({ handler : sinon.spy() });
      mockRoute.reset();

      app.useError(route);
      expect(mockRoute).to.not.have.been.called;
    });
  });

  describe('processRequest', () => {
    let request;
    let middleware1;
    let middleware2;
    let errMiddleware1;
    let errMiddleware2;

    beforeEach(() => {
      request = new Request({
        headers : {},
        path    : '/a',
        method  : 'get'
      });

      middleware1 = sinon.createStubInstance(Route);
      middleware2 = sinon.createStubInstance(Route);

      errMiddleware1 = sinon.createStubInstance(Route);
      errMiddleware2 = sinon.createStubInstance(Route);

      app.use(middleware1);
      app.use(middleware2);

      app.useError(errMiddleware1);
      app.useError(errMiddleware2);
    });

    it('should throw if the input is not a Request object', () => {
      expect(() => {
        app.processRequest();
      }).to.throw('request must be instance of a SuperRouter Request object.');
    });

    it('should return a promise', () => {
      expect(Q.isPromise(app.processRequest(request))).to.be.true;
    });

    it('should create a new response object', () => {
      const mockResponse = sinon.spy();
      App                = proxyquire('../lib/App', {
        './Response' : mockResponse
      });
      app                = new App();

      app.processRequest(request);
      expect(mockResponse).to.have.been.calledOnce;
      expect(mockResponse).to.have.been.calledWithNew;
    });

    it('should execute each route with request in the order declared', () => {
      return app.processRequest(request).then(() => {
        expect(middleware1.execute).to.have.been.calledOnce;
        expect(middleware1.execute.firstCall.args[0].request).to.equal(request);
        expect(middleware2.execute).to.have.been.calledOnce;
        expect(middleware2.execute.firstCall.args[0].request).to.equal(request);

        expect(middleware1.execute).to.have.been.calledBefore(middleware2.execute);
      });
    });

    it('should not execute the second middleware before the first one resolves', () => {
      middleware1.execute.returnsPromise();
      middleware1.execute.rejects(new Error());

      return app.processRequest(request).catch(() => {
        expect(middleware1.execute).to.have.been.called;
        expect(middleware2.execute).to.not.have.been.called;
      });
    });

    it('should not execute error middleware if all middleware resolves', () => {
      return app.processRequest(request).then(() => {
        expect(errMiddleware1.execute).to.not.have.been.called;
        expect(errMiddleware2.execute).to.not.have.been.called;
      });
    });

    it('should resolve with the created response object', () => {
      return app.processRequest(request).then((response) => {
        expect(response).to.be.instanceof(Response);
      });
    });

    it('should bail to the error stack if a middleware throws an error', () => {
      const err = new Error('uhoh');
      middleware1.execute.throws(err);

      return app.processRequest(request).then(() => {
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware1.execute.firstCall.args[0].error).to.equal(err);
        expect(errMiddleware2.execute).to.not.have.been.calledOnce;
      });
    });

    it('should propagate down the error stack if a previous error middleware throws an error', () => {
      const err1 = new Error('uhoh');
      const err2 = new Error('ohno');
      middleware1.execute.throws(err1);
      errMiddleware1.execute.throws(err2);

      return app.processRequest(request).then(() => {
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware1.execute.firstCall.args[0].error).to.equal(err1);
        expect(errMiddleware2.execute).to.have.been.calledOnce;
        expect(errMiddleware2.execute.firstCall.args[0].error).to.equal(err2);
      });
    });

    it('should bail to the error stack if a middleware rejects with an error', () => {
      const err = new Error('uhoh');
      middleware1.execute.returnsPromise();
      middleware1.execute.rejects(err);

      return app.processRequest(request).then(() => {
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware1.execute.firstCall.args[0].error).to.equal(err);
        expect(errMiddleware2.execute).to.not.have.been.calledOnce;
      });
    });

    it('should propagate down the error stack if a previous error middleware rejects with an error', () => {
      const err1 = new Error('uhoh');
      const err2 = new Error('ohno');
      middleware1.execute.throws(err1);
      errMiddleware1.execute.returnsPromise();
      errMiddleware1.execute.rejects(err2);

      return app.processRequest(request).then(() => {
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware1.execute.firstCall.args[0].error).to.equal(err1);
        expect(errMiddleware2.execute).to.have.been.calledOnce;
        expect(errMiddleware2.execute.firstCall.args[0].error).to.equal(err2);
      });
    });

    it('should reject if all error middleware throw', () => {
      const err1 = new Error('uhoh');
      const err2 = new Error('ohno');
      const err3 = new Error('nodearlord');
      middleware1.execute.throws(err1);
      errMiddleware1.execute.throws(err2);
      errMiddleware2.execute.throws(err3);

      return app.processRequest(request).catch((e) => {
        expect(e).to.equal(err3);
      });
    });
  });
});
