'use strict';
const _        = require('lodash');
const Route    = require('./Route');
const Request  = require('./Request');
const Response = require('./Response');
const Q        = require('q');

class App {
  constructor() {
    this._middleware      = [];
    this._errorMiddleware = [];
  }

  use(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._middleware.push(route);
  }

  useError(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._errorMiddleware.push(route);
  }

  processRequest(request) {
    if (!(request instanceof Request)) {
      throw new TypeError('request must be instance of a SuperRouter Request object.');
    }

    const response = new Response();

    let promise = Q();
    _.each(this._middleware, (route) => {
      promise = promise.then(() => {
        return route.execute({ request, response });
      });
    });
    _.each(this._errorMiddleware, (route) => {
      promise = promise.catch((error) => {
        return route.execute({ request, response, error });
      });
    });

    return promise.then(() => {
      return response;
    });
  }
}

module.exports = App;
