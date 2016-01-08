'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const proxyquire        = require('proxyquire');
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

describe('App', () => {

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
      app.then(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should not run the input through the Route constructor if it is a Route instance', () => {
      const route = new mockRoute({ handler : sinon.spy() });
      mockRoute.reset();

      app.then(route);
      expect(mockRoute).to.not.have.been.called;
    });

    it('should accept a function input and use it as a route handler', () => {
      const opts = sinon.spy();
      app.then(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith({
        handler : opts
      });
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
      app.catch(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should not run the input through the Route constructor if it is a Route instance', () => {
      const route = new mockRoute({ handler : sinon.spy() });
      mockRoute.reset();

      app.catch(route);
      expect(mockRoute).to.not.have.been.called;
    });

    it('should accept a function input and use it as a route handler', () => {
      const opts = sinon.spy();
      app.catch(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith({
        handler : opts
      });
    });
  });

  describe('processRequest', () => {
    let request;
    let middleware1;
    let middleware2;
    let middleware3;
    let middleware4;
    let errMiddleware1;
    let errMiddleware2;
    let errMiddleware3;
    let errMiddleware4;

    beforeEach(() => {
      request = new Request({
        headers : {},
        path    : '/a',
        method  : 'get'
      });

      middleware1 = sinon.createStubInstance(Route);
      middleware2 = sinon.createStubInstance(Route);
      middleware3 = new Route({
        handler : sinon.spy(function (opts) {
          opts.response.end();
        })
      });
      middleware4 = sinon.createStubInstance(Route);

      errMiddleware1 = new Route({
        handler : sinon.spy()
      });
      sandbox.stub(errMiddleware1, 'execute');
      errMiddleware2 = new Route({
        handler : sinon.spy()
      });
      sandbox.stub(errMiddleware2, 'execute');
      errMiddleware3 = new Route({
        handler : sinon.spy(function (opts) {
          opts.response.end();
          throw new Error('Failure');
        })
      });
      errMiddleware4 = new Route({
        handler : sinon.spy()
      });
      sandbox.stub(errMiddleware4, 'execute');

      app.then(middleware1);
      app.then(middleware2);

      app.catch(errMiddleware1);
      app.catch(errMiddleware2);
    });

    it('should create a new Request object if the input is not a Request object', () => {
      const mockRequest = sinon.stub();
      const opts        = {};
      App               = proxyquire('../lib/App', {
        './Request' : mockRequest
      });
      app = new App();

      app.processRequest(opts);
      expect(mockRequest).to.have.been.calledOnce;
      expect(mockRequest).to.have.been.calledWith(opts);
    });

    it('should return a promise', () => {
      expect(Q.isPromise(app.processRequest(request))).to.be.true;
    });

    it('should create a new response object', () => {
      const Response     = sinon.stub();
      const mockResponse = {
        pipe : sinon.spy()
      };
      Response.returns(mockResponse);
      App                = proxyquire('../lib/App', {
        './Response' : Response
      });
      app                = new App();

      app.then(middleware1);
      app.then(middleware2);

      return app.processRequest(request).then(() => {
        expect(Response).to.have.calledOnce;
      });
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

    it('should not execute the second middleware before the first one completes', () => {
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

    it('should bail from the middleware stack if response.end is true', () => {
      app.then(middleware3);
      app.then(middleware4);
      return app.processRequest(request).then(() => {
        expect(middleware3.handler).to.have.been.calledOnce;
        expect(middleware4.execute).to.not.have.been.calledOnce;
      });
    });

    it('should bail from the error stack if response.end is true', () => {
      const err = new Error('uhoh');
      const err2 = new Error('ohno');
      middleware1.execute.throws(err);
      errMiddleware1.execute.throws(err2);
      errMiddleware2.execute.throws(err2);
      app.catch(errMiddleware3);
      app.catch(errMiddleware4);

      return app.processRequest(request).then(() => {
        expect(errMiddleware3.handler).to.have.been.calledOnce;
        expect(errMiddleware4.execute).to.not.have.been.calledOnce;
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

    it('should not allow a path specific error middleware to swallow a valid error condition', () => {
      app            = new App();

      app.then(middleware1);
      errMiddleware1 = new Route({
        path    : '/a/b/c',
        method  : 'get',
        handler : sinon.spy()
      });
      app.catch(errMiddleware1);
      app.catch(errMiddleware2);

      const err1 = new Error('uhoh');
      middleware1.execute.throws(err1);
      return app.processRequest(request).then(() => {
        expect(errMiddleware1.handler).to.not.have.been.called;
        expect(errMiddleware2.execute).to.have.been.calledOnce;
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

  describe.only('processRequest with middleware specific error handlers', () => {
    let request;
    let middleware1;
    let middleware2;
    let middleware3;
    let middleware4;
    let errMiddleware1;
    let errMiddleware2;
    let genericError;

    beforeEach(() => {
      request = new Request({
        headers : {},
        path    : '/a',
        method  : 'get'
      });

      genericError = new Error('Something bad happened.');

      middleware1 = sinon.createStubInstance(Route);
      middleware2 = sinon.createStubInstance(Route);
      middleware3 = sinon.createStubInstance(Route);
      middleware4 = sinon.createStubInstance(Route);

      errMiddleware1 = new Route({
        handler : sinon.spy()
      });
      sandbox.stub(errMiddleware1, 'execute');
      errMiddleware2 = new Route({
        handler : sinon.spy()
      });
      sandbox.stub(errMiddleware2, 'execute');

      app.then(middleware1);
      app.then(middleware2);
      app.then(middleware3);
      app.catch(errMiddleware1);
      app.catch(errMiddleware2);
      app.then(middleware4);
    });

    it('no errors', () => {
      return app.processRequest(request).then(() => {
        expect(middleware1.execute).to.have.been.calledOnce;
        expect(middleware2.execute).to.have.been.calledOnce;
        expect(middleware3.execute).to.have.been.calledOnce;
        expect(errMiddleware1.execute).to.not.have.been.called;
        expect(errMiddleware2.execute).to.not.have.been.called;
        expect(middleware4.execute).to.have.been.calledOnce;
      });
    });

    it('early error that gets back on happy path', () => {
      middleware1.execute.returnsPromise();
      middleware1.execute.rejects(genericError);

      return app.processRequest(request).then(() => {
        expect(middleware1.execute).to.have.been.calledOnce;
        expect(middleware2.execute).to.not.have.been.called;
        expect(middleware3.execute).to.not.have.been.called;
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware2.execute).to.not.have.been.called;
        expect(middleware4.execute).to.have.been.calledOnce;
      });
    });

    it('early error that gets back on happy path after erroring in error chain', () => {
      middleware1.execute.returnsPromise();
      middleware1.execute.rejects(genericError);
      errMiddleware1.execute.returnsPromise();
      errMiddleware1.execute.rejects(genericError);

      return app.processRequest(request).then(() => {
        expect(middleware1.execute).to.have.been.calledOnce;
        expect(middleware2.execute).to.not.have.been.called;
        expect(middleware3.execute).to.not.have.been.called;
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware2.execute).to.have.been.calledOnce;
        expect(middleware4.execute).to.have.been.calledOnce;
      });
    });

    it('should bubble up error if last error middleware throws error', () => {
      middleware1.execute.returnsPromise();
      middleware1.execute.rejects(genericError);
      errMiddleware1.execute.returnsPromise();
      errMiddleware1.execute.rejects(genericError);
      errMiddleware2.execute.returnsPromise();
      errMiddleware2.execute.rejects(genericError);

      return app.processRequest(request).catch(() => {
        expect(middleware1.execute).to.have.been.calledOnce;
        expect(middleware2.execute).to.not.have.been.called;
        expect(middleware3.execute).to.not.have.been.called;
        expect(errMiddleware1.execute).to.have.been.calledOnce;
        expect(errMiddleware2.execute).to.have.been.calledOnce;
        expect(middleware4.execute).to.not.have.been.calledOnce;
      });
    });



    // let request;
    // let middleware1Handler, middleware1ErrorHandler;
    // let middleware2Handler, middleware2ErrorHandler;
    // let middleware3Handler, middleware3ErrorHandler;
    // let middleware4Handler, middleware4ErrorHandler;
    //
    // let errorMiddleware1Handler, errorMiddleware1ErrorHandler;
    // let errorMiddleware2Handler, errorMiddleware2ErrorHandler;
    //
    //
    // beforeEach(() => {
    //   request = new Request({
    //     headers : {},
    //     path    : '/a',
    //     method  : 'get'
    //   });
    //
    //   middleware1Handler = sinon.spy();
    //   middleware1ErrorHandler = sinon.spy();
    //   middleware2Handler = sinon.spy();
    //   middleware2ErrorHandler = sinon.spy();
    //   middleware3Handler = sinon.spy();
    //   middleware3ErrorHandler = sinon.spy();
    //   middleware4Handler = sinon.spy();
    //   middleware4ErrorHandler = sinon.spy();
    //
    //   errorMiddleware1Handler = sinon.spy();
    //   errorMiddleware1ErrorHandler = sinon.spy();
    //   errorMiddleware2Handler = sinon.spy();
    //   errorMiddleware2ErrorHandler = sinon.spy();
    //
    //   app.then({ handler : middleware1Handler, errorHandler : middleware1ErrorHandler });
    //   app.then({ handler : middleware2Handler, errorHandler : middleware2ErrorHandler });
    //   app.then({ handler : middleware3Handler, errorHandler : middleware3ErrorHandler });
    //   app.catch({ handler : errorMiddleware1Handler, errorHandler : errorMiddleware1ErrorHandler });
    //   app.catch({ handler : errorMiddleware2Handler, errorHandler : errorMiddleware2ErrorHandler });
    //   app.then({ handler : middleware4Handler, errorHandler : middleware4ErrorHandler });
    // });
    //
    // it('happy path the whole way', () => {
    //   return app.processRequest(request).then(() => {
    //     expect(middleware1Handler).to.have.been.calledOnce;
    //     expect(middleware1ErrorHandler).to.not.have.been.called;
    //     expect(middleware2Handler).to.have.been.calledOnce;
    //     expect(middleware2ErrorHandler).to.not.have.been.called;
    //     expect(errorMiddleware1Handler).to.not.have.been.called;
    //   });
    // });
    //
    // it('fails with no recovery in the first middleware', () => {
    //   middleware1Handler.returnsPromise();
    //   const err = new Error('something broke');
    //   middleware1Handler.throws(err);
    //
    //   middleware1ErrorHandler.returnsPromise();
    //   middleware1ErrorHandler.throws(err);
    //
    //   return app.processRequest(request).then(() => {
    //     expect(middleware1Handler).to.have.been.calledOnce;
    //     expect(middleware1ErrorHandler).to.not.have.been.called;
    //     expect(middleware2Handler).to.have.been.calledOnce;
    //     expect(middleware2ErrorHandler).to.not.have.been.called;
    //     expect(errorMiddleware1Handler).to.not.have.been.called;
    //   });
    // });


  });
});
