'use strict';

const chai = require('chai');
const expect = chai.expect;

const RouteTree = require('././RouteTree.js');
const RouteTreeNode = require('././RouteTreeNode.js');

let tree = null;

describe('Route Tree Node', function () {

  it('should throw an error if you try to create a node without a path', function () {
    const fn = () => {
      const node = new RouteTreeNode();
    };
    expect(fn).to.throw();
  });

  it('should throw an error if you try to create a node with a path without a /', function () {
    const fn = () => {
      const node = new RouteTreeNode('a');
    };
    expect(fn).to.throw();
  });

  it('should return the path set in the constructor', function () {
    const node = new RouteTreeNode('/a');
    expect(node.path).to.equal('/a');
  });

  it('should throw an error if you try to set the path outside the constructor', function () {
    const fn = () => {
      const node = new RouteTreeNode('a');
      node.path = 'something else';
    };
    expect(fn).to.throw();
  });

  describe('setting children and parents', function () {
    let a, b, c;
    beforeEach(function () {
      a = new RouteTreeNode('/a');
      b = new RouteTreeNode('/b');
      c = new RouteTreeNode('/c');
    });

    it('should return the correct number of children', function () {
      a.addChild(b);
      a.addChild(c);
      expect(a.children.length).to.equal(2);
    });

    it('not add duplicate children', function () {
      a.addChild(b);
      a.addChild(c);
      a.addChild(c);
      a.addChild(b);
      a.addChild(c);
      a.addChild(c);
      expect(a.children.length).to.equal(2);
    });

    it('should allow parents to be set', function () {
      b.parent = '/a';
      c.parent = '/a';
      expect(b.parent).to.equal('/a');
      expect(c.parent).to.equal('/a');
    });


  });

});

describe('Route Tree', function () {
  beforeEach(function () {
    tree = new RouteTree();
  });

  it('should have a root of / after being constructed', function () {
    expect(tree.root.path).to.equal('/');
  });

  it('the first node added should become a child of root', function () {
    tree.addPath('/a');
    expect(tree.root.children[0].path).to.equal('/a');
  });

  it('paths that should be children of root are siblings', function () {
    tree.addPath('/a');
    tree.addPath('/b');
    tree.addPath('/c');
    expect(tree.root.findChild('/a').path).to.equal('/a');
    expect(tree.root.findChild('/b').path).to.equal('/b');
    expect(tree.root.findChild('/c').path).to.equal('/c');
  });

  it('should add children to children that are along the same path structure', function () {
    tree.addPath('/a');
    tree.addPath('/a/b');
    tree.addPath('/a/b/c');

    const a = tree.root.findChild('/a');
    expect(a.path).to.equal('/a');
    const b = a.children[0];
    expect(b.path).to.equal('/a/b');
    const c = b.children[0];
    expect(c.path).to.equal('/a/b/c');

  });

  it('should add branch children', function () {
    tree.addPath('/a');
    tree.addPath('/a/b');
    tree.addPath('/aa');

    const a = tree.root.findChild('/a');
    expect(a.path).to.equal('/a');
    const b = a.children[0];
    expect(b.path).to.equal('/a/b');
    const aa = tree.root.findChild('/aa');
    expect(aa.path).to.equal('/aa');
    expect(aa.parent).to.equal('/');

  });

  it('should reorder if needed', function () {
    tree.addPath('/a/b');
    expect(tree.root.children[0].path).to.equal('/a/b');
    tree.addPath('/a');
    expect(tree.root.children[0].path).to.equal('/a');
  });

  it('should handle 7.1.4 Case API routes', function () {
    tree.addPath('/cases/:caseNumber');
    tree.addPath('/cases');
    tree.addPath('/cases');
    tree.addPath('/cases/:caseNumber/actions/performAction');
    tree.addPath('/cases/:caseNumber/evidence');
    tree.addPath('/ping');

    const cases = tree.root.findChild('/cases');
    expect(cases.path).to.equal('/cases');
    const caseDetails = cases.findChild('/cases/:caseNumber');
    expect(caseDetails.path).to.equal('/cases/:caseNumber');
  });

  describe('finding nodes', function () {
    beforeEach(function () {
      tree.addPath('/a/1');
      tree.addPath('/b/2');
      tree.addPath('/c/3');
      tree.addPath('/b/2/test');
      tree.addPath('/c/3/test');
    });

    it('should return the correct node by path', function () {
      expect(tree.findPath('nothing')).to.be.undefined;
      expect(tree.findPath('/').path).to.equal('/');
      expect(tree.findPath('/a/1').path).to.equal('/a/1');
      expect(tree.findPath('/c/3/test').path).to.equal('/c/3/test');
    });


  });

});
