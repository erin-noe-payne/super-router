var Router = require('super-router'),
  router = new Router();

var userInput = {
  userId : String
}

var userOutput = {
  name : String,
  age : Number
}

router.addRoute('/users/:userId', router.METHODS.GET, userInput, userOutput, function(headers, input, done){

});

dealer.on('message', function(frames){
  var uri = frames[0],
    headers = JSON.parse(frames[1]),
    body = frames[2],
    method = headers.method;

  router.route(uri, headers, body, function(headers, body){
    dealer.send([headers, body])
  })
});


server = express()

server.all('*', function(req, res, next){
  var uri = req.path,
    headers = req.headers,
    body = req.body;

  router.route(uri, headers, body, function(headers, body) {
    res.headers = headers;
    res.send(body);
  });
});

socket.on('message', function(message) {
  var frames = message.split('|'),
    uri = frames[0],
    headers = JSON.parse(frames[1]),
    body = frames[2];

  router.route(uri, headers, body, function(headers, body){
    socket.send(headers+'|'+body);
  });
});