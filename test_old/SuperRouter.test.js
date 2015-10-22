'use strict';

const _ = require('lodash');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Promise  = require('promise');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const SuperRouter = require('./..');
const PassThrough = require('stream').PassThrough;
const path = require('path');

chai.use(chaiAsPromised);
chai.use(sinonChai);

let router = null;

describe('SuperRouter!', function () {
  beforeEach(function () {
    router = new SuperRouter();
  });

  describe('METHODS', function () {
    it('should be an enum on the router', function () {
      expect(router.METHODS).to.exist;
      expect(router.METHODS).to.be.an('object');
    });

    it('should contain the expected methods', function () {
      const expectedMethods = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS', 'SUBSCRIBE'];
      return _.each(expectedMethods, function (method) {
        return expect(router.METHODS[method]).to.exist;
      });
    });
  });

  describe('addRoute', function () {
    it('should exist', function () {
      expect(router.addRoute).to.exist;
      return expect(router.addRoute).to.be.a('function');
    });
    it('should throw an error if path is not defined', function () {
      return expect(function () {
        return router.addRoute();
      }).to.throw('route must be defined');
    });
    it('should throw an error if path is not a string', function () {
      const notString = function () {
        return router.addRoute({
          path: 76
        });
      };
      return expect(notString).to.throw('route.path must be a string');
    });
    it('should throw an error if method is not defined', function () {
      const noMethod = function () {
        return router.addRoute({
          path: '/obj'
        });
      };
      return expect(noMethod).to.throw('route.method must be defined');
    });
    it('should throw an error if method is not defined in the METHODS enum', function () {
      return expect(function () {
        return router.addRoute({
          path: '/asdf',
          method: 'badMethod'
        });
      }).to.throw('route.method must be defined in the METHODS enum');
    });
    it('should accept a method that is a reference to the METHODS enum', function () {
      return router.addRoute({
        path: '/asdf',
        method: router.METHODS.GET,
        handler: function (req, res) {}
      });
    });
    it('should accept a method string defined in the METHODS enum', function () {
      return router.addRoute({
        path: '/asdf',
        method: 'get',
        handler: function (req, res) {}
      });
    });
    it('should accept a method string defined in the METHODS enum, case insensitive', function () {
      return router.addRoute({
        path: '/asdf',
        method: 'geT',
        handler: function (req, res) {}
      });
    });
    it('should accept a custom method added to the METHODS enum', function () {
      router.METHODS.OTHER = 'other';
      return router.addRoute({
        path: '/asdf',
        method: 'other',
        handler: function (req, res) {}
      });
    });
    it('should throw an error if the handler is undefined', function () {
      const fn = function () {
        return router.addRoute({
          path: '/asdf',
          method: 'get'
        });
      };
      return expect(fn).to.throw('route.handler must be defined');
    });
    it('should throw an error if the handler is not a function', function () {
      const fn = function () {
        return router.addRoute({
          path: '/asdf',
          method: 'get',
          handler: 'blah'
        });
      };
      return expect(fn).to.throw('route.handler must be a function');
    });
    it('should throw an error if the same path+method combo is added twice', function () {
      router.addRoute({
        path: '/asdf',
        method: 'get',
        handler: function (req, res) {}
      });
      return expect(function () {
        return router.addRoute({
          path: '/asdf',
          method: 'get',
          handler: function (req, res) {}
        });
      }).to.throw('Duplicate path and method registered: \"/asdf\" get');
    });
    return it('should allow the same path with different methods', function () {
      router.addRoute({
        path: '/asdf',
        method: 'get',
        handler: function (req, res) {}
      });
      return router.addRoute({
        path: '/asdf',
        method: 'post',
        handler: function (req, res) {}
      });
    });
  });

  describe('route', function () {
    const routeAsync = function (path, method, headers, input) {
      const inputStream = new PassThrough();
      inputStream.end(JSON.stringify(input));
      return new Promise(function (resolve, reject) {
        return router.route(path, method, headers, inputStream, function (superRouterResponseStream) {
          return superRouterResponseStream.on('data', function (chunk) {
            return resolve({
              headers: superRouterResponseStream.getHeaders(),
              body: chunk
            });
          });
        });
      });
    };

    beforeEach(function () {
      router = new SuperRouter();
      const createHandler = function (s) {
        return function (requestStream, responseStream) {
          return responseStream.send({
            handler: s,
            headersReceived: requestStream.getHeaders(),
            inputReceived: requestStream.input,
            routeInfoReceived: requestStream.routeInfo
          });
        };
      };
      router.addRoute({
        path: '/obj',
        method: router.METHODS.GET,
        handler: createHandler('a')
      });
      router.addRoute({
        path: '/obj',
        method: router.METHODS.POST,
        handler: createHandler('b')
      });
      router.addRoute({
        path: '/obj/:id',
        method: router.METHODS.GET,
        handler: createHandler('c')
      });
      router.addRoute({
        path: '/obj/:id/action/:action',
        method: router.METHODS.GET,
        handler: createHandler('d')
      });
      router.addRoute({
        path: '/matchOnAnyPath',
        method: router.METHODS.ALL,
        handler: createHandler('e')
      });
      router.addRoute({
        path: '/matchOnAnyPath(/*_optionalPathPart)',
        method: router.METHODS.ALL,
        handler: createHandler('f')
      });
      return router.addRoute({
        path: '/passThrough(/*_restOfRoute)',
        method: router.METHODS.ALL,
        handler: function (req, res) {
          return router.route('/' + req.routeInfo._restOfRoute, req.method, req.getHeaders(), req, function (responseStream) {
            return responseStream.pipe(res);
          });
        }
      });
    });

    describe('options requests', function () {
      it('1', function () {
        return expect(routeAsync('/', 'options', {}, {})).to.eventually.have.deep.property('body.child_routes[0].path', '/obj');
      });
      it('2', function () {
        return expect(routeAsync('/', 'options', {}, {})).to.eventually.have.deep.property('body.child_routes[1].path', '/obj');
      });
      it('3', function () {
        return expect(routeAsync('/obj', 'options', {}, {})).to.eventually.have.deep.property('body.child_routes[0].path', '/obj/:id');
      });
      it('4', function () {
        return expect(routeAsync('/notaroute', 'options', {}, {})).to.eventually.have.deep.property('headers.statusCode', 404);
      });
      return it('5', function () {
        return expect(routeAsync('/matchOnAnyPath', 'options', {}, {})).to.eventually.have.deep.property('body.child_routes.length', 0);
      });
    });

    describe('route matching', function () {
      it('should match on exact matches', function () {
        return expect(routeAsync('/obj', 'get', {}, {})).to.eventually.have.deep.property('body.handler', 'a');
      });

      it('should match on any path if the ALL method was specified for the route', function () {
        expect(routeAsync('/matchOnAnyPath', 'get', {}, {})).to.eventually.have.deep.property('body.handler', 'e');
        expect(routeAsync('/matchOnAnyPath', 'put', {}, {})).to.eventually.have.deep.property('body.handler', 'e');
        expect(routeAsync('/matchOnAnyPath', 'post', {}, {})).to.eventually.have.deep.property('body.handler', 'e');
        return expect(routeAsync('/matchOnAnyPath', 'delete', {}, {})).to.eventually.have.deep.property('body.handler', 'e');
      });

      it('should add any URI params with _ to routeInfo instead of input', function () {
        return expect(routeAsync('/matchOnAnyPath/this/is/optional', 'get', {}, {})).to.eventually.have.deep.property('body.routeInfoReceived._optionalPathPart', 'this/is/optional');
      });

      it('should be able to passthrough and pipe to other routes', function () {
        expect(routeAsync('/passThrough/obj', 'get', {}, {})).to.eventually.have.deep.property('body.handler', 'a');
        expect(routeAsync('/passThrough/obj', 'post', {}, {})).to.eventually.have.deep.property('body.handler', 'b');
        expect(routeAsync('/passThrough/obj/123', 'get', {
          headerParam: 'foo'
        }, {
          bodyParam: 'bar'
        })).to.eventually.have.deep.property('body.inputReceived.id', '123');
        expect(routeAsync('/passThrough/obj/123', 'get', {
          headerParam: 'foo'
        }, {
          bodyParam: 'bar'
        })).to.eventually.have.deep.property('body.inputReceived.bodyParam', 'bar');
        expect(routeAsync('/passThrough/obj/123', 'get', {
          headerParam: 'foo'
        }, {
          bodyParam: 'bar'
        })).to.eventually.have.deep.property('body.headersReceived.headerParam', 'foo');
        return expect(routeAsync('/passThrough/obj/123', 'get', {
          headerParam: 'foo'
        }, {
          bodyParam: 'bar'
        })).to.eventually.have.deep.property('body.routeInfoReceived.originPath', '/passThrough/obj/123');
      });

      it('should run the right handler for method', function () {
        return expect(routeAsync('/obj', 'post', {}, {})).to.eventually.have.deep.property('body.handler', 'b');
      });

      it('should not run a handler on a route that not match', function () {
        expect(routeAsync('/objBAD', 'get', {}, {})).to.eventually.not.have.deep.property('body.handler');
        return expect(routeAsync('/objBAD', 'get', {}, {})).to.eventually.have.deep.property('headers.statusCode', 404);
      });

      it('should return a 405 if path matches, but not method', function () {
        expect(routeAsync('/obj', 'put', {}, {})).to.eventually.not.have.deep.property('body.handler');
        return expect(routeAsync('/obj', 'put', {}, {})).to.eventually.have.deep.property('headers.statusCode', 405);
      });

    });

    describe('setting params', function () {
      it('should take params from URI and add them to input', function () {
        expect(routeAsync('/obj/123', 'get', {}, {})).to.eventually.have.deep.property('body.inputReceived.id', '123');
        expect(routeAsync('/obj/123/action/run', 'get', {}, {})).to.eventually.have.deep.property('body.inputReceived.id', '123');
        return expect(routeAsync('/obj/123/action/run', 'get', {}, {})).to.eventually.have.deep.property('body.inputReceived.action', 'run');
      });

      it('should take params from input', function () {
        return expect(routeAsync('/obj', 'get', {}, {
          id: 123
        })).to.eventually.have.deep.property('body.inputReceived.id', 123);
      });

      it('should return a 400 if a URI param with the same name as a body param has a different value', function () {
        return expect(routeAsync('/obj/123', 'get', {}, {
          id: 456
        })).to.eventually.have.deep.property('headers.statusCode', 400);
      });

      it('should return a 200 if a URI param with the same name as a body param has the same value', function () {
        expect(routeAsync('/obj/123', 'get', {}, {
          id: '123'
        })).to.eventually.have.deep.property('headers.statusCode', 200);
        return expect(routeAsync('/obj/123', 'get', {}, {
          id: '123'
        })).to.eventually.have.deep.property('body.inputReceived.id', '123');
      });

      it('should take params from headers', function () {
        return expect(routeAsync('/obj', 'post', {
          boggle: 'at the situation'
        }, {})).to.eventually.have.deep.property('body.headersReceived.boggle', 'at the situation');
      });

    });

    describe('validateInput', function () {
      beforeEach(function () {
        return router.addRoute({
          path: '/validate/:id',
          method: 'get',
          handler: function (req, res) {
            return res.send({
              idReceived: req.input.id
            });
          },
          validateInput: function (input, deferred) {
            const idAsInt = parseInt(input.id);
            if (isNaN(idAsInt)) {
              return deferred.reject('id must be a number');
            }
            return deferred.resolve();
          }
        });
      });
      it('should return 400 if validation fails', function () {
        return expect(routeAsync('/validate/bad', 'get', {}, {})).to.eventually.have.deep.property('headers.statusCode', 400);
      });
      it('should have an error message if validation fails', function () {
        return expect(routeAsync('/validate/bad', 'get', {}, {})).to.eventually.have.deep.property('body.message', 'id must be a number');
      });
      return it('should return 200 if validation passes', function () {
        return expect(routeAsync('/validate/123', 'get', {}, {})).to.eventually.have.deep.property('headers.statusCode', 200);
      });
    });

  });
});
