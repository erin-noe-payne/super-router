var http = require('http'),
    SuperRouter = require('./superRouter.js'),
    _ = require('lodash');

var PORT = 8092;
var superRouter = new SuperRouter();

// -- REGISTER ROUTES --
superRouter.addRoute('/forceError', superRouter.METHODS.GET, null, null, function(headers, input, done){
  var headers = {statusCode: 500};
  var body = new superRouter.protos.Error({
    id: "123",
    code: 500,
    message: "This is the first error"
  });
  done(headers, body);
});

// -- TRANSPORTS --
//http transport
var server = http.createServer(function(req, res){
  var postBody = "";
  req.on('data', function(chunk){
    postBody += chunk.toString();
  });

  req.on('end', function(){
    var uri = req.url,
        method = req.method,
        headers = req.headers,
        body = {};

    if(postBody != ""){
      body = JSON.parse(postBody);
    }

    superRouter.route(uri, method, headers, body, function(resHeaders, resBody) {
      //set the http response code to our statusCode
      res.statusCode = resHeaders.statusCode;

      //copy all header values into the header of the http response
      _.forEach(resHeaders, function(value, key){
        res.setHeader(key, value);
      });

      //send the body
      res.end(JSON.stringify(resBody));
    });
  });
});

server.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});
