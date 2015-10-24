'use strict';
const _                = require('lodash');
const Route            = require('./Route');
const Request          = require('./Request');
const Response         = require('./Response');
const Q                = require('q');
const isReadableStream = require('isstream').isReadable;

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
   * and method filters. If not supplied, the middleware will be executed against all requests.
   *
   * @example
   * app.use({
   *  path : '/a/b',
   *  method : 'get',
   *  handler : ({request, response}) => {
   *    //...
   *  }
   * });
   *
   * app.use({
   *  handler : ({request, response}) => {
   *    //...
   *  }
   * });
   *
   * @param {Route|Object} route - The middleware route.
   * @returns {App} - app instance for chaining
   */
  //TODO: if route is jsut a function, make it the handler and move on
  use(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._middleware.push(route);
    return this;
  }

  /**
   * Adds an error-handling middleware route. These routes are processed in order, and will only be
   * invoked if the previous middleware has thrown or rejected with an error. They are invoked with
   * the request, response, and previous error.
   *
   * @example
   * app.useError({
   *  path : '/a/b',
   *  method : 'get',
   *  handler : ({request, response, error}) => {
   *    //...
   *  }
   * });
   *
   * app.useError({
   *  handler : ({request, response, error}) => {
   *    //...
   *  }
   * });
   *
   * @param {Route|Object} route - The middleware route.
   * @returns {App} - app instance for chaining
   */
  useError(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    this._errorMiddleware.push(route);
    return this;
  }

  _chainResponses(prevResponse, returnVal) {
    const newResponse = new Response(prevResponse);

    let inputStream = prevResponse;
    if (isReadableStream(returnVal)) {
      inputStream = returnVal;
    }
    inputStream.pipe(newResponse);

    return newResponse;
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
      throw new TypeError('request must be instance of a SuperRouter Request object.');
    }

    let promise  = Q();
    let response = new Response();
    _.each(this._middleware, (route) => {
      promise = promise.then((returnVal) => {
        response = this._chainResponses(response, returnVal);
        return route.execute({ request, response });
      });
    });
    _.each(this._errorMiddleware, (route) => {
      if (!route.isMatch(request)) {
        return;
      }
      promise = promise.catch((error) => {
        response = this._chainResponses(response, null);
        return route.execute({ request, response, error });
      });
    });

    return promise.then((returnVal) => {
      return this._chainResponses(response, returnVal);
    });
  }
}

module.exports = App;
