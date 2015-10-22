'use strict';

const Route     = require('./Route');
const RouteTree = require('./RouteTree')

const SPLAT    = /\*/;
const OPTIONAL = /\(/;

class Router {
  constructor() {
    this._redirects  = [];
    this._routesTree = new RouteTree();
  }

  addRoute(options) {
    const route = new Route(options);

    if (route.path.match(SPLAT) || route.path.match(OPTIONAL)) {
      throw new TypeError('Splats an optional groups are not supported for routes.');
    }

    this._routesTree.addRoute(route);
  }

  addRedirect(options) {

  }

  match() {
    //TODO: middleware that processes a route against redirects and the route tree to find THE matched route
  }

  execute() {
    //TODO: middleware that invokes the handler attached to the req object
  }

}

module.exports = Router;
