'use strict';

const Route     = require('./Route');
const RouteTree = require('./RouteTree');
const Request   = require('./Request');
const Response  = require('./Response');

const SPLAT    = /\*/;
const OPTIONAL = /\(/;

class Router {
  constructor() {
    this._redirects  = [];
    this._routesTree = new RouteTree();

    this.match   = this.match.bind(this);
    this.execute = this.execute.bind(this);
  }

  addRoute(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    if (route.path.match(SPLAT) || route.path.match(OPTIONAL)) {
      throw new TypeError('Splats and optional groups are not supported for routes.');
    }

    this._routesTree.addRoute(route);
  }

  match(options) {
    const request = options.request;

    request.matchedRoute = this._routesTree.find(request);
  }

  execute(options) {
    const request  = options.request;
    const response = options.response;

    if (request.matchedRoute != null) {
      return request.matchedRoute.execute({ request, response });
    }
  }

}

module.exports = Router;
