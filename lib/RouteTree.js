'use strict';

const Node  = require('./Node');

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

module.exports = RouteTree;
