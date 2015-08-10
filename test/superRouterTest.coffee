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
      router.addRoute '/asdf', router.METHODS.GET, {}, {}, ->

    it "should accept a method string defined in the METHODS enum", ->
      router.addRoute '/asdf', 'get', {}, {}, ->

    it "should accept a method string defined in the METHODS enum, case insensitive", ->
      router.addRoute '/asdf', 'GeT', {}, {}, ->

    it "should accept a custom method added to the METHODS enum", ->
      router.METHODS.OTHER = 'other'
      router.addRoute '/asdf', 'other', {}, {}, ->

    it "should throw an error if the input is undefined", ->
      expect(-> router.addRoute '/asdf', 'get').to.throw "Third argument: input must be defined."

    it "should throw an error if the output is undefined", ->
      expect(-> router.addRoute '/asdf', 'get', {}).to.throw "Fourth argument: output must be defined."

    it "should throw an error if the handler is undefined", ->
      expect(-> router.addRoute '/asdf', 'get', {}, {}).to.throw "Fifth argument: handler must be defined."

    it "should throw an error if the handler is not a function", ->
      expect(-> router.addRoute '/asdf', 'get', {}, {}, 'asdf').to.throw "Fifth argument: handler must be a function."

