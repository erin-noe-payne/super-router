'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('lr-sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _                 = require('lodash');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;

const Node  = require('../lib/Node');
const Route = require('../lib/Route');
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
      const node = new Node({ path : '/stuff' });
      expect(node.path).to.equal('/stuff');
    });

    it('should throw on assignment to path', () => {
      const node = new Node({ path : '/stuff' });
      expect(() => {
        node.path = '/asdfa';
      }).to.throw('Cannot set property');
    });
  });

  describe('methods', () => {
    let node;
    let route;

    beforeEach(() => {
      route = {
        path    : '/stuff',
        method  : 'get',
        handler : () => {

        }
      };
      node  = new Node({ path : '/stuff' });
    });

    describe('#addRoute', () => {

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
        }).to.throw('duplicate method "get" added for path "/stuff"');
      });
    });

    describe('#getRoute', () => {
      it('should throw if input is not a string', () => {
        expect(() => {
          node.getRoute(7);
        }).to.throw('First argument: method must be a string.');
      });

      it('should return an added route', () => {
        node.addRoute(route);
        expect(node.getRoute('get').method).to.eql(route.method);
      });

      it('should lowercase the method name', () => {
        node.addRoute(route);
        expect(node.getRoute('GET').method).to.eql(route.method);
      });
    });

    describe('#addChild', () => {

      it('should be able to add children and be returned with getChild', () => {
        const child1 = new Node({ path : '/child1' });
        const child2 = new Node({ path : '/child2' });
        const child3 = new Node({ path : '/child3' });
        node.addChild(child1);
        node.addChild(child2);
        node.addChild(child3);
        expect(node.getChild('/child1').path).to.equal('/child1');
        expect(node.getChild('/child2').path).to.equal('/child2');
        expect(node.getChild('/child3').path).to.equal('/child3');
      });

      it('should throw an error if a child with a duplicate path is added', () => {
        const child = new Node({ path : '/child' });
        node.addChild(child);
        expect(() => {
          node.addChild(child);
        }).to.throw(`Cannot add duplicate child on path ${child.path}`);
      });

    });

    describe('#insert', () => {
      let root, a, ab, az, abc, abd;
      let route;
      beforeEach(() => {
        root = new Node({ path : '/' });
        a    = new Node({ path : '/a' });
        abc  = new Node({ path : '/a/b/c' });
        abd  = new Node({ path : '/a/b/d' });
        az  = new Node({ path : '/a/z' });

        root.addChild(a);
        a.addChild(az);
        a.addChild(abc);
        a.addChild(abd);
      });

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
        const route = new Route({
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
        expect(newNode.getRoute('get')).to.equal(route);
      });

      it('should reassign children as needed', () => {
        const route = new Route({
          path    : '/a/b',
          method  : 'get',
          handler : sinon.spy()
        });

        root.insert(route);
        const abNode = a.getChild('/a/b');
        expect(abNode).to.exist;
        expect(a.getChild('/a/z')).to.be.exist;
        expect(a.getChild('/a/b/c')).to.be.undefined;
        expect(a.getChild('/a/b/d')).to.be.undefined;
        expect(abNode.getChild('/a/b/c')).to.equal(abc);
        expect(abNode.getChild('/a/b/d')).to.equal(abd);
      });
    });

  });
});
