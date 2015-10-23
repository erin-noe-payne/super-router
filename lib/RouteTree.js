'use strict';

const _     = require('lodash');
const Node  = require('./Node');
const Route = require('./Route');

class RouteTree {
  constructor() {
    this._root = new Node({ path : '/' });
  }

  addRoute(route) {
    return this._root.insert(route);
  }

  find(request) {
    return this._root.find(request);
  }

}

module.exports = RouteTree
