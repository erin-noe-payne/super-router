'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _                 = require('lodash');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Node    = require('../lib/Node');
const Route   = require('../lib/Route');
const Request = require('../lib/Request');
let sandbox;

describe('Node ', () => {
  const OPTIONS_ERROR    = 'options must be an object.';
  const PATH_ERROR       = 'path must be a string.';
  const PATH_START_ERROR = 'path must start with a / character.';

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should throw if options is undefined', () => {
      expect(() => {
        new Node();
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if options is not an object', () => {
      expect(() => {
        new Node('asdf');
      }).to.throw(OPTIONS_ERROR);
    });

    it('should throw if options.path is undefined', () => {
      expect(() => {
        new Node({});
      }).to.throw(PATH_ERROR);
    });

    it('should throw if options.path is not a string', () => {
      expect(() => {
        new Node({ path : 7 });
      }).to.throw(PATH_ERROR);
    });

    it('should throw if path does not start with a / character', () => {
      expect(() => {
        new Node({ path : 'asdf' });
      }).to.throw(PATH_START_ERROR);
    });

    it('should set the path property from the constructor', () => {
      const node = new Node({ path : '/user' });
      expect(node.path).to.equal('/user');
    });

    it('should throw on assignment to path', () => {
      const node = new Node({ path : '/user' });
      expect(() => {
        node.path = '/asdfa';
      }).to.throw('Cannot set property');
    });
    
    it('should add an options route', () => {
      const node = new Node({ path : '/user' });
      expect(node.getRoutes()).to.have.length(1);
      const optsRoute = node.getRoutes()[0];
      expect(optsRoute.method).to.equal('OPTIONS');
    });
  });

  describe('methods', () => {
    let node;
    let route;

    beforeEach(() => {
      route = {
        path    : '/user',
        method  : 'get',
        handler : () => {

        }
      };
      node  = new Node({ path : '/user' });
    });

    describe('#_optionsHandler', () => {

    });

    describe('#addRoute', () => {
      it('should throw if the route path does not match the node path pattern', () => {

      });

      it('should throw if the path of the route does not match the path of the node', () => {
        route.path = '/junk';
        expect(() => {
          node.addRoute(route);
        }).to.throw('route path must match node path.');
      });

      it('should throw if the method is already defined for this node', () => {
        node.addRoute(route);
        expect(() => {
          node.addRoute(route);
        }).to.throw('duplicate method "GET" added for path "/user"');
      });

      it('should throw if the route method is ALL', () => {
        route.method = '*';

        expect(() => {
          node.addRoute(route);
        }).to.throw('cannot register route with method ALL on node.');
      });
    });

    describe('#addChild', () => {

      it('should be able to add children and be returned with getChildren', () => {
        const child1 = new Node({ path : '/child1' });
        const child2 = new Node({ path : '/child2' });
        const child3 = new Node({ path : '/child3' });
        node.addChild(child1);
        node.addChild(child2);
        node.addChild(child3);
        expect(node.getChildren()).to.eql([child1, child2, child3]);
      });

      it('should throw an error if a child with a duplicate path is added', () => {
        const child = new Node({ path : '/child' });
        node.addChild(child);
        expect(() => {
          node.addChild(child);
        }).to.throw(`Cannot add duplicate child on path ${child.path}`);
      });

    });

    describe('tree walkers', () => {
      let root, a, az, abc, abd;
      beforeEach(() => {
        root = new Node({ path : '/' });
        a    = new Node({ path : '/a' });
        abc  = new Node({ path : '/a/b/c' });
        abd  = new Node({ path : '/a/b/d' });
        az   = new Node({ path : '/a/z' });

        root.addChild(a);
        a.addChild(az);
        a.addChild(abc);
        a.addChild(abd);
      });

      describe('#insert', () => {

        it('should throw an error if the route path is not contained in the nodes path', () => {
          const route = new Route({
            path    : '/',
            method  : 'get',
            handler : sinon.spy()
          });

          expect(() => {
            abc.insert(route);
          }).to.throw('Cannot insert');
        });

        it('should throw an error if the node path does not start the route path', () => {
          const route = new Route({
            path    : '/b/c',
            method  : 'get',
            handler : sinon.spy()
          });

          expect(() => {
            abd.insert(route);
          }).to.throw('Cannot insert');
        });

        it('should add the route to the node if the paths match', () => {
          sandbox.spy(root, 'addRoute');
          const route = new Route({
            path    : '/',
            method  : 'get',
            handler : sinon.spy()
          });
          root.insert(route);

          expect(root.addRoute).to.have.been.calledOnce;
          expect(root.addRoute).to.have.been.calledWith(route);
        });

        it('should insert on a child node, if possible', () => {
          const route = new Route({
            path    : '/a/b/c/e',
            method  : 'get',
            handler : sinon.spy()
          });
          sinon.spy(a, 'insert');
          sinon.spy(abc, 'insert');
          sinon.spy(abd, 'insert');

          root.insert(route);
          expect(a.insert).to.have.been.calledWith(route);
          expect(abc.insert).to.have.been.calledWith(route);
          expect(abd.insert).to.not.have.been.calledWith(route);
        });

        it('should add a new child otherwise', () => {
          const route   = new Route({
            path    : '/a/b',
            method  : 'get',
            handler : sinon.spy()
          });
          sinon.spy(a, 'insert');
          sinon.spy(a, 'addChild');

          root.insert(route);
          expect(a.insert).to.have.been.calledWith(route);
          expect(a.addChild).to.have.been.calledOnce;
          const newNode = a.addChild.firstCall.args[0];
          expect(newNode.path).to.equal('/a/b');
          expect(newNode.getRoutes()).to.contain(route);
        });

        it('should reassign children as needed', () => {
          const route  = new Route({
            path    : '/a/b',
            method  : 'get',
            handler : sinon.spy()
          });

          root.insert(route);
          expect(root.getChildren()).to.eql([a]);
          const aChildren = a.getChildren();
          expect(aChildren).to.have.length(2);
          expect(aChildren).to.contain(az);
          const ab = _.find(aChildren, (child) => {
            return child !== az;
          });
          expect(ab.getChildren()).to.eql([abc, abd]);
        });
        
        it('should insert correctly on route patterns, regardless of param names', () => {
          const node = new Node({ path : '/users/:id' });
          const route1 = new Route({
            path    : '/users/:id',
            method  : 'get',
            handler : sinon.spy()
          });
          const route2 = new Route({
            path    : '/users/:userId',
            method  : 'put',
            handler : sinon.spy()
          });
          node.insert(route1);
          node.insert(route2);

          expect(node.getRoutes()).to.contain(route1);
          expect(node.getRoutes()).to.contain(route2);
        });
      });


      describe('#find', () => {
        let rootGet, aGet;
        beforeEach(() => {
          rootGet = new Route({
            path    : '/',
            method  : 'get',
            handler : sinon.spy()
          });
          root.addRoute(rootGet);

          aGet = new Route({
            path    : '/a',
            method  : 'get',
            handler : sinon.spy()
          });
          a.addRoute(aGet);
        });

        it('should return a match from its routes, if it exists', () => {
          const request = new Request({
            path    : '/',
            method  : 'get',
            headers : {}
          });

          expect(root.find(request)).to.equal(rootGet);
        });

        it('should return undefined if request matches the path, but the route doesnt exist', () => {
          const request = new Request({
            path    : '/',
            method  : 'post',
            headers : {}
          });

          expect(root.find(request)).to.be.null;
        });

        it('should return a match from its children', () => {
          const request = new Request({
            path    : '/a',
            method  : 'get',
            headers : {}
          });

          expect(root.find(request)).to.equal(aGet);
        });
      });

      describe('#toObject', () => {

      });
    });
  });
});
