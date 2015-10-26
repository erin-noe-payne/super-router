'use strict';
const _           = require('lodash');
const utils       = require('./utils');
const Route       = require('./Route');
const METHOODS    = require('./METHODS');
const RouteParser = require('route-parser');

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
    this._parsed   = new RouteParser(this._path);
    this._routes   = new Map();
    this._children = new Map();

    this.addRoute({
      path    : this.path,
      method  : METHOODS.OPTIONS,
      handler : (options) => {
        const response = options.response;

        response.setBody(this.toJs());
      }
    });
  }

  get path() {
    return this._path;
  }

  _parsePath(path) {
    return this._parsed.match(path);
  }

  addRoute(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }
    if (!this.isSame(route)) {
      throw new TypeError('route path must match node path.');
    }
    if (this._routes.has(route.method)) {
      throw new TypeError(`duplicate method "${route.method}" added for path "${route.path}"`);
    }
    this._routes.set(route.method, route);
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

  getChildren() {
    return Array.from(this._children.values());
  }

  getRoutes() {
    return Array.from(this._routes.values());
  }

  isParent(route) {
    return utils.comparePaths(route.path, this.path) === 1;
  }

  isSame(route) {
    return utils.comparePaths(route.path, this.path) === 0;
  }

  canInsert(route) {
    return this.isSame(route) || this.isParent(route);
  }

  insert(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    if (!(this.canInsert(route))) {
      throw new TypeError(`Cannot insert "${route.path}" into "${this.path}". It is not a match or a child path.`);
    }

    if (this.isSame(route)) {
      return this.addRoute(route);
    }

    for (const child of this._children.values()) {
      if (child.canInsert(route)) {
        return child.insert(route);
      }
    }

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

  find(request) {
    let match;
    if (this._parsePath(request.path)) {
      match = this._routes.get(request.method);
      if (match) {
        return match;
      }
    }

    for (const child of this._children.values()) {
      match = child.find(request);
      if (match) {
        return match;
      }
    }

    return null;
  }

  toJs() {
    const pojo = {
      methods     : _.map(this.getRoutes(), (route) => {
        return route.method;
      }),
      childRoutes : _.map(this.getChildren(), (childNode) => {
        return childNode.path;
      })
    };
    return pojo;
  }
}

module.exports = Node;
