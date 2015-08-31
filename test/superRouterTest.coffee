_ = require('lodash')
chai = require('chai')
expect = chai.expect
sinon = require('sinon')
sinonChai = require('sinon-chai')
Router = require('./..')

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
      ).to.throw("First argument: path must be defined.");

    it "should throw an error if path is not a string", ->
      notString = -> router.addRoute(76);

      expect(notString).to.throw("First argument: path must be a string.")

    it "should throw an error if method is not defined", ->
      noMethod = -> router.addRoute('/asdf')

      expect(noMethod).to.throw("Second argument: method must be defined.")

    it "should throw an error if method is not defined in the METHODS enum", ->
      _.each [7, 'asdf', ->], (badMethod) ->
        expect(-> router.addRoute('/asdf', badMethod)).to.throw "Second argument: method must be defined in the METHODS enum."

    it "should accept a method that is a reference to the METHODS enum", ->
      router.addRoute '/asdf', router.METHODS.GET, null, null, ->

    it "should accept a method string defined in the METHODS enum", ->
      router.addRoute '/asdf', 'get', null, null, ->

    it "should accept a method string defined in the METHODS enum, case insensitive", ->
      router.addRoute '/asdf', 'GeT', null, null, ->

    it "should accept a custom method added to the METHODS enum", ->
      router.METHODS.OTHER = 'other'
      router.addRoute '/asdf', 'other', null, null, ->

    it "should throw an error if the input is undefined", ->
      expect(-> router.addRoute '/asdf', 'get').to.throw "Third argument: input must be defined."

    it "should throw an error if the output is undefined", ->
      expect(-> router.addRoute '/asdf', 'get', null).to.throw "Fourth argument: output must be defined."

    it "should throw an error if the handler is undefined", ->

    it "should accept a null inputProto and outputProto", ->
      router.addRoute '/asdf', 'get', null, null, (headers, input, done)->

    it "should throw an error if the handler is undefined", ->
      expect(-> router.addRoute '/asdf', 'get', null, null).to.throw "Fifth argument: handler must be defined."

    it "should throw an error if the handler is not a function", ->
      expect(-> router.addRoute '/asdf', 'get', null, null, 'asdf').to.throw "Fifth argument: handler must be a function."

    it "should throw an error if the same path+method combo is added twice", ->
      handler = (headers, input, done) ->
      router.addRoute '/asdf', router.METHODS.GET, null, null, handler
      expect(-> router.addRoute '/asdf', router.METHODS.GET, null, null, handler).to.throw "Duplicate path and method registered: \"/asdf\" get"

    it "should allow the same path with different methods", ->
        handler = (headers, input, done) ->
        router.addRoute '/asdf', router.METHODS.GET, null, null, handler
        router.addRoute '/asdf', router.METHODS.POST, null, null, handler

  describe 'route', ->
    responseToClient = {}
    transportCb = (superRouterResponseStream)->
      responseToClient.headers = superRouterResponseStream.headers
      superRouterResponseStream.on 'data', (chunk)->
        responseToClient.body = chunk

    beforeEach ->
      responseToClient = {}

      createHandler = (s)->
        return (headers, input, responseStream)->
          responseStream.send({statusCode: 200},
            {
              handler: s,
              inputReceived: input
            });

      router.addRoute '/obj', router.METHODS.GET, null, null, createHandler('a')
      router.addRoute '/obj', router.METHODS.POST, null, null, createHandler('b')
      router.addRoute '/obj/:id', router.METHODS.GET, null, null, createHandler('c')
      router.addRoute '/obj/:id/action/:action', router.METHODS.GET, null, null, createHandler('d')

    it "should match on exact matches", ->
      router.route '/obj', 'get', {}, {}, transportCb
      expect(responseToClient.body.handler).to.equal('a')

    it "should run the right handler for method", ->
      router.route '/obj', 'post', {}, {}, transportCb
      expect(responseToClient.body.handler).to.equal('b')

    it "should not run a handler on a route that doesn't match", ->
      router.route '/objBAD', 'get', {}, {}, transportCb
      expect(responseToClient.body.handler).to.not.equal('a')
      expect(responseToClient.headers.statusCode).to.equal(404)

    it "should return a 405 if path matches, but not method", ->
      router.route '/obj', 'put', {}, {}, transportCb
      expect(responseToClient.body).to.not.equal('a')
      expect(responseToClient.headers.statusCode).to.equal(405)

    it "should return available routes on options method", ->
      router.route '/obj', 'options', {}, {}, transportCb
      expect(responseToClient.body).to.not.equal('a')
      #TODO - check the format of available routes returned
      expect(responseToClient.headers.statusCode).to.equal(200)

    it "should take params from URI and add them to input", ->
      router.route '/obj/123', 'get', {}, {}, transportCb
      expect(responseToClient.body.handler).to.equal('c')
      expect(responseToClient.body.inputReceived).to.eql({id: "123"})
      router.route '/obj/123/action/run', 'get', {}, {}, transportCb
      expect(responseToClient.body.handler).to.equal('d')
      expect(responseToClient.body.inputReceived).to.eql({id: "123", action: "run"})

    it "should take params from input", ->
      router.route '/obj', 'get', {}, {id: 123}, transportCb
      expect(responseToClient.body.handler).to.equal('a')
      expect(responseToClient.body.inputReceived).to.eql({id: 123})

    it "should return a 400 if a URI param with the same name as a body param has a different value", ->
      router.route '/obj/123', 'get', {}, {id: "456"}, transportCb
      expect(responseToClient.headers.statusCode).to.equal(400)

    it "should return a 200 if a URI param with the same name as a body param has the same value", ->
      router.route '/obj/123', 'get', {}, {id: "123"}, transportCb
      expect(responseToClient.body.handler).to.equal('c')
