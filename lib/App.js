'use strict';
const _        = require('lodash');
const Route    = require('./Route');
const Request  = require('./Request');
const Response = require('./Response');
const Q        = require('q');

/**
 * SuperRouter app object. Builds a middleware stack.
 */
class App {
  constructor() {
    this._middleware      = [];
    this._errorMiddleware = [];
  }

  /**
   * Adds a middleware route. When a request is processed, middleware functions are executed with
   * the request and response in the order they were registered. Middleware can optionally specify path
   * and method filters. If not supplied, the middleware will be executed against all requests. If just
   * a function is provided, it is used as the middleware handler.
   *
   * If a middleware returns a promise, the app will wait for that promise to resolve or reject before
   * moving to the next middleware in the stack.
   *
   * If a handler throws an error or rejects its promise, further middleware will be skipped, and the
   * chain will move to the error stack.
   *
   * @example
   * app.use({
   *  path : '/a/b',
   *  methods : 'get',
   *  handler : ({request, response}) => {
   *    //...
   *  }
   * });
   *
   * app.use(({request, response}) => {
   *    //...
   * });
   *
   * @param {Route|Function} route - The middleware route. If a function is provided, it will be
   *  used as the handler. If a plain object is provided, it will be run through the Route constructor.
   * @returns {App} - app instance for chaining
   */
  use(route) {
    if (_.isFunction(route)) {
      route = { handler : route };
    }
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._middleware.push(route);
    return this;
  }

  /**
   * Adds an error-handling middleware route. These routes are processed in order, and will only be
   * invoked if the previous middleware has thrown or rejected with an error. They are invoked with
   * the request, response, and previous error. If just a function is provided, it is used as the
   * middleware handler.
   *
   * If the middleware returns a promise, the app will wait for that promise to resolve or reject before
   * moving to the next middleware in the stack.
   *
   * @example
   * app.useError({
   *  path : '/a/b',
   *  methods : 'get',
   *  handler : ({request, response, error}) => {
   *    //...
   *  }
   * });
   *
   * app.useError(({request, response, error}) => {
   *    //...
   * });
   *
   * @param {Route|Function} route - The middleware route. If a function is provided, it will be
   *  used as the handler. If a plain object is provided, it will be run through the Route constructor.
   * @returns {App} - app instance for chaining
   */
  useError(route) {
    if (_.isFunction(route)) {
      route = { handler : route };
    }

    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._errorMiddleware.push(route);
    return this;
  }

  /**
   * Process a request through the middleware stack. Evaluates the request against each middleware and error
   * middleware as appropriate. Resolves to a Response object. If the promise chain ends in a rejection,
   * will reject with the last error thrown.
   *
   * @param {Request} request - The input request
   * @returns {Promise<Response>} - A promise for a valid response object.
   */
  processRequest(request) {
    if (!(request instanceof Request)) {
      request = new Request(request);
    }

    let promise    = Q();
    const response = new Response();
    _.each(this._middleware, (route) => {
      promise = promise.then(() => {
        return route.execute({ request, response });
      });
    });
    _.each(this._errorMiddleware, (route) => {
      if (!route.isMatch(request)) {
        return;
      }
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
