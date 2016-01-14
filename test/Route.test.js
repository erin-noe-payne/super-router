'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _                 = require('lodash');
const Q                 = require('q');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Route    = require('../lib/Route');
const Request  = require('../lib/Request');
const Response = require('../lib/Response');

describe('A Route', () => {
  let opts;
  let route;
  let handler;

  beforeEach(() => {
    handler = sinon.stub();
    opts    = { path : '/', methods : 'GET', handler : handler };
    route   = new Route(opts);
  });

  describe('constructor', () => {
    const OPTIONS_ERROR = 'options must be an object.';
    const PATH_ERROR    = 'path must be a string.';
    const METHOD_ERROR  = 'method must be a valid method string.';
    const HANDLER_ERROR = 'handler must be a function.';
    const ERROR_HANDLER_ERROR = 'errorHandler must be a function.';

    it('should throw if options is undefined', () => {
      expect(() => {
        new Route();
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if options is not an object', () => {
      expect(() => {
        new Route('asdf');
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if handler is not defined;', () => {
      expect(() => {
        new Route({});
      }).to.throw(HANDLER_ERROR);
    });

    it('should throw if handler is not a function', () => {
      expect(() => {
        new Route({ handler : 'asdf' });
      }).to.throw(HANDLER_ERROR);
    });

    it('should throw if error handler is provided but not a function', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), errorHandler : 'whatever' });
      }).to.throw(ERROR_HANDLER_ERROR);
    });

    it('should not throw if error handler is not provided', () => {
      expect(() => {
        new Route({ handler : sinon.spy() });
      }).to.not.throw();
    });

    it('should not throw if options.path is undefined', () => {
      expect(() => {
        new Route({ handler : sinon.spy() });
      }).to.not.throw();
    });

    it('should throw if options.path is not a string', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), path : 7 });
      }).to.throw(PATH_ERROR);
    });

    it('should not throw if options.methods is undefined', () => {
      expect(() => {
        new Route({ handler : sinon.spy() });
      }).to.not.throw();
    });

    it('should throw if options.methods is not a string', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), methods : 7 });
      }).to.throw(METHOD_ERROR);
    });

    it('should throw if options.methods is not an allowed method value', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), methods : 'heart!' });
      }).to.throw(METHOD_ERROR);
    });

    it('should throw if options.methods contains a method value in the array that is not allowed', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), methods : ['GET', 'heart!'] });
      }).to.throw(METHOD_ERROR);
    });

  });

  describe('properties', () => {
    _.each(['path', 'methods', 'handler'], (propertyName) => {
      it(`should set property ${propertyName} from constructor`, () => {
        let shouldEqual;
        if (propertyName === 'methods') {
          shouldEqual = [];
          if (_.isArray(opts[propertyName])) {
            shouldEqual = opts[propertyName];
          }
          else {
            shouldEqual.push(opts[propertyName]);
          }
        }
        else {
          shouldEqual = opts[propertyName];
        }
        expect(route[propertyName]).to.eql(shouldEqual);
      });

      it(`should throw on assignment to ${propertyName}`, () => {
        expect(() => {
          route[propertyName] = 'a';
        }).to.throw('Cannot set property');
      });
    });

    it('should normalize root path', () => {
      route = new Route({ path : '/', methods : 'get', handler : handler });
      expect(route.path).to.equal('/');
    });

    it('should normalize trailing slashes', () => {
      route = new Route({ path : '/a/b/c/', methods : 'get', handler : handler });
      expect(route.path).to.equal('/a/b/c');
    });

    it('should normalize trailing slashes', () => {
      route = new Route({ path : '/a/b/c', methods : 'get', handler : handler });
      expect(route.path).to.equal('/a/b/c');
    });

    it('should lowercase path parts that are NOT route params', () => {
      route = new Route({ path : '/CaSes/:caseId/THINg', methods : 'get', handler : handler });
      expect(route.path).to.equal('/cases/:caseId/thing');
    });

    it('should normalize method name', () => {
      route = new Route({ path : '/a/b/c', methods : 'GeT', handler : handler });
      expect(route.methods).to.eql(['GET']);
    });

    it('should turn a single method into an array', () => {
      route = new Route({ path : '/a/b/c', methods : 'GET', handler : handler });
      expect(route.methods).to.eql(['GET']);
    });

    it('should be able to take in an array of methods', () => {
      route = new Route({ path : '/a/b/c', methods : ['GET', 'POST'], handler : handler });
      expect(route.methods).to.eql(['GET', 'POST']);
    });

    it('should normalize an array of methods', () => {
      route = new Route({ path : '/a/b/c', methods : ['gET', 'POst'], handler : handler });
      expect(route.methods).to.eql(['GET', 'POST']);
    });

    it('should default method to ALL', () => {
      route = new Route({ path : '/a/b/c', handler : handler });
      expect(route.methods).to.eql(['*']);
    });

    it('should default path to all', () => {
      route = new Route({ handler : handler });
      expect(route.path).to.equal('*all');
    });

    it('should extend with arbitrary parameters', () => {
      route = new Route(_.extend({}, opts, { a : 1, b : 'AHHH' }));

      expect(route.a).to.equal(1);
      expect(route.b).to.equal('AHHH');
    });

    it('should not allow arbitrary parameters to overwrite internal state', () => {
      route = new Route(_.extend({}, opts, { _path : 'okthen?' }));

      expect(route.path).to.equal('/');
    });
  });

  describe('isMatch', () => {
    it('should throw if the input is not a request object', () => {
      expect(() => {
        route.isMatch({});
      }).to.throw('First argument: request must be a SuperRouter Request instance.');
    });

    it('should return true if a request is an exact match for the route', () => {
      const req = new Request({
        method  : 'get',
        path    : '/',
        headers : {}
      });

      expect(route.isMatch(req)).to.be.true;
    });

    it('should return true for any method if the route is to match all methods', () => {
      route = new Route({
        method  : '*',
        path    : '/',
        handler : sinon.spy()
      });

      const req = new Request({
        method  : 'get',
        path    : '/',
        headers : {}
      });

      expect(route.isMatch(req)).to.be.true;
    });

    it('should return true for any method if the route is to match all paths', () => {
      route = new Route({
        method  : 'get',
        path    : '*all',
        handler : sinon.spy()
      });

      const req = new Request({
        method  : 'get',
        path    : '/a/b/c',
        headers : {}
      });

      expect(route.isMatch(req)).to.be.true;
    });

    it('should return false if a the method is wrong', () => {
      const req = new Request({
        method  : 'put',
        path    : '/',
        headers : {}
      });

      expect(route.isMatch(req)).to.be.false;
    });

    it('should return false if a the path is wrong', () => {
      const req = new Request({
        method  : 'get',
        path    : '/a/b',
        headers : {}
      });

      expect(route.isMatch(req)).to.be.false;
    });
  });

  describe('#execute', () => {
    let request;
    let response;

    it('should throw if options is not defined', () => {
      expect(() => {
        route.execute();
      }).to.throw('options must be an object.');
    });

    it('should throw if options is not an object', () => {
      expect(() => {
        route.execute(7);
      }).to.throw('options must be an object.');
    });

    it('should throw if the input is not a request object', () => {
      expect(() => {
        route.execute({});
      }).to.throw('request must be a SuperRouter Request instance.');
    });

    it('should throw if the second input is not a response object', () => {
      request = new Request({
        method  : 'get',
        path    : '/a/b',
        headers : {}
      });

      expect(() => {
        route.execute({ request });
      }).to.throw('response must be a SuperRouter Response instance.');
    });

    describe('on non-match', () => {
      beforeEach(() => {
        request  = new Request({
          method  : 'get',
          path    : '/a/b',
          headers : {}
        });
        response = new Response();
      });

      it('should return a promise', () => {
        expect(Q.isPromise(route.execute({ request, response }))).to.be.true;
      });

      it('should resolve the promise without executing the handler', () => {
        return route.execute({ request, response }).then(() => {
          expect(handler).to.not.have.been.called;
        });
      });

      it('should pass properties on options to handler', () => {
        const opts = {
          request : new Request({
            method  : 'get',
            path    : '/',
            headers : {}
          }),
          response : new Response(),
          a        : 1,
          b        : 'thing'
        };

        return route.execute(opts).then(() => {
          expect(handler).to.have.been.calledWith(opts);
        });
      });

    });

    describe('on match', () => {
      beforeEach(() => {
        request  = new Request({
          method  : 'get',
          path    : '/',
          headers : {}
        });
        response = new Response();
      });

      it('should return a promise', () => {
        expect(Q.isPromise(route.execute({ request, response }))).to.be.true;
      });

      it('should resolve the promise, executing the handler if the request is a match', () => {
        return route.execute({ request, response }).then(() => {
          expect(handler).to.have.been.calledOnce;
        });
      });

      it('should pass the request and response to the handler', () => {
        return route.execute({ request, response }).then(() => {
          expect(handler).to.have.been.calledWith({ request, response });
        });
      });

      it('should catch any thrown errors and reject the promise with them', () => {
        const err = new Error('A TERRIBLE TRAGEDY');
        handler.throws(err);

        return route.execute({ request, response }).catch((thrownErr) => {
          expect(thrownErr).to.equal(err);
        });
      });

      it('should resolve with the return value if the handler does not return a promise', () => {
        handler.returns('resolveVal');

        return route.execute({ request, response }).then((res) => {
          expect(res).to.equal('resolveVal');
        });
      });

      it('should resolve if the handler resolves', () => {
        handler.returnsPromise();
        handler.resolves('resolveVal');

        return route.execute({ request, response }).then((res) => {
          expect(res).to.equal('resolveVal');
        });
      });

      it('should reject if the handler rejects and there is no error handler', () => {
        handler.returnsPromise();
        const err = new Error('A TERRIBLE TRAGEDY');
        handler.rejects(err);

        return route.execute({ request, response }).catch((thrownErr) => {
          expect(thrownErr).to.equal(err);
        });
      });

      it('should propagate mutations on the request and response that occur within the handler', () => {
        route = new Route({
          path    : '/',
          methods : 'get',
          handler : (opts) => {
            const req = opts.request;
            const res = opts.response;

            req.a = 1;
            res.b = 2;
          }
        });

        return route.execute({ request, response }).then(() => {
          expect(request.a).to.equal(1);
          expect(response.b).to.equal(2);
        });
      });

      describe('route with an error handler', () => {
        let errorHandler;

        beforeEach(() => {
          handler = sinon.spy();
          errorHandler = sinon.spy();
          opts    = { path : '/', methods : 'GET', handler : handler, errorHandler : errorHandler };
          route   = new Route(opts);
        });

        it('if the handler does not throw then error handler should not be run', () => {
          return route.execute({ request, response }).then(() => {
            expect(errorHandler).to.not.have.been.called;
          });

        });

        it('if the handler resolves then error handler should not be run', () => {
          handler = sinon.stub().returnsPromise().resolves();

          return route.execute({ request, response }).then(() => {
            expect(errorHandler).to.not.have.been.called;
          });

        });

        it('if the handler throws then error handler should be run', () => {
          const err = new Error('A TERRIBLE TRAGEDY');
          handler = sinon.stub().throws(err);
          route = new Route({
            handler      : handler,
            errorHandler : errorHandler
          });

          return route.execute({ request, response }).then(() => {
            expect(errorHandler).to.have.been.calledOnce;
          });

        });

        it('should pass request, response, error to the error handler', () => {
          const err = new Error('A TERRIBLE TRAGEDY');
          handler = sinon.stub().throws(err);
          route = new Route({
            handler      : handler,
            errorHandler : errorHandler
          });

          return route.execute({ request, response }).then(() => {
            expect(errorHandler).to.have.been.calledWith({ request, response, error : err });
          });
        });

        it('should resolve if the handler rejects and the error handler resolves', () => {
          const err = new Error('A TERRIBLE TRAGEDY');
          handler = sinon.stub().throws(err);
          const success = 'YAY';
          errorHandler = sinon.stub();
          errorHandler.returnsPromise().resolves(success);
          route = new Route({
            handler      : handler,
            errorHandler : errorHandler
          });

          return route.execute({ request, response }).then((result) => {
            expect(result).to.equal(success);
          });
        });

        it('should reject if the handler rejects and the error handler rejects', () => {
          const err = new Error('A TERRIBLE TRAGEDY');
          handler = sinon.stub().throws(err);

          const err2 = new Error('ANOTHER TERRIBLE TRAGEDY');
          errorHandler = sinon.stub().throws(err2);

          return route.execute({ request, response }).catch((thrownErr) => {
            expect(thrownErr).to.equal(err2);
          });
        });
      });

      describe('routeParams', () => {
        beforeEach(() => {
          route = new Route({
            path    : '/user(/:type)/:id(/*rest)',
            methods : 'get',
            handler : sinon.spy()
          });
        });

        it('should create a routeParams property on the request', () => {
          request = new Request({
            path    : '/',
            method  : 'get',
            headers : {}
          });
          route.execute({ request, response });
          expect(request.routeParams).to.exist;
          expect(request.routeParams).to.eql({});
        });

        it('should overwrite an existing routeParams property', () => {
          request             = new Request({
            path    : '/',
            method  : 'get',
            headers : {}
          });
          request.routeParams = { a : 1 };
          route.execute({ request, response });
          expect(request.routeParams).to.exist;
          expect(request.routeParams).to.eql({});
        });

        it('should represent each match from the route path on the routeParams property', () => {
          request = new Request({
            path    : '/user/red/17/a/b/c',
            method  : 'get',
            headers : {}
          });
          route.execute({ request, response });
          expect(request.routeParams).to.exist;
          expect(request.routeParams).to.eql({
            type : 'red',
            id   : '17',
            rest : 'a/b/c'
          });
        });
      });
    });
  });
});
