var http = require('http'),
    SuperRouter = require('../lib/superRouter.js'),
    _ = require('lodash'),
    ProtoBuf = require("protobufjs"),
    path = require('path'),
    through2 = require('through2'),
    util = require('util');

var PORT = 8091;
var pathToProtos = __dirname + '/'
var caseRouterV1 = new SuperRouter(pathToProtos);
var caseRouterV2 = new SuperRouter(pathToProtos);

// -- REGISTER ROUTES --
caseRouterV1.addRoute('/case/:id', caseRouterV1.METHODS.GET, 'Case.GetReq', 'Case.GetRes', function(requestStream, responseStream){

  //we could use input.id to go to a db or something, but we'll just return here.
  var resHeaders = {statusCode: 200};
  var resBody = {
    title: 'case #' + requestStream.input.id,
    description: 'This is a description.',
    date_created: Date().toString(),
    date_updated: Date().toString()
  };
  responseStream.send(resHeaders, resBody);

});

caseRouterV1.addRoute('/case', caseRouterV1.METHODS.POST, 'Case.CreateReq', 'Case.CreateRes', function(headers, input, responseStream){

  body = input;
  body.date_created = Date().toString();
  body.date_updated = Date().toString();


  responseStream.headers = {statusCode: 200};
  responseStream.end(body);

});

caseRouterV2.addRoute('/onlyOnVersion2', caseRouterV2.METHODS.GET, null, null, function(headers, input, responseStream){
  responseStream.headers = {statusCode: 200};
  responseStream.end({message: 'you found me!'});
});

//make a request to another service that impliments super router that we know will fail
caseRouterV1.addRoute('/forceError', caseRouterV1.METHODS.GET, null, null, function(headers, input, responseStream){

  var options = {
    host: 'localhost',
    port: 8092,
    path: '/forceErrorz',
    method: 'GET'
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {

      responseStream.headers = {statusCode: 500};
      var body = new caseRouterV1.protos.Error({
        id: "456",
        code: 500,
        message: "This is the second error",
        prev_error: JSON.parse(chunk)
      });
      responseStream.end(body);

    });
  });

  req.end();

});


caseRouterV1.addRoute('/', caseRouterV1.METHODS.GET, null, null, function(requestStream, responseStream){
  responseStream.headers = {statusCode: 200};
  responseStream.end({message: 'Hello World.'});
});

// -- TRANSPORTS --
//http transport
var server = http.createServer(function(req, res){

  caseRouterV1.route(req.url, req.method, req.headers, req, _sendToClient(res));

  //get body data
  // var postBody = "";
  // req.on('data', function(chunk){
  //   postBody += chunk.toString();
  // });
  //
  // //we're holding the whole request in memory now, so send it to the superrouter route
  // req.on('end', function(){
  //   var uri = req.url,
  //       method = req.method,
  //       headers = req.headers,
  //       body = {};
  //
  //   if(postBody != ""){
  //     body = JSON.parse(postBody);
  //   }
  //
  //   //branch on api verion being used
  //   if(!_.isUndefined(headers.version) && headers.version == "2"){
  //     caseRouterV2.route(uri, method, headers, body, _sendToClient(res));
  //   }
  //   else {
  //     caseRouterV1.route(uri, method, headers, body, _sendToClient(res));
  //   }

  // });
});

server.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});


function _sendToClient(res) {
  return function(superRouterResponseStream){
    //set the http response code to our statusCode
    var resHeaders = superRouterResponseStream.headers;
    if(resHeaders.statusCode){
      res.statusCode = resHeaders.statusCode;
    }
    res.setHeader("Content-Type", "application/json");

    //copy all header values into the header of the http response
    _.forEach(resHeaders, function(value, key){
      res.setHeader(key, value);
    });
    superRouterResponseStream.pipe(_transformToString()).pipe(res);
  };
};

//This is a small transform used to push json to the client over http
function _transformToString(){
  return through2.obj(function(chunk, enc, done){
    console.log("chunk");
    console.log(chunk);
    this.push(JSON.stringify(chunk));
    done();
  });
}


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
