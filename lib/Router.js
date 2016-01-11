'use strict';

const Route     = require('./Route');
const RouteTree = require('./RouteTree');

const SPLAT    = /\*/;
const OPTIONAL = /\(/;

/**
 * SuperRouter Router object
 */
class Router {
  constructor() {
    this._routesTree = new RouteTree();

    this.match   = this.match.bind(this);
    this.execute = this.execute.bind(this);
  }

  /**
   * Adds a route to the router. Routes must be unique and deterministic (no splats or optionals). Routes can
   * be annotated with additional information, will be available on the Request after matching.
   *
   * Any route parameters defined in the path will be available on the request.routeParams object when the
   * handler is executed.
   *
   * If the route handler returns a promise, the app will wait for that promise to resolve or reject before
   * moving to the next middleware in the stack.
   *
   * @example
   * router.addRoute({
   *  path : '/cases/:caseId',
   *  methods : 'get',
   *  handler : ({request, response}) => {
   *    return Database.getCaseById(request.routeParams.caseId).then((caseInstance) => {
   *      request.setBody(caseInstance);
   *    });
   *  }
   * });
   *
   * @param {Route} route - The route definition. If a plain object is provided, will be run through the
   *   Route constructor.
   * @returns {void}
   */
  addRoute(route) {
    if (!(route instanceof Route)) {
      route = new Route(route);
    }

    if (route.path.match(SPLAT) || route.path.match(OPTIONAL)) {
      throw new TypeError('Splats and optional groups are not supported for routes.');
    }

    this._routesTree.addRoute(route);
  }

  /**
   * Middleware to be consumed by a SuperRouter App instance. Causes a request to be matched against
   * the router. The matched route will be assigned to `request.matchedRoute`. In the case of no match,
   * the middleware does not throw an error; the matchedRoute key will simply be undefined.
   *
   * @example
   * app.then(router.match);
   *
   * @param {object} options - The request & response used by app middleware.
   * @returns {void}
   * @throws an error with a code of 404 if no match is found
   */
  match(options) {
    const request = options.request;

    request.matchedRoute = this._routesTree.find(request);

    if (request.matchedRoute == null) {
      const error = new Error(`No route matched ${request.path}`);
      error.name = 'PathNotFound';
      error.statusCode = 404;
      throw error;
    }
  }

  /**
   * Middleware to be consumed by a SuperRouter App instance. Causes the handler of a matched route to
   * be executed. If `request.matchedRoute` is not defined, the middleware does nothing.
   *
   * @example
   * app.then(router.execute);
   *
   * @param {object} options - The request & response used by app middleware.
   * @returns {void}
   */
  execute(options) {
    const request  = options.request;
    const response = options.response;

    if (request.matchedRoute != null) {
      return request.matchedRoute.execute({ request, response });
    }
  }

}

module.exports = Router;
