'use strict';
const _     = require('lodash');
const Route = require('./Route');

class Node {
  constructor(options) {
    if (!_.isObject(options)) {
      throw new TypeError('options must be an object.');
    }
    if (!_.isString(options.path)) {
      throw new TypeError('path must be a string.');
    }
    if (!/^\//.test(options.path)) {
      throw new TypeError('path must start with a / character.');
    }

    this._path     = options.path;
    this._routes   = new Map();
    this._children = new Map();

    // TODO: add options requests
  }

  get path() {
    return this._path;
  }

  addRoute(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }
    if (route.path !== this.path) {
      throw new TypeError('route path must match node path.');
    }
    if (this._routes.has(route.method)) {
      throw new TypeError(`duplicate method "${route.method}" added for path "${route.path}"`);
    }
    this._routes.set(route.method, route);
  }

  getRoute(method) {
    if (!_.isString(method)) {
      throw new TypeError('First argument: method must be a string.');
    }
    return this._routes.get(method.toLowerCase());
  }

  addChild(node) {
    if (!(node instanceof Node)) {
      node = new Node(node);
    }
    if (this._children.has(node.path)) {
      throw new TypeError(`Cannot add duplicate child on path ${node.path}`);
    }

    this._children.set(node.path, node);
  }

  getChild(path) {
    return this._children.get(path);
  }

  isParent(route) {
    return _.startsWith(route.path, this.path);
  }

  insert(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    if (!this.isParent(route)) {
      throw new TypeError(`Cannot insert "${route.path}" into "${this.path}". It is not a match or a child path.`);
    }

    if (route.path === this.path) {
      return this.addRoute(route);
    }
    this._children.forEach((child) => {
      if (child.isParent(route)) {
        return child.insert(route);
      }
    });
    const newNode = new Node({ path : route.path });
    newNode.addRoute(route);
    this._children.forEach((child, path) => {
      if (newNode.isParent(child)) {
        this._children.delete(path);
        newNode.addChild(child);
      }
    });
    this.addChild(newNode);
  }
}

module.exports = Node;
