var _ = require('lodash'),
        Route = require('route-parser'),
        ProtoBuf = require("protobufjs"),
        path = require('path');

var ROUTE_TEMPLATE = {
  path: '',
  pathKeys: [],
  pathRegex: null,
  method: null,
  inputProto: null,
  outputProto: null,
  handler: null
}

function Router() {
  this.routes = []
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

var pathToFile = path.resolve(__dirname, 'protos.proto')
var builder = ProtoBuf.loadProtoFile(pathToFile);
var routerProtos = builder.build("SuperRouter");

Router.prototype.addRoute = function addRoute(path, method, inputProto, outputProto, handler) {

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

  if (_.isUndefined(inputProto)) {
    throw new Error("Third argument: input must be defined.")
  }

  if (_.isUndefined(outputProto)) {
    throw new Error("Fourth argument: output must be defined.")
  }

  if (_.isUndefined(handler)) {
    throw new Error("Fifth argument: handler must be defined.")
  }

  if (!_.isFunction(handler)) {
    throw new Error("Fifth argument: handler must be a function.")
  }

  var existingPath = _.find(this.routes, function(route){
    return path === route.path && method === route.method
  });

  if(_.isUndefined(existingPath)) {
    this.routes.push({
      path: path,
      route: new Route(path),
      method: method,
      inputProto: inputProto,
      outputProto: outputProto,
      handler: handler
    });
  }
  else {
    throw new Error('Duplicate path and method registered: "' + path + '" ' + method);
  }
}

//matches on path + method
//returns a single route object
Router.prototype._matchPathAndMethod = function(path, method){

  matchedRoute = _.find(this.routes, function matchRoute(route){
    return route.method === method && route.route.match(path);
  });

  return matchedRoute;
}

//matches on path
//returns an array of all paths
Router.prototype._matchPath = function(path){

  matchedRoutes = _.filter(this.routes, function matchRoute(route){
    return route.route.match(path);
  });

  return matchedRoutes;
}

//helper for returning an error
Router.prototype._returnError = function(id, code, message, done){
  var headers = {statusCode: code};
  var body = new routerProtos.Error({
    id: id,
    code: code,
    message: message
  });
  done(headers, body);
}

//helper for returning an options reqeust
Router.prototype._returnOptions = function(path, done){
  var matchedRoutes = this._matchPath(path)

  var headers = {statusCode: 200};
  var body = {
      allowedRoutes: _.map(matchedRoutes, function(route){return{method: route.method, path: route.path, input: 'not in yet!', output: 'not in yet!'}})
  };

  done(headers, body);
}

//helper to return a 404 or a 405
Router.prototype._noMatch = function(path, done){
  var matchedRoutes = this._matchPath(path)
  if(matchedRoutes.length != 0){
    var allowedRoutes = _.map(matchedRoutes, function(route){return{method: route.method, path: route.path}});
    return this._returnError("SuperRouter 405", 405, JSON.stringify(allowedRoutes), done);
  }
  else{
    return this._returnError("SuperRouter 404", 404, '404 - Route not found.', done)
  }
}


Router.prototype.route = function route(path, method, headers, input, done) {
  //TODO - error checking on all inputs
  input = input || {};
  input = _.cloneDeep(input);
  method = method.toLowerCase();

  //if this is an options request, exit here and send route info to the client
  if(method === this.METHODS.OPTIONS){ return this._returnOptions(path, done); }

  //get our matched route
  matchedRoute = this._matchPathAndMethod(path, method)

  //if we didn't get a match, we need to send down a 405 or a 404
  if(_.isUndefined(matchedRoute)) { return this._noMatch(path, done); }

  //move params from the uri into the input
  var paramsFromURI = matchedRoute.route.match(path);
  _.forEach(paramsFromURI, function(value, key){
    input[key] = value;
  });

  //verify that input matches proto
  if(matchedRoute.inputProto != null){
    try{
      input = new matchedRoute.inputProto(input);
    }
    catch(err){
      return this._returnError("SuperRouter 400", 400, err.toString(), done);
    }
  }

  //Here is where we break out of SuperRouter to call the handler defined by the app
  matchedRoute.handler(headers, input, function(responseHeader, responseBody){
    //verify that output matches proto
    if(matchedRoute.outputProto != null){
      try{
        protofiedOutput = new matchedRoute.outputProto(JSON.stringify(responseBody));
      }
      catch(err){
        //TODO - put something here to alert the developer that this is something they should fix
        throw new Error("Bad output.");
      }
    }
    //if we got here, then the output looks good
    //this is the exit point of SuperRouter
    done(responseHeader, responseBody);
  });


  /*
  - Match route by path regex - done
  - If an unmatched route, return 404 - done
  - If an options request, we need to structure the options response
    - Supported methods
    - Expected input / output formats
    - Child resource urlis
  - If an unsupported method, return 405 (method not supported) - done
  - Process input (deserialize depending on content-type header) - ?
  - Extend input with uri params - done
  - Validate input
    - If invalid, return 400



   */

   /*TODO:
   - helpers needed to turn protos into human readable things (for sending down tot he client in stuff like options requests)
   - write tests
   - talk to erin about the id thing
   -



   */


}


module.exports = Router
