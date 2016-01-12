'use strict';

const http        = require('http');
const SuperRouter = require('./..');
const Q           = require('q');
const _           = require('lodash');
const through2    = require('through2');

const app = new SuperRouter.App();

// Stream input to response body
app.then({
  handler : (opts) => {
    const response = opts.response;
    const deferred = Q.defer();

    http.get('http://www.gutenberg.org/cache/epub/2701/pg2701.txt', (res) => {
      response.setBody(res);
      deferred.resolve();
    });

    return deferred.promise;
  }
});

// Transform response body
app.then((opts) => {
  const response = opts.response;

  response.statusCode = 201;
  response.setBody(response.body.pipe(through2(function (chunk, enc, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  })));
});

app.then({
  handler : (opts) => {
    const response = opts.response;

    let i = 0;
    response.setBody(response.body.pipe(through2(function (chunk, enc, callback) {
      i++;
      this.push(`chunkNumber${i}: ${chunk.toString()}`);
      callback();
    })));
  }
});

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
