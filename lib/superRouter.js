var _ = require('lodash'),
  pathToRegex = require('path-to-regexp');

var ROUTE_TEMPLATE = {
  path     : '',
  pathKeys : [],
  pathRegex: null,
  method   : null,
  input    : null,
  output   : null,
  handler  : null
}

function Router() {
  this.routes = {}
}

Router.prototype.METHODS = {
  GET      : 'get',
  PUT      : 'put',
  POST     : 'post',
  DELETE   : 'delete',
  HEAD     : 'head',
  OPTIONS  : 'options',
  SUBSCRIBE: 'subscribe'
}

Router.prototype.addRoute = function addRoute(path, method, input, output, handler) {
  if (_.isUndefined(path)) {
    throw new Error("First argument: path must be defined.")
  }

  if (!_.isString(path)) {
    throw new Error("First argument: path must be a string.")
  }

  if (_.isUndefined(method)) {
    throw new Error("Second argument: method must be defined.")
  }

  if (!(_.isString(method) && _.contains(this.METHODS, method.toLowerCase()))) {
    throw new Error("Second argument: method must be defined in the METHODS enum.")
  }

  if (_.isUndefined(input)) {
    throw new Error("Third argument: input must be defined.")
  }

  if (_.isUndefined(output)) {
    throw new Error("Fourth argument: output must be defined.")
  }

  if (_.isUndefined(handler)) {
    throw new Error("Fifth argument: handler must be defined.")
  }

  if (!_.isFunction(handler)) {
    throw new Error("Fifth argument: handler must be a function.")
  }

  var pathKeys = [],
    pathRegex = pathToRegex(path, pathKeys);

  if(_.isUndefined(this.routes[path])) {
    this.routes[path] = {
      path     : path,
      pathKeys : pathKeys,
      pathRegex: pathRegex,
      handlers : {}
    }
  }

  this.routes[path].handlers[method] = {
    method   : method,
    input    : input,
    output   : output,
    handler  : handler
  }

};

// TODO: probably not needed
//Router.prototype.addTransport = function addTransport() {
//}

//TODO: input / output processing?
//TODO: take method out, pull it off of headers
Router.prototype.route = function route(path, method, headers, input, done) {
  input = input || {};
  input = _.cloneDeep(input);

  var matchedRoute = _.find(this.routes, function matchRoute(route) {
    var matches = route.pathRegex.exec(path);

    if(method)

    if(matches == null) {
      return false;
    }

    for (var i = 1; i < matches.length; i++) {
      var key = route.pathKeys[i - 1];
      var prop = key.name;
      var val = matches[i];

      if (!_.isUndefined(val) || !(hasOwnProperty.call(input, prop))) {
        input[prop] = val;
      }
    }

    return true;
  });

  if(matchedRoute == null) {
    throw new Error("No route found");
  }

  var path = matchedRoute.path,
    method = matchedRoute.method,
    input = matchedRoute.input,
    output = matchedRoute.output,
    handler = matchedRoute.handler;

  /*

  - Match route by path regex
  - If an unmatched route, return 404
  - If an options request, we need to structure the options response
    - Supported methods
    - Expected input / output formats
    - Child resource urlis
  - If an unsupported method, return 405 (method not supported)
  - Process input (deserialize depending on content-type header)
  - Extend input with uri params
  - Validate input
    - If invalid, return 400



   */


}


module.exports = Router