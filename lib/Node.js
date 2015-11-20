'use strict';
const _           = require('lodash');
const utils       = require('./utils');
const Route       = require('./Route');
const METHOODS    = require('./METHODS');
const RouteParser = require('route-parser');

/**
 * Router Node.
 * Represents a unique path on the router. Each node may contain one route per method, and any number of child nodes.
 * Nodes build a linked tree structure, representing each unique route on the router. It is used to serve OPTIONS
 * requests.
 */
class Node {

  /**
   * Node constructor.
   *
   * Creating a node automatically registers the OPTIONS request on this path.
   *
   * @param {Object} options - The input options
   * @param {String} options.path - The path pattern the node represents
   * @returns {Node} - The Node instance
   */
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

    this._path     = utils.normalizePath(options.path);
    this._parsed   = new RouteParser(this._path);
    this._routes   = new Map();
    this._children = new Map();

    this.addRoute({
      path    : this.path,
      method  : METHOODS.OPTIONS,
      handler : (options) => {
        const response = options.response;

        response.setBody(this.toObject());
      }
    });
  }

  /**
   * Gets the path pattern that the node represents.
   *
   * @returns {String} - The path
   */
  get path() {
    return this._path;
  }

  /**
   * Parses the given path string against this node's path pattern. If the input path is a match, returns
   * an object whose key value pairs are the matched route params and their values. If the path is not a match,
   * returns false.
   *
   * @param {String} path - The input path
   * @returns {Boolean|Object} - False if the path is not a match, an object if it is.
   * @private
   */
  _parsePath(path) {
    return this._parsed.match(path);
  }

  /**
   * Adds a route to the node. Will throw an error if the route does not match the path of the node, if there is
   * already a route registered on the given method, or if the route method is ALL (routes on a node must be
   * deterministic).
   *
   * @param {Route} route - The route to add to the node.
   * @throws TypeError - On validation error.
   * @returns {void}
   */
  addRoute(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }
    if (!this.isSame(route)) {
      throw new TypeError('route path must match node path.');
    }
    if (route.method === METHOODS.ALL) {
      throw new TypeError('cannot register route with method ALL on node.');
    }
    if (this._routes.has(route.method)) {
      throw new TypeError(`duplicate method "${route.method}" added for path "${route.path}"`);
    }
    this._routes.set(route.method, route);
  }

  /**
   * Adds a child node to this node.
   *
   * @param {Node} node - The node to add as a child.
   * @returns {void}
   */
  addChild(node) {
    if (!(node instanceof Node)) {
      node = new Node(node);
    }
    if (this._children.has(node.path)) {
      throw new TypeError(`Cannot add duplicate child on path ${node.path}`);
    }

    this._children.set(node.path, node);
  }

  /**
   * Returns the node's children as an array.
   *
   * @returns {Array<Node>} - The node's children.
   */
  getChildren() {
    return Array.from(this._children.values());
  }

  /**
   * Returns the node's routes as an array.
   *
   * @returns {Array<Route>} - The routes associated with this node.
   */
  getRoutes() {
    return Array.from(this._routes.values());
  }

  /**
   * Indicates if this node is a parent to a route by comparing their paths.
   *
   * @param {Route} route - The route to compare.
   * @returns {boolean} - If this node is a parent to the input route.
   */
  isParent(route) {
    return utils.comparePaths(route.path, this.path) === 1;
  }

  /**
   * Indicates if this node represents the same path as a route.
   *
   * @param {Route} route - The route to compare.
   * @returns {boolean} - If this node is the same path as the input route.
   */
  isSame(route) {
    return utils.comparePaths(route.path, this.path) === 0;
  }

  /**
   * Indicates if the node can insert a route. Returns true if the node is the same or a parent to the route.
   *
   * @param {Route} route - The route to compare.
   * @returns {boolean} - If the route can be inserted on this node.
   */
  canInsert(route) {
    return utils.comparePaths(route.path, this.path) !== -1;
  }

  /**
   * Recursively inserts a route into the node.
   * If the node is not the same or a parent to the route, has no effect.
   * If the route is on the same path as the node, adds the route to this node.
   * If the route can be inserted on a child node, recurses down to the child node.
   * Otherwise, adds a new child node to this node, then adds the route to the child node.
   *
   * @param {Route} route - The route to insert.
   * @returns {void}
   */
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

  /**
   * Recursively finds a route that matches the specified request. Returns a matching route or null if not match
   * can be found.
   *
   * @param {Request} request - The request to find a matching route against
   * @returns {Route} - The matching route.
   * @throws an error with a code of 405 if no method match is made
   */
  find(request) {
    let match;
    if (this._parsePath(request.path)) {
      match = this._routes.get(request.method);
      if (match != null) {
        return match;
      }
      else {
        const error = new Error(`Invalid method ${request.method} for path ${request.path}`);
        error.name = 'MethodNotFound';
        error.statusCode = 405;
        throw error;
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

  /**
   * Returns a pojo representation of the node.
   *
   * @returns {Object} - Plain object representation of the node.
   */
  toObject() {
    const pojo = {
      methods : _.map(this.getRoutes(), (route) => {
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
