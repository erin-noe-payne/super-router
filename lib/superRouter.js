'use strict';

const _ = require('lodash');
const Route = require('route-parser');
const ProtoBuf = require('protobufjs');
const fs = require('fs');
const Logger = require('lr-logger');
const RouteTree = require('./RouteTree.js');
const SuperRouterStream = require('./superRouterStream.js');
const TransportHelpers = require('./transportHelpers.js');
const through2 = require('through2');
const uuid = require('uuid');
const Q = require('q');

Q.longStackSupport = true;

const logger = new Logger('SuperRouter');

function Router(_options) {
  const self = this;

  self.routes = []; // the routes of this router are stored here
  self.routeTree = new RouteTree();

  // configure options with defaults
  self.options = _.defaults(_options || {}, { debugMode: false });

  // set up protobuffers
  self.protoBuilders = {};
  if (!_.isUndefined(self.options.protosLocation)) {
    _getProtoBuilders(self.options.protosLocation, function (builders) {
      self.protoBuilders = builders;
    });
  }
}

// expose the superRouterStream
Router.Stream = SuperRouterStream;

// expose transport HttpHelpers
Router.TransportHelpers = TransportHelpers;

// expose the methods
Router.prototype.METHODS = {
  GET      : 'get',
  PUT      : 'put',
  POST     : 'post',
  DELETE   : 'delete',
  HEAD     : 'head',
  OPTIONS  : 'options',
  SUBSCRIBE: 'subscribe',
  ALL      : '*'
};

Router.prototype.addRoute = function addRoute(_route) {
  let route = _.cloneDeep(_route);

  if (_.isUndefined(route)) {
    throw new Error('route must be defined');
  }

  if (!_.isString(route.path)) {
    throw new Error('route.path must be a string');
  }

  if (_.isUndefined(route.method)) {
    throw new Error('route.method must be defined');
  }

  if (!(_.isString(route.method) && _.contains(this.METHODS, route.method.toLowerCase()))) {
    throw new Error('route.method must be defined in the METHODS enum');
  }

  if (_.isUndefined(route.handler)) {
    throw new Error('route.handler must be defined');
  }

  if (!_.isFunction(route.handler)) {
    throw new Error('route.handler must be a function');
  }

  if ((!_.isUndefined(route.inputProto) || !_.isUndefined(route.outputProto)) && _.isUndefined(this.options.protosLocation)) {
    throw new Error('You must set protosLocation on the router instance before before creating routes with proto validation.');
  }

  // make sure this route doesn't collide with an existing path+method
  const existingPath = _.find(this.routes, function (o) {
    return route.path === o.path && route.method === o.method;
  });

  if (!_.isUndefined(existingPath)) {
    throw new Error(`Duplicate path and method registered: "${route.path}" ${route.method}`);
  }

  const defaults = {
    debugMode: false,
    inputProto: null,
    outputProto: null
  };
  route = _.defaults(route, defaults);
  route.method = route.method.toLowerCase();
  route.route = new Route(route.path);
  if (route.path.indexOf('(') < 0) { // we won't be dealing with optional path parts in the route tree for now
    this.routeTree.addPath(route.path);
  }
  this.routes.push(route);
  if (this.options.debugMode || route.debugMode) {
    logger.debug('Route added:\n', _.pick(route, 'path', 'method', 'inputProto', 'outputProto'));
  }
};

Router.prototype.route = function (path, method, headers, inputStream, done) {
  const self = this;
  // check inputs
  if (_.isUndefined(path) || !_.isString(path)) {
    throw new Error('First argument: path must be defined and be a string.');
  }
  if (_.isUndefined(method) || !_.isString(method)) {
    throw new Error('Second argument: method must be defined and be a string.');
  }
  if (_.isUndefined(headers) || !_.isPlainObject(headers)) {
    throw new Error('Third argument: headers must be defined and be a plain object.');
  }

  if (!_.isFunction(done)) {
    throw new Error('Fifth argument: done must be a function.');
  }

  // keep using the same trackingGUID or create a new one
  headers.trackingGUID = headers.trackingGUID || uuid.v1();
  method = method.toLowerCase(); // always match on lowercase

  // if this is an options request, exit here and send route info to the client
  if (method === self.METHODS.OPTIONS) {
    return self._returnOptions(path, done);
  }

  // get our matched route
  const matchedRoute = self._matchPathAndMethod(path, method);

  // if we didn't get a match, we need to send down a 405 or a 404
  if (_.isUndefined(matchedRoute)) {
    return self._noMatch(path, done);
  }

  // set up our request stream
  let requestStream;
  if (inputStream instanceof SuperRouterStream) {
    // if we already have a superRouterStream then just pass it on
    requestStream = inputStream;
  }
  else { // we have to start a new stream
    requestStream = new SuperRouterStream();
    requestStream.routeInfo.originPath = path;
  }
  requestStream.setHeaders(headers);
  requestStream.method = method;
  requestStream.routeInfo =  _.assign(requestStream.routeInfo, _.pick(matchedRoute.route.match(path), function (value, key) {
    return _.startsWith(key, '_');
  }));
  requestStream.routeInfo.path = path;

  if (!_doWeNeedToBufferRequest(headers)) { // check against headers to see if we need to buffer
    setImmediate(function () { // stop this from being synchronous
      inputStream.pipe(requestStream);
      self._sendToHandler(requestStream, new SuperRouterStream(), matchedRoute, done);
    });
  }
  else {
    self._bufferStream(inputStream, requestStream, path, matchedRoute) // buffer our reuqestStream (add input property)
    .then(function () { // validate input
      const deferred = Q.defer();
      if (_.isUndefined(matchedRoute.validateInput)) {
        return deferred.resolve();
      }
      matchedRoute.validateInput(requestStream.input, deferred);
      return deferred.promise;
    })
    .then(function () {
      self._sendToHandler(requestStream, new SuperRouterStream(), matchedRoute, done);
    })
    .catch(function (errorMessage) {
      return self._returnError('SuperRouter 400', 400, errorMessage.toString(), done);
    });
  }
};

// matches on path + method
// returns a single route object
Router.prototype._matchPathAndMethod = function (path, method) {
  const self = this;
  const matchedRoute = _.find(self.routes, function matchRoute(route) {
    return (route.method === method || route.method === self.METHODS.ALL) && route.route.match(path);
  });

  return matchedRoute;
};

// matches on path
// returns an array of all paths
Router.prototype._matchPath = function (path) {
  const self = this;
  const matchedRoutes = _.filter(self.routes, function matchRoute(route) {
    return route.route.match(path) && route.method !== self.METHODS.ALL;
  });

  return matchedRoutes;
};

// Returns child routes for a given path
Router.prototype._childRoutes = function (path) {
  const node = this.routeTree.findPath(path);
  return _(node.children).map(child => this._matchPath(child.path)).flatten().value();
};

// helper for returning an error
Router.prototype._returnError = function (id, code, message, done) {
  const responseStream = new SuperRouterStream();
  responseStream.error(id, code, message);

  done(responseStream);
};

// helper for returning an options reqeust
Router.prototype._returnOptions = function (path, done) {
  const responseStream = new SuperRouterStream();
  const self = this;
  const matchedPath = this.routeTree.findPath(path);

  if (!matchedPath) {
    return this._noMatch(path, done);
  }

  const matchedRoutes = self._matchPath(path);
  const childRoutes = self._childRoutes(path);

  function prettyRoute(route) {
    return {
      method: route.method,
      path: route.path,
      input: self._prettyProtoMessage(route.inputProto),
      output: self._prettyProtoMessage(route.outputProto)
    };
  }

  const body = {
    routes : _.map(matchedRoutes, prettyRoute),
    child_routes: _.map(childRoutes, prettyRoute),
  };

  responseStream.send(body);
  done(responseStream);
};

// helper to return a 404 or a 405
Router.prototype._noMatch = function (path, done) {
  const matchedRoutes = this._matchPath(path);
  if (matchedRoutes.length !== 0) {
    const allowedRoutes = _.map(matchedRoutes, function (route) {
      return { method: route.method, path: route.path };
    });
    return this._returnError('SuperRouter 405', 405, JSON.stringify(allowedRoutes), done);
  }
  else {
    return this._returnError('SuperRouter 404', 404, '404 - Route not found.', done);
  }
};

Router.prototype._bufferStream = function (inputStream, requestStream, path, matchedRoute) {
  let buffer = '';
  let body = {};
  return Q.Promise(function (resolve, reject) {
    if (requestStream.buffered) { // we've already buffered!
      setImmediate(function () {
        // merge input from querystring in URI and return 400 if there's a missmatch
        const input = _mergeInputs(matchedRoute.route.match(path), requestStream.input);
        if (_.isError(input)) {
          reject(input + '');
        }
        requestStream.input = input;
        resolve(requestStream);
      });
    }
    else { // time to buffer
      inputStream.on('data', function (chunk) {
        buffer += chunk.toString();
      });
      inputStream.on('end', function () {
        if (buffer !== '') {
          if (false) { // TODO: check to see if we need to deserialize with protofile
            // TODO: deserialize with proto
          }
          else {
            try {
              body = JSON.parse(buffer);
            }
            catch (err) {
              reject('Unable to deserialize input.  Are you sure you are sending valid JSON?');
            }
          }
        }

        // merge input from querystring in URI and return 400 if there's a missmatch
        const input = _mergeInputs(matchedRoute.route.match(path), body);
        if (_.isError(input)) {
          reject(input + '');
        }

        requestStream.input = input;
        requestStream.buffered = true;
        resolve(requestStream);

      });
    }
  });
};

Router.prototype._sendToHandler = function (requestStream, responseStream, matchedRoute, done) {
  const self = this;

  if (self.options.debugMode || matchedRoute.debugMode) {
    logger.debug('Request:\n', { path: matchedRoute.path, method: matchedRoute.method, trackingGUID: requestStream.getHeaders().trackingGUID, inputProto: matchedRoute.inputProto, input: requestStream.input });
  }

  // call into the handler (breaking out of the super router)
  matchedRoute.handler(requestStream, responseStream);

  // check to see if we need to validate output
  if (!_.isUndefined(matchedRoute.validateOutput)) {
    // since this is a stream, we'll pipe it through a transform to validate against the proto
    responseStream.pipe(through2.obj(function (chunk) {
      if (!_isError(chunk)) { // only run validation if this isn't an errorMessage TODO: need better detection
        const deferred = Q.defer();
        matchedRoute.validateOutput(chunk, deferred);
        deferred.promise.then(function () {
        })
        .catch(function (errorMessage) {
          // Try to let the developer know that the output here doesn't match the proto
          logger.error('Output does not meet validation rules of route:\n', _.pick(matchedRoute, 'path', 'method'), '\noutput:\n', chunk, '\nvalidationMessage:\n', errorMessage);
          throw new Error('Output does not meet validation rules of route.');
        })
        .done();

      }
    }));
  }

  if (self.options.debugMode || matchedRoute.debugMode) {
    responseStream.pipe(through2.obj(function (chunk, enc, done) {
      logger.debug('Response:\n', { path: matchedRoute.path, method: matchedRoute.method, trackingGUID: requestStream.getHeaders().trackingGUID, outputProto: matchedRoute.outputProto, output: chunk });
      this.push(chunk);
      done();
    }));
  }

  // now that we've called into the handler, we can go to the transport callback
  done(responseStream);
};

// helper to see if this is a router error message (matches the Error proto)
function _isError(obj) {
  return !_.isUndefined(obj.id) && !_.isUndefined(obj.code) && !_.isUndefined(obj.message);
}

//helper to check against headers to figure out if we need to buffer or stream request to handler
function _doWeNeedToBufferRequest(headers) {
  const contentType = headers['content-type'];
  if (_.isUndefined(contentType)) {
    return true; // no content type, we'll default to JSON buffering
  }
  if (contentType.indexOf('multipart') > -1) {
    return false; // don't buffer this content type - stream it in.
  }

  return true; // default to buffer
}

// return a merge of the two inputs, or return an error if there are conflicing values on the same key
function _mergeInputs(inputFromURI, inputFromBody) {
  // move params from the uri into the input
  let errorDueToConflictingValues;
  _.forEach(inputFromURI, function (value, key) {
    if (!_.startsWith(key, '_')) { // skip anything that starts with an _
      if (!_.isUndefined(inputFromBody[key]) && !_.isEqual(inputFromBody[key], value)) {
        errorDueToConflictingValues = `value of ${key} differs in URI and body`;
      }
      inputFromBody[key] = value;
    }
  });
  if (errorDueToConflictingValues) {
    return new Error(errorDueToConflictingValues);
  }
  return inputFromBody;
}

// takes a protomessage or the location of one and returns a pretty json object
Router.prototype._prettyProtoMessage = function (protoMessage) {
  if (!protoMessage) {
    return null;
  }
  if (_.isString(protoMessage)) {
    protoMessage = this._getProtoMessage(protoMessage).$type;
  }

  const ret = {
    message_name: protoMessage.name,
    fields: []
  };

  _.each(protoMessage.children, function (field) {
    field.className === 'Message.Field' ? ret.fields.push(_prettyProtoField(field)) : ret.fields.push(self._prettyProtoMessage(field));
  });

  return ret;
};

function _prettyProtoField(protoField) {
  return {
    name: protoField.name,
    type: protoField.type.name
  };
}

function _endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function _getProtoBuilders(protosLocation, cb) {
  const builders = {};
  fs.readdir(protosLocation, function (err, files) {
    if (err) throw err;
    _.filter(files, function (file) {
      return _endsWith(file, '.proto');
    }).forEach(function (file) {
      const pathToFile = protosLocation + file;
      const packageName = file.substring(0, file.lastIndexOf('.'));
      const builder = ProtoBuf.loadProtoFile(pathToFile);
      builders[packageName] = builder;
    });
    cb(builders);
  });
}

// helper to get the proto from the protolocation specified.
// TODO - don't really know enough about how protos will look in the real world to do this well right now
Router.prototype._getProtoMessage = function (protoLocation) {
  const split = protoLocation.split('.');
  const builder = this.protoBuilders[split[0]];
  const protoPackage = builder.build(split[0]);

  let message = protoPackage[split[1]];
  for (let i = 2; i < split.length; i++) {
    message = message[split[i]];
  }
  return message;
};

module.exports = Router;
