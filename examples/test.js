var http = require('http'),
    SuperRouter = require('../lib/superRouter.js'),
    _ = require('lodash'),
    ProtoBuf = require("protobufjs"),
    path = require('path');

var PORT = 8091;
var superRouter = new SuperRouter();


//load up protos
var pathToFile = path.resolve(__dirname, 'protos.proto')
var builder = ProtoBuf.loadProtoFile(pathToFile);
var caseProtos = builder.build("Case");

// -- REGISTER ROUTES --

//todo: protos for input and output on routes

superRouter.addRoute('/case/:id', superRouter.METHODS.GET, caseProtos.GetReq, caseProtos.GetRes, function(headers, input, done){


  var resHeaders = {statusCode: 200};
  var resBody = {
    title: 'case #' + input.id,
    description: 'This is a description.',
    date_created: Date().toString(),
    date_updated: Date().toString()
  };
  done(resHeaders, resBody);

});

superRouter.addRoute('/case', superRouter.METHODS.POST, caseProtos.CreateReq, caseProtos.CreateRes, function(headers, input, done){

  body = input;
  body.date_created = Date().toString();
  body.date_updated = Date().toString();



  var resHeaders = {statusCode: 200};
  var resBody = body;
  done(resHeaders, resBody);

});

superRouter.addRoute('/', superRouter.METHODS.GET, null, null, function(headers, input, done){

  var resHeaders = {statusCode: 200};
  var resBody = {message: "you hit the / route"};
  done(resHeaders, resBody);

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
