var Transform = require('stream').Transform,
util = require('util'),
through2 = require('through2');

function SuperRouterStream(){
  if(!(this instanceof SuperRouterStream))
    return new SuperRouterStream();
  Transform.call(this, { objectMode: true });
  this.headers = {};
}
util.inherits(SuperRouterStream, Transform);

SuperRouterStream.prototype._transform = function(chunk, encoding, done) {
  this.push(chunk);
  done()
}

SuperRouterStream.prototype.send = function(headers, body){
  this.headers = headers;
  this.end(body);
}


//This is called at the end of the stream, every time.  We might need this at some point.
// SuperRouterStream.prototype._flush = function(done){
//   console.log('flush!');
//   done();
// }


module.exports = SuperRouterStream
