var _ = require('lodash'),
        Route = require('route-parser'),
        ProtoBuf = require("protobufjs"),
        path = require('path')
        fs = require('fs'),
        Logger = require('lr-logger'),
        SuperRouterStream = require('./superRouterStream.js'),
        through2 = require('through2'),
        uuid = require('uuid');

var logger = new Logger('SuperRouter');

function Router(protosLocation) {
  this.routes = [];
  this.protosLocation = protosLocation;
  this.protoBuilders = {};
  if(!_.isUndefined(protosLocation)){
    this.protoBuilders = _getProtoBuilders(protosLocation);
  }
}

//expose the superRouterStream
Router.Stream = SuperRouterStream;

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
    method: method.toLowerCase(),
    inputProto: inputProto,
    outputProto: outputProto,
    handler: handler
  };
  this.routes.push(newRoute);
  logger.debug('Route added:\n', _.pick(newRoute, 'path', 'method', 'inputProto', 'outputProto'));
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
  var responseStream = new SuperRouterStream();
  responseStream.headers = {statusCode: code};
  var body = new routerProtos.Error({
    id: id,
    code: code,
    message: message
  });
  responseStream.end(body);
  done(responseStream);
}

//helper for returning an options reqeust
Router.prototype._returnOptions = function(path, done){
  var responseStream = new SuperRouterStream();
  var self = this;
  var matchedRoutes = self._matchPath(path)

  if(matchedRoutes.length == 0){ return this._noMatch(path, done); }

  responseStream.headers = {statusCode: 200};
  var body = {
      allowedRoutes: _.map(matchedRoutes, function(route){return{method: route.method, path: route.path, input: self._prettyProtoMessage(route.inputProto), output: self._prettyProtoMessage(route.outputProto)}})
  };

  responseStream.end(body);
  done(responseStream);
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

Router.prototype.route = function route(path, method, headers, inputStream, done) {
  var self = this;
  headers.trackingGUID = headers.trackingGUID || uuid.v1();
  //TODO - error checking on all inputs
  method = method.toLowerCase();

  //if this is an options request, exit here and send route info to the client
  if(method === self.METHODS.OPTIONS){ return self._returnOptions(path, done); }

  //get our matched route
  var matchedRoute = self._matchPathAndMethod(path, method)

  //if we didn't get a match, we need to send down a 405 or a 404
  if(_.isUndefined(matchedRoute)) { return self._noMatch(path, done); }
  // logger.debug('Request:\n', {path: matchedRoute.path, method: matchedRoute.method, trackingGUID: headers.trackingGUID, inputProto: matchedRoute.inputProto, input: input});

  var requestStream = new SuperRouterStream();
  requestStream.headers = headers;
  var responseStream = new SuperRouterStream();

  if(_doWeNeedToBufferRequest(headers)){//check to see if we need to buffer
    var buffer = '';
    inputStream.on('data', function (chunk) {
      buffer += chunk.toString();
    });
    inputStream.on('end', function (){
      var body = {};
      if(buffer != ''){
        if(false){//TODO: check to see if we need to deserialize with protofile
          //TODO: deserialize with proto
        }
        else {
          try{
            body = JSON.parse(buffer);
          }catch(err){
            return self._returnError("SuperRouter 400", 400, 'Unable to deserialize input.  Are you sure you are sending valid JSON?', done);
          }
        }
      }

      //merge input from querystring in URI and return 400 if there's a missmatch
      var input = _mergeInputs(body, matchedRoute.route.match(path));
      if(_.isError(input)){
        return self._returnError("SuperRouter 400", 400, '400 - ' + input, done);
      }

      //verify that input matches proto
      if(matchedRoute.inputProto != null){
        var protoMessage = self._getProtoMessage(matchedRoute.inputProto);
        try{
          var requestMessage = new protoMessage(input);
          requestMessage.encode();
        }
        catch(err){
          return self._returnError("SuperRouter 400", 400, err.toString(), done);
        }
      }
      requestStream.input = input;
      matchedRoute.handler(requestStream, responseStream);
    });
  } else { //we are not buffering
    inputStream.pipe(requestStream);
    matchedRoute.handler(requestStream, responseStream);
  }

   //verify that output matches proto
 if(matchedRoute.outputProto != null){
  //since this is a stream, we'll pipe it through a transform to validate against the proto
  responseStream.pipe(through2.obj(function(chunk, enc, callback){
    var protoMessage = self._getProtoMessage(matchedRoute.outputProto);
        try{
          var responseMessage = new protoMessage(chunk);
          responseMessage.encode();
        }
        catch(err){
          //Try to let the developer know that the output here doesn't match the proto
          var errorMessage = "Outout of handler does not match proto: proto = " + JSON.stringify(self._prettyProtoMessage(protoMessage.$type), null, 2) + ", output = " + JSON.stringify(chunk, null, 2);
          logger.error(errorMessage);
          throw new Error(errorMessage);
        }
    }));
  }

  // responseStream.pipe(through2.obj(function(chunk, enc, done){
  //   logger.debug('Response:\n', {path: matchedRoute.path, method: matchedRoute.method, trackingGUID: headers.trackingGUID, outputProto: matchedRoute.outputProto, output: chunk});
  //   this.push(chunk);
  //   done();
  // }));
  done(responseStream);
}

//helper to check against headers to figure out if we need to buffer or stream request to handler
function _doWeNeedToBufferRequest(headers) {
  var contentType = headers['content-type'];
  if (_.isUndefined(contentType)){
    return true; //no content type, we'll default to JSON buffering
  }
  if(contentType === 'multipart/form-data'){
    return false; //don't buffer this content type - stream it in.
  }

  return true; //default to buffer
}

//return a merge of the two inputs, or return an error if there are conflicing values on the same key
function _mergeInputs(inputFromURI, inputFromBody) {
  //move params from the uri into the input
  var errorDueToConflictingValues;
  _.forEach(inputFromURI, function(value, key){
    if(!_.isUndefined(inputFromBody[key]) && !_.isEqual(inputFromBody[key], value)){
      errorDueToConflictingValues = 'value of ' + key + ' differs in URI and body';
    }
    inputFromBody[key] = value;
  });
  if(errorDueToConflictingValues){return new Error(errorDueToConflictingValues)}
  return inputFromBody;
}

//takes a protomessage or the location of one and returns a pretty json object
Router.prototype._prettyProtoMessage = function(protoMessage){
  if(!protoMessage){
    return null;
  }
  if(_.isString(protoMessage)){
    protoMessage = this._getProtoMessage(protoMessage).$type;
  }

  var ret = {
    message_name: protoMessage.name,
    fields: []
  };

  _.each(protoMessage.children, function(field){
    field.className == "Message.Field" ? ret.fields.push(_prettyProtoField(field)) : ret.fields.push(self._prettyProtoMessage(field));
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
Router.prototype._getProtoMessage = function(protoLocation){
  var split = protoLocation.split('.');
  var builder = this.protoBuilders[split[0]];
  var protoPackage = builder.build(split[0]);

  var message = protoPackage[split[1]];
  for(var i=2;i<split.length;i++){
    message = message[split[i]];
  }
  return message;
}

module.exports = Router
