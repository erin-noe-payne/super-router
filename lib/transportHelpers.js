var through2 = require('through2'),
  _ = require('lodash');

var api = {};

api.setHttpResponsePipe = function(httpResponse){
  return function(superRouterResponseStream){
        var headersSet = false;

        superRouterResponseStream.pipe(through2.obj(function (chunk, enc, done) {
          if(!headersSet){
            headersSet = true;
            var resHeaders = superRouterResponseStream.getHeaders();
            if(resHeaders.statusCode){
              httpResponse.statusCode = resHeaders.statusCode;
            }

            //copy all header values into the header of the http response
            _.forEach(resHeaders, function(value, key){
              httpResponse.setHeader(key, value);
            });

            //default to json content-type
            if(!httpResponse.getHeader['content-type']){
              httpResponse.setHeader('content-type', 'application/json');
            }
          }

          this.push(chunk);
          done();
        })).pipe(_transformToString()).pipe(httpResponse);
      };
}

function _transformToString(){
    return through2.obj(function(chunk, enc, done){
      if(chunk instanceof Buffer){
        this.push(chunk);
      }
      else {
        this.push(JSON.stringify(chunk));
      }
      done();
    });
  }

module.exports = api;
