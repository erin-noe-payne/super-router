'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const proxyquire        = require('proxyquire');
const _                 = require('lodash');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect  = chai.expect;
const sandbox = sinon.sandbox.create();

const Route    = require('../lib/Route');
const Request  = require('../lib/Request');
const Response = require('../lib/Response');

let Router;
let router;
let mockTree;
let request;
let response;

describe('Router ', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../lib/Router')];

    const RouteTree = require('../lib/RouteTree');
    mockTree        = sinon.createStubInstance(RouteTree);

    Router = proxyquire('../lib/Router', {
      './RouteTree' : sinon.stub().returns(mockTree)
    });
    router = new Router();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#addRoute', () => {
    it('should construct a new Route object from the input', () => {
      const mockRoute = sinon.stub();
      const route     = sinon.createStubInstance(Route);
      mockRoute.returns({
        path : ''
      });
      Router          = proxyquire('../lib/Router', {
        './Route'     : mockRoute,
        './RouteTree' : sinon.stub().returns(mockTree)
      });

      const opts = {};
      router     = new Router();
      router.addRoute(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should add the new route to its tree', () => {
      const route = new Route({
        path    : '/',
        method  : 'get',
        handler : sinon.spy()
      });
      router.addRoute(route);

      expect(mockTree.addRoute).to.have.been.calledOnce;
      expect(mockTree.addRoute).to.have.been.calledWith(route);
    });

    it('should throw an error if the route contains a splat', () => {
      expect(() => {
        router.addRoute({
          path    : '/*start/foo',
          method  : 'get',
          handler : sinon.spy()
        });
      }).to.throw('Splats and optional groups are not supported for routes.');
    });

    it('should throw an error if the route contains an optional', () => {
      expect(() => {
        router.addRoute({
          path    : '(/start)/foo',
          method  : 'get',
          handler : sinon.spy()
        });
      }).to.throw('Splats and optional groups are not supported for routes.');
    });
  });

  describe('middleware', () => {
    beforeEach(() => {
      router = new Router();

      router.addRoute({
        path    : '/case/:id',
        method  : 'post',
        handler : sinon.spy()
      });

      router.addRoute({
        path    : '/case/:id',
        method  : 'get',
        handler : sinon.spy()
      });

      request = new Request({
        path    : '/',
        method  : 'get',
        headers : {}
      });

      response = new Response();
    });

    describe('#match', () => {
      it('should find the route on its routeTree', () => {
        router.match({ request });

        expect(mockTree.find).to.have.been.calledOnce;
        expect(mockTree.find).to.have.been.calledWith(request);
      });

      it('should attach the matched route info to the request', () => {
        const route = new Route({
          path    : '/',
          method  : 'get',
          handler : sinon.spy()
        });

        mockTree.find.returns(route);

        router.match({ request });
        expect(request.matchedRoute).to.equal(route);
      });

      it('should attach an empty match info if there is not matched route', () => {
        mockTree.find.returns(null);

        router.match({ request });
        expect(request.matchedRoute).to.be.null;
      });
    });

    describe('#execute', () => {
      it('should invoke execute on the matched route, if it exists', () => {
        const route = new Route({
          path    : '/',
          method  : 'get',
          handler : sinon.spy()
        });
        sinon.spy(route, 'execute');

        request.matchedRoute = route;
        router.execute({ request, response });

        expect(route.execute).to.have.been.calledOnce;
        expect(route.execute).to.have.been.calledWith({ request, response });
      });

      it('should not throw if the matched route doesnt exist', () => {
        expect(() => {
          router.execute({ request, response });
        }).to.not.throw();
      });
    });
  });
});
