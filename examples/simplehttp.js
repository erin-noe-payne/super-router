'use strict';

const http        = require('http');
const SuperRouter = require('./..');
const Q           = require('q');
const _           = require('lodash');

const app = new SuperRouter.App();

// Middleware to buffer request body.
app.use((opts) => {
  const request  = opts.request;
  const deferred = Q.defer();

  let buffer = '';
  request.body.on('data', (chunk) => {
    buffer += chunk;
  });
  request.body.on('end', () => {
    request.bufferedBody = buffer;
    deferred.resolve();
  });

  return deferred.promise;
});

// Middleware to set request body.
app.use((opts) => {
  const response = opts.response;
  const request  = opts.request;

  response.setBody({
    path    : request.path,
    message : request.bufferedBody
  });
});

// Middleware to set content type and stringify response body.
app.use((opts) => {
  const response = opts.response;

  response.setHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify(response.getBody()));
})

// Setup a transport binding to http server
const server = http.createServer((req, res) => {
  const request = ({
    path    : req.url,
    method  : req.method,
    headers : req.headers,
    body    : req
  });

  app.processRequest(request).then((response) => {
    res.statusCode = response.statusCode;
    _.each(response.headers, (value, key) => {
      res.setHeader(key, value);
    });
    response.body.pipe(res);
  }).catch((err) => {
    res.statusCode = 500;
    res.end(err.stack);
  }).done();
});

server.listen(3000);
console.log('listening on port 3000');
