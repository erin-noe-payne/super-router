'use strict';

const _     = require('lodash');
const Node  = require('./Node');
const Route = require('./Route');

class RouteTree {
  constructor() {
    this._root = new Node({ path : '/' });
  }

  addRoute(route) {
    this._root.insert(route);
  }

}

module.exports = RouteTree
