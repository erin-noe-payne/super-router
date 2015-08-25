var _ = require('lodash'),
        Route = require('route-parser'),
        ProtoBuf = require("protobufjs"),
        path = require('path')
        fs = require('fs'),
        Logger = require('lr-logger');

var logger = new Logger('SuperRouter');

var ROUTE_TEMPLATE = {
  path: '',
  pathKeys: [],
  pathRegex: null,
  method: null,
  inputProto: null,
  outputProto: null,
  handler: null
}

function Router(protosLocation) {
  this.routes = [];
  this.protosLocation = protosLocation;
  this.protoBuilders = {};
  this.return500OnError = true;
  if(!_.isUndefined(protosLocation)){
    this.protoBuilders = _getProtoBuilders(protosLocation);
  }
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

Router.prototype.protos = routerProtos;

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

  if((inputProto != null || outputProto != null) && _.isUndefined(this.protosLocation)){
    throw new Error("You must set protosLocation on the router instance before before creating routes with proto validation.")
  }

  //make sure this route doesn't collide with an existing path+method
  var existingPath = _.find(this.routes, function(route){
    return path === route.path && method === route.method
  });

  if(!_.isUndefined(existingPath)) {
    throw new Error('Duplicate path and method registered: "' + path + '" ' + method);
  }

  //add the route to the array of routes
  var newRoute = {
    path: path,
    route: new Route(path),
    method: method,
    inputProto: inputProto,
    outputProto: outputProto,
    handler: handler
  };
  this.routes.push(newRoute);
  logger.info('Route added:\n', _.pick(newRoute, 'path', 'method', 'inputProto', 'outputProto'));
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
  var self = this;
  var matchedRoutes = self._matchPath(path)

  if(matchedRoutes.length == 0){ return this._noMatch(path, done); }

  var headers = {statusCode: 200};
  var body = {
      allowedRoutes: _.map(matchedRoutes, function(route){return{method: route.method, path: route.path, input: _prettyProtoMessage(route.inputProto, self), output: _prettyProtoMessage(route.outputProto, self)}})
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
  var self = this;
  _.forEach(paramsFromURI, function(value, key){
    //if the value of a key that is both specified in the URI and the body differs, throw an error
    if(!_.isUndefined(input[key]) && !_.isEqual(input[key], value)){
      return self._returnError("SuperRouter 400", 400, '404 - value of ' + key + ' differs in URI and body', done);
    }
    input[key] = value;
  });

  //verify that input matches proto
  if(matchedRoute.inputProto != null){
    var protoMessage = _getProtoMessage(this, matchedRoute.inputProto);
    try{
      var requestMessage = new protoMessage(input);
      requestMessage.encode();
    }
    catch(err){
      return this._returnError("SuperRouter 400", 400, err.toString(), done);
    }
  }

  //Here is where we break out of SuperRouter to call the handler defined by the app
  var self = this;
  matchedRoute.handler(headers, input, function(responseHeader, responseBody){
    //verify that output matches proto
    if(matchedRoute.outputProto != null){
      var protoMessage = _getProtoMessage(self, matchedRoute.outputProto);
      try{
        var responseMessage = new protoMessage(responseBody);
        responseMessage.encode();
      }
      catch(err){
        //Try to let the developer know that the output here doesn't match the proto
        var errorMessage = "Outout of handler does not match proto: proto = " + JSON.stringify(_prettyProtoMessage(protoMessage.$type), null, 2) + ", output = " + JSON.stringify(responseBody, null, 2);
        console.log(errorMessage);
        throw new Error(errorMessage);
      }
    }
    //if we got here, then the output looks good
    //this is the exit point of SuperRouter
    done(responseHeader, responseBody);
  });
}

//takes a protomessage or the location of one and returns a pretty json object
function _prettyProtoMessage(protoMessage, router){
  if(!protoMessage){
    return null;
  }
  if(_.isString(protoMessage)){
    protoMessage = _getProtoMessage(router, protoMessage).$type;
  }

  var ret = {
    message_name: protoMessage.name,
    fields: []
  };

  _.each(protoMessage.children, function(field){
    field.className == "Message.Field" ? ret.fields.push(_prettyProtoField(field)) : ret.fields.push(_prettyProtoMessage(field));
  });

  return ret;
}

function _prettyProtoField(protoField){
    return {
      name: protoField.name,
      required: protoField.required,
      type: protoField.type.name
    };
}

function _endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function _getProtoBuilders(protosLocation){
  var builders = {}
  fs.readdir(protosLocation, function(err, files){
    if (err) throw err;
    _.filter(files, function(file){return _endsWith(file, '.proto')}).forEach(function(file){
      var pathToFile = protosLocation + file;
      var packageName = file.substring(0, file.lastIndexOf('.'));
      var builder = ProtoBuf.loadProtoFile(pathToFile);
      builders[packageName] = builder;
    });
  });
  return builders;
}

//helper to get the proto from the protolocation specified.
//TODO - don't really know enough about how protos will look in the real world to do this well right now
function _getProtoMessage(router, protoLocation){
  var split = protoLocation.split('.');
  // var pack = router.protos[split[0]];
  var builder = router.protoBuilders[split[0]];
  var protoPackage = builder.build(split[0]);

  var message = protoPackage[split[1]];
  for(var i=2;i<split.length;i++){
    message = message[split[i]];
  }
  return message;
}

module.exports = Router
