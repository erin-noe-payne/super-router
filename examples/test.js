var http = require('http'),
    SuperRouter = require('../lib/superRouter.js'),
    _ = require('lodash'),
    ProtoBuf = require("protobufjs"),
    path = require('path');

var PORT = 8091;
var pathToProtos = __dirname + '/'
var superRouter = new SuperRouter(pathToProtos);

// -- REGISTER ROUTES --
superRouter.addRoute('/case/:id', superRouter.METHODS.GET, 'Case.GetReq', 'Case.GetRes', function(headers, input, done){
  var resHeaders = {statusCode: 200};

  //we could use input.id to go to a db or something, but we'll just return here.
  var resBody = {
    title: 'case #' + input.id,
    description: 'This is a description.',
    date_created: Date().toString(),
    date_updated: Date().toString()
  };
  done(resHeaders, resBody);

});

superRouter.addRoute('/case', superRouter.METHODS.POST, 'Case.CreateReq', 'Case.CreateRes', function(headers, input, done){

  body = input;
  body.date_created = Date().toString();
  body.date_updated = Date().toString();


  var resHeaders = {statusCode: 200};
  var resBody = body;
  done(resHeaders, resBody);

});


//make a request to another service that impliments super router that we know will fail
superRouter.addRoute('/forceError', superRouter.METHODS.GET, null, null, function(headers, input, done){

  var options = {
    host: 'localhost',
    port: 8092,
    path: '/forceErrorz',
    method: 'GET'
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {

      var headers = {statusCode: 500};
      var body = new superRouter.protos.Error({
        id: "456",
        code: 500,
        message: "This is the second error",
        prev_error: JSON.parse(chunk)
      });
      done(headers, body);

    });
  });

  req.end();

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



// var Router = require('lib/super-router'),
//   router = new Router();
//
// var userInput = {
//   userId : String
// }
//
// var userOutput = {
//   name : String,
//   age : Number
// }
//
// router.addRoute('/users/:userId', router.METHODS.GET, userInput, userOutput, function(headers, input, done){
//
// });
//
// dealer.on('message', function(frames){
//   var uri = frames[0],
//     headers = JSON.parse(frames[1]),
//     body = frames[2],
//     method = headers.method;
//
//   router.route(uri, headers, body, function(headers, body){
//     dealer.send([headers, body])
//   })
// });
//
//
// server = express()
//
// server.all('*', function(req, res, next){
//   var uri = req.path,
//     headers = req.headers,
//     body = req.body;
//
//   router.route(uri, headers, body, function(headers, body) {
//     res.headers = headers;
//     res.send(body);
//   });
// });
//
// socket.on('message', function(message) {
//   var frames = message.split('|'),
//     uri = frames[0],
//     headers = JSON.parse(frames[1]),
//     body = frames[2];
//
//   router.route(uri, headers, body, function(headers, body){
//     socket.send(headers+'|'+body);
//   });
// });
