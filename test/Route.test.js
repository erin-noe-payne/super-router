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
    opts    = { path : '/', method : 'get', handler : handler };
    route   = new Route(opts);
  });

  describe('constructor', () => {
    const OPTIONS_ERROR = 'options must be an object.';
    const PATH_ERROR    = 'path must be a string.';
    const METHOD_ERROR  = 'method must be a valid method string.';
    const HANDLER_ERROR = 'handler must be a function.';

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

    it('should not throw if options.method is undefined', () => {
      expect(() => {
        new Route({ handler : sinon.spy() });
      }).to.not.throw();
    });

    it('should throw if options.method is not a string', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), method : 7 });
      }).to.throw(METHOD_ERROR);
    });

    it('should throw if options.method is not an allowed method value', () => {
      expect(() => {
        new Route({ handler : sinon.spy(), method : 'heart!' });
      }).to.throw(METHOD_ERROR);
    });

  });

  describe('properties', () => {
    _.each(['path', 'method', 'handler'], (propertyName) => {
      it(`should set property ${propertyName} from constructor`, () => {
        expect(route[propertyName]).to.equal(opts[propertyName]);
      });

      it(`should throw on assignment to ${propertyName}`, () => {
        expect(() => {
          route[propertyName] = 'a';
        }).to.throw('Cannot set property');
      });
    });

    it('should normalize root path', () => {
      route = new Route({ path : '/', method : 'get', handler : handler });
      expect(route.path).to.equal('/');
    });

    it('should normalize trailing slashes', () => {
      route = new Route({ path : '/a/b/c/', method : 'get', handler : handler });
      expect(route.path).to.equal('/a/b/c');
    });

    it('should normalize trailing slashes', () => {
      route = new Route({ path : '/a/b/c', method : 'get', handler : handler });
      expect(route.path).to.equal('/a/b/c');
    });

    it('should lowercase path parts that are NOT route params', () => {
      route = new Route({ path : '/CaSes/:caseId/THINg', method : 'get', handler : handler });
      expect(route.path).to.equal('/cases/:caseId/thing');
    });

    it('should normalize method name', () => {
      route = new Route({ path : '/a/b/c', method : 'GeT', handler : handler });
      expect(route.method).to.equal('get');
    });

    it('should default method to ALL', () => {
      route = new Route({ path : '/a/b/c', handler : handler });
      expect(route.method).to.equal('*');
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

      it('should reject if the handler rejects', () => {
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
          method  : 'get',
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

      describe('routeParams', () => {
        beforeEach(() => {
          route = new Route({
            path    : '/case(/:type)/:id(/*rest)',
            method  : 'get',
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
            path    : '/case/red/17/a/b/c',
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
