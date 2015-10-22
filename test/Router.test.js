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

let Router;
let router;

xdescribe('Router ', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../lib/Router')];

    Router = require('../lib/Router');
    router = new Router();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('addRoute', () => {
    it('should construct a new Route object from the input', () => {
      const mockRoute = sinon.stub();
      mockRoute.returns({
        path : ''
      });
      Router          = proxyquire('../lib/Router', {
        './Route' : mockRoute
      });

      const opts = {};
      router     = new Router();
      router.addRoute(opts);
      expect(mockRoute).to.have.been.calledOnce;
      expect(mockRoute).to.have.been.calledWithNew;
      expect(mockRoute).to.have.been.calledWith(opts);
    });

    it('should throw an error if the route contains a splay', () => {
      expect(() => {
        router.addRoute({
          path    : '/*start/foo',
          method  : 'get',
          handler : sinon.spy()
        });
      }).to.throw('Splats an optional groups are not supported for routes.');
    });

    it('should throw an error if the route contains an optional', () => {
      expect(() => {
        router.addRoute({
          path    : '(/start)/foo',
          method  : 'get',
          handler : sinon.spy()
        });
      }).to.throw('Splats an optional groups are not supported for routes.');
    });
  });

  describe('use', () => {
    it('should throw an error if input is not a function', () => {
      expect(() => {

      });
    });
  });
});