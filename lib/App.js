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
  }

  /**
   * Adds a middleware route as a 'then'.
   *
   * @param {Route|Function} route - The middleware route. If a function is provided, it will be
   *  used as the handler. If a plain object is provided, it will be run through the Route constructor.
   * @returns {App} - app instance for chaining
   */
  then(route) {
    return this._addMiddleware(route, 'then');
  }

  /**
   * Adds a middleware route as a 'catch'.
   *
   * @param {Route|Function} route - The middleware route. If a function is provided, it will be
   *  used as the handler. If a plain object is provided, it will be run through the Route constructor.
   * @returns {App} - app instance for chaining
   */
  catch(route) {

    return this._addMiddleware(route, 'catch' );
  }

  /**
   * Adds a middleware route. These routes are processed in order, and the catches will only be
   * invoked if the previous middleware has thrown or rejected with an error. They are invoked with
   * the request, response, and possibly previous error. If just a function is provided, it is used as the
   * middleware handler.
   *
   * If the middleware returns a promise, the app will wait for that promise to resolve or reject before
   * moving to the next middleware in the stack.
   *
   * An error handler can be supplied in case there is an error. This allows more complicated error
   * handling to fail but something to still be executed.
   *
   * @example
   * app.catch({
   *  path : '/a/b',
   *  methods : 'get',
   *  handler : ({request, response, error}) => {
   *    //...
   *  }
   * });
   *
   * app.catch({
   *  path : '/a/b',
   *  methods : 'get',
   *  handler : ({request, response, error}) => {
   *    //...
   *  },
   *  errorHandler : ({request, response, error}) => {
   *    //...
   *  }
   * });
   *
   * app.catch(({request, response, error}) => {
   *    //...
   * });
   *
   * @param {Route|Function} route - The middleware route. If a function is provided, it will be
   *  used as the handler. If a plain object is provided, it will be run through the Route constructor.
   * @param {String} method - whether the supplied route should be used as a then or a catch
   * @returns {App} - app instance for chaining
   */
  _addMiddleware(route, method) {
    if (_.isFunction(route)) {
      route = { handler : route };
    }
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._middleware.push({ route, method });
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
    _.each(this._middleware, (middleware) => {
      const route = middleware.route;
      const method = middleware.method;

      if ( method === 'then' ) {
        promise = promise.then(() => {
          if (!response.ended) {
            return route.execute({ request, response });
          }
        });
      }
      else {
        if (!route.isMatch(request)) {
          return;
        }
        promise = promise.catch((error) => {
          if (!response.ended) {
            return route.execute({ request, response, error });
          }
        });
      }
    });

    return promise.then(() => {
      return response;
    });
  }
}

module.exports = App;
