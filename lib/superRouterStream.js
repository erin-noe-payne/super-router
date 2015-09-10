var Transform = require('stream').Transform,
    util = require('util'),
    through2 = require('through2'),
    _ = require('lodash'),
    ProtoBuf = require("protobufjs"),
    path = require('path');

var pathToFile = path.resolve(__dirname, 'SuperRouter.proto')
var builder = ProtoBuf.loadProtoFile(pathToFile);
var Error = builder.build("SuperRouter").Error;

function SuperRouterStream(options){
  var self = this;
  if(_.isUndefined(options)){
    options = { objectMode: true };
  }
  if(!(self instanceof SuperRouterStream))
    return new SuperRouterStream();
  Transform.call(self, options);


  this._headers = {};
  this._headersLocked = false;

  self.on('readable', function () {
    this._headersLocked = true;
  });

}
util.inherits(SuperRouterStream, Transform);

SuperRouterStream.prototype._transform = function(chunk, encoding, done) {
  this.push(chunk);
  done();
}

SuperRouterStream.prototype.send = function(body, statusCode){
  if(_.isUndefined(statusCode)){
    statusCode = 200;
  }
  if(_.isUndefined(body)){
    throw new Error('First argument: body must be defined.')
  }

  this.setHeader('statusCode', statusCode)
  this.end(body);
}

SuperRouterStream.prototype.error = function(id, code, message, prev_error){
  var body = new Error({
    id: id,
    code: code,
    message: message,
    prev_error: prev_error
  });
  this.send(body, code);
}

SuperRouterStream.prototype.setHeader = function(key, value){
  if(this._headersLocked){
    throw new Error("Can't set headers once data is being written to the stream.");
  }
  this._headers[key] = value;

}

SuperRouterStream.prototype.setHeaders = function(headers) {
  var self = this;
  _.forEach(headers, function(value, key){
    self.setHeader(key, value);
  });
}

SuperRouterStream.prototype.getHeaders = function () {
  return _.cloneDeep(this._headers);
}



//This is called at the end of the stream, every time.  We might need this at some point.
// SuperRouterStream.prototype._flush = function(done){
//   console.log('flush!');
//   done();
// }


module.exports = SuperRouterStream
