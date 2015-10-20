_ = require('lodash')
chai = require('chai')
chaiAsPromised = require("chai-as-promised")
Promise  = require('promise')
chai.use(chaiAsPromised)
expect = chai.expect
sinon = require('sinon')
sinonChai = require('sinon-chai')
Router = require('./..')
PassThrough = require('stream').PassThrough
path = require('path')


chai.use(sinonChai)

router = null


describe 'SuperRouter!', ->

  beforeEach ->
    router = new Router()

  describe 'METHODS', ->

    it "should be an enum on the router", ->
      expect(router.METHODS).to.exist
      expect(router.METHODS).to.be.an("object")

    it "should contain the expected methods", ->
      expectedMethods = ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS", "SUBSCRIBE"]

      _.each expectedMethods, (method) ->
        expect(router.METHODS[method]).to.exist

  describe 'addRoute', ->
    it "should exist", ->
      expect(router.addRoute).to.exist
      expect(router.addRoute).to.be.a('function')

    it "should throw an error if path is not defined", ->
      expect( ->
        router.addRoute()
      ).to.throw("route must be defined")

    it "should throw an error if path is not a string", ->
      notString = -> router.addRoute({path: 76});
      expect(notString).to.throw("route.path must be a string")

    it "should throw an error if method is not defined", ->
      noMethod = -> router.addRoute({path: '/obj'})
      expect(noMethod).to.throw("route.method must be defined")

    it "should throw an error if method is not defined in the METHODS enum", ->
        expect(-> router.addRoute({path: '/asdf', method: 'badMethod'})).to.throw "route.method must be defined in the METHODS enum"

    it "should accept a method that is a reference to the METHODS enum", ->
      router.addRoute {path: '/asdf', method: router.METHODS.GET, handler: (req, res)->}

    it "should accept a method string defined in the METHODS enum", ->
      router.addRoute {path: '/asdf', method: 'get', handler: (req, res)->}

    it "should accept a method string defined in the METHODS enum, case insensitive", ->
      router.addRoute {path: '/asdf', method: 'geT', handler: (req, res)->}

    it "should accept a custom method added to the METHODS enum", ->
      router.METHODS.OTHER = 'other'
      router.addRoute {path: '/asdf', method: 'other', handler: (req, res)->}

    it "should throw an error if the handler is undefined", ->
      fn = -> router.addRoute {path: '/asdf', method: 'get'}
      expect(fn).to.throw 'route.handler must be defined'

    it "should throw an error if the handler is not a function", ->
      fn = -> router.addRoute {path: '/asdf', method: 'get', handler: 'blah'}
      expect(fn).to.throw 'route.handler must be a function'

    it "should throw an error if the same path+method combo is added twice", ->
      router.addRoute {path: '/asdf', method: 'get', handler: (req, res)->}
      expect(-> router.addRoute {path: '/asdf', method: 'get', handler: (req, res)->}).to.throw "Duplicate path and method registered: \"/asdf\" get"

    it "should allow the same path with different methods", ->
        router.addRoute {path: '/asdf', method: 'get', handler: (req, res)->}
        router.addRoute {path: '/asdf', method: 'post', handler: (req, res)->}

  describe 'route', ->
    #helper to wrap our route method in a promise for tests
    routeAsync = (path, method, headers, input)->
      inputStream = new PassThrough(); #passthrough stream to write test objects to a stream
      inputStream.end(JSON.stringify(input));
      return new Promise (resolve, reject)->
        router.route path, method, headers, inputStream, (superRouterResponseStream)->
          superRouterResponseStream.on 'data', (chunk)->
            resolve({headers: superRouterResponseStream.getHeaders(), body: chunk})

    beforeEach ->
      router = new Router()
      #helper to create a "business logic" handler that echos back input
      createHandler = (s)->
        return (requestStream, responseStream)->
          responseStream.send(
            {
              handler: s,
              headersReceived: requestStream.getHeaders(),
              inputReceived: requestStream.input,
              routeInfoReceived: requestStream.routeInfo
            });

      router.addRoute {path: '/obj', method: router.METHODS.GET, handler: createHandler('a')}
      router.addRoute {path: '/obj', method: router.METHODS.POST, handler: createHandler('b')}
      router.addRoute {path: '/obj/:id', method: router.METHODS.GET, handler: createHandler('c')}
      router.addRoute {path: '/obj/:id/action/:action', method: router.METHODS.GET, handler: createHandler('d')}

      router.addRoute {path: '/matchOnAnyPath', method: router.METHODS.ALL, handler: createHandler('e')}
      router.addRoute {path: '/matchOnAnyPath(/*_optionalPathPart)', method: router.METHODS.ALL, handler: createHandler('f')}
      router.addRoute {path: '/passThrough(/*_restOfRoute)', method: router.METHODS.ALL, handler: (req, res)->
        router.route '/'+req.routeInfo._restOfRoute, req.method, req.getHeaders(), req, (responseStream)->
          responseStream.pipe(res);
        }

    describe 'options requests', ->
      it '1', ->
        expect(routeAsync('/', 'options', {}, {}))
        .to.eventually.have.deep.property('body.child_routes[0].path', '/obj')

      it '2', ->
        expect(routeAsync('/', 'options', {}, {}))
        .to.eventually.have.deep.property('body.child_routes[1].path', '/obj')

      it '3', ->
        expect(routeAsync('/obj', 'options', {}, {}))
        .to.eventually.have.deep.property('body.child_routes[0].path', '/obj/:id')

      it '4', ->
        expect(routeAsync('/notaroute', 'options', {}, {}))
        .to.eventually.have.deep.property('headers.statusCode', 404)

      it '5', ->
        expect(routeAsync('/matchOnAnyPath', 'options', {}, {}))
        .to.eventually.have.deep.property('body.child_routes.length', 0)

    it "should match on exact matches", ->
      expect(routeAsync('/obj', 'get', {}, {}))
      .to.eventually.have.deep.property('body.handler', 'a')

    it "should match on any path if the ALL method was specified for the route", ->
        expect(routeAsync('/matchOnAnyPath', 'get', {}, {}))
        .to.eventually.have.deep.property('body.handler', 'e')

        expect(routeAsync('/matchOnAnyPath', 'put', {}, {}))
        .to.eventually.have.deep.property('body.handler', 'e')

        expect(routeAsync('/matchOnAnyPath', 'post', {}, {}))
        .to.eventually.have.deep.property('body.handler', 'e')

        expect(routeAsync('/matchOnAnyPath', 'delete', {}, {}))
        .to.eventually.have.deep.property('body.handler', 'e')

    it "should add any URI params with _ to routeInfo instead of input", ->
        expect(routeAsync('/matchOnAnyPath/this/is/optional', 'get', {}, {}))
        .to.eventually.have.deep.property('body.routeInfoReceived._optionalPathPart', 'this/is/optional')

    it "should be able to passthrough and pipe to other routes", ->
          expect(routeAsync('/passThrough/obj', 'get', {}, {}))
          .to.eventually.have.deep.property('body.handler', 'a')

          expect(routeAsync('/passThrough/obj', 'post', {}, {}))
          .to.eventually.have.deep.property('body.handler', 'b')

          expect(routeAsync('/passThrough/obj/123', 'get', {headerParam: 'foo'}, {bodyParam:'bar'}))
          .to.eventually.have.deep.property('body.inputReceived.id', '123')

          expect(routeAsync('/passThrough/obj/123', 'get', {headerParam: 'foo'}, {bodyParam:'bar'}))
          .to.eventually.have.deep.property('body.inputReceived.bodyParam', 'bar')

          expect(routeAsync('/passThrough/obj/123', 'get', {headerParam: 'foo'}, {bodyParam:'bar'}))
          .to.eventually.have.deep.property('body.headersReceived.headerParam', 'foo')

          expect(routeAsync('/passThrough/obj/123', 'get', {headerParam: 'foo'}, {bodyParam:'bar'}))
          .to.eventually.have.deep.property('body.routeInfoReceived.originPath', '/passThrough/obj/123')

    it "should run the right handler for method", ->
      expect(routeAsync('/obj', 'post', {}, {}))
      .to.eventually.have.deep.property('body.handler', 'b')

    it "should not run a handler on a route that doesn't match", ->
      expect(routeAsync('/objBAD', 'get', {}, {}))
      .to.eventually.not.have.deep.property('body.handler')

      expect(routeAsync('/objBAD', 'get', {}, {}))
      .to.eventually.have.deep.property('headers.statusCode', 404)

    it "should return a 405 if path matches, but not method", ->
      expect(routeAsync('/obj', 'put', {}, {}))
      .to.eventually.not.have.deep.property('body.handler')

      expect(routeAsync('/obj', 'put', {}, {}))
      .to.eventually.have.deep.property('headers.statusCode', 405)


    it "should take params from URI and add them to input", ->
      expect(routeAsync('/obj/123', 'get', {}, {}))
      .to.eventually.have.deep.property('body.inputReceived.id', '123')

      expect(routeAsync('/obj/123/action/run', 'get', {}, {}))
      .to.eventually.have.deep.property('body.inputReceived.id', '123')

      expect(routeAsync('/obj/123/action/run', 'get', {}, {}))
      .to.eventually.have.deep.property('body.inputReceived.action', 'run')

    it "should take params from input", ->
      expect(routeAsync('/obj', 'get', {}, {id: 123}))
      .to.eventually.have.deep.property('body.inputReceived.id', 123)

    it "should return a 400 if a URI param with the same name as a body param has a different value", ->
      expect(routeAsync('/obj/123', 'get', {}, {id: 456}))
      .to.eventually.have.deep.property('headers.statusCode', 400)

    it "should return a 200 if a URI param with the same name as a body param has the same value", ->
      expect(routeAsync('/obj/123', 'get', {}, {id: "123"}))
      .to.eventually.have.deep.property('headers.statusCode', 200)

      expect(routeAsync('/obj/123', 'get', {}, {id: "123"}))
      .to.eventually.have.deep.property('body.inputReceived.id', '123')

    it "should take params from headers", ->
      expect(routeAsync('/obj', 'post', {boggle: 'at the situation'}, {}))
      .to.eventually.have.deep.property('body.headersReceived.boggle', 'at the situation')

    describe 'validateInput', ->
      beforeEach ->
        router.addRoute({
          path: '/validate/:id'
          method: 'get'
          handler: (req, res)->
            res.send({idReceived: req.input.id})
          validateInput: (input, deferred)->
            idAsInt = parseInt(input.id);
            if isNaN(idAsInt)
              return deferred.reject("id must be a number")
            return deferred.resolve();
          });

      it 'should return 400 if validation fails', ->

        expect(routeAsync('/validate/bad', 'get', {}, {}))
        .to.eventually.have.deep.property('headers.statusCode', 400)

      it 'should have an error message if validation fails', ->
        expect(routeAsync('/validate/bad', 'get', {}, {}))
        .to.eventually.have.deep.property('body.message', 'id must be a number')

      it 'should return 200 if validation passes', ->
        expect(routeAsync('/validate/123', 'get', {}, {}))
        .to.eventually.have.deep.property('headers.statusCode', 200)

    #skipping this for now, since we are not using protovalidation
    describe.skip 'proto stuff', ->
      beforeEach (done)->
        pathToProtos = path.resolve('./test/') + '/'
        router = new Router({protosLocation: pathToProtos});
        router.addRoute '/person', router.METHODS.POST, 'Person.CreateReq', 'Person.CreateRes', (req, res)->
          person = req.input;
          person.id = 123;
          res.send(person)

        router.addRoute '/personRouteWithProgrammerError', router.METHODS.POST, 'Person.CreateReq', 'Person.CreateRes', (req, res)->
          person = req.input;
          person.idzzzzzzz = 123;
          res.send(person)

        #give the router a sec to load protofiles
        setTimeout ->
          done()
        , 0


      it "should throw an error if a route is added with proto locations, but no proto directory was given to the router", ->
        fn = ->
          testRouter = new Router();
          testRouter.addRoute('/temp', 'get', 'test.test', 'test.test', (req, res)->)
        expect(fn).to.throw()

      it "should reutrn 400 when input doesn't match proto", ->
          expect(routeAsync('/person', 'post', {}, {}))
          .to.eventually.have.deep.property('headers.statusCode', 400)

      it "should reutrn 200 when input does match proto", ->
          expect(routeAsync('/person', 'post', {}, {name: 'John', title: 'The Destroyer'}))
          .to.eventually.have.deep.property('headers.statusCode', 200)

      it "should not care about missing optional stuff", ->
        expect(routeAsync('/person', 'post', {}, {name: 'John'}))
        .to.eventually.have.deep.property('headers.statusCode', 200)

      it "should return 400 if a required field is missing", ->
        expect(routeAsync('/person', 'post', {}, {title: 'The Destroyer'}))
        .to.eventually.have.deep.property('headers.statusCode', 400)

      it.skip "should throw an error if the output of a route does not match proto", ->
        fn = ->
            passThrough = new PassThrough();
            passThrough.end(JSON.stringify({name: 'John', title: 'The Destroyer'}));
            router.route '/personRouteWithProgrammerError', 'post', {}, passThrough, (res)->

        expect(fn).to.throw()
