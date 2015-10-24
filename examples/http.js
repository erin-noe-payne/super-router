'use strict';

const http        = require('http');
const SuperRouter = require('./..');

const app      = new SuperRouter.App();
const router   = new SuperRouter.Router();
const _        = require('lodash');
const through2 = require('through2');
const fs       = require('fs');
const path     = require('path')



app.use({
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    //fs.createReadStream(path.resolve(__dirname, 'test.txt')).pipe(response);
    return fs.createReadStream(path.resolve(__dirname, 'test.txt'));
  }
});

app.use({
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    return response.pipe(through2(function (chunk, enc, callback) {
      this.push(chunk.toString().toUpperCase());
      callback();
    }));
  }
});

app.use({
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    return response.pipe(through2(function (chunk, enc, callback) {
      this.push(`and then ${chunk.toString()}`);
      callback();
    }));
  }
});

//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    response.write('hi');
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    response.end();
//  }
//});


const server = http.createServer((req, res) => {
  const request = new SuperRouter.Request({
    path    : req.url,
    method  : req.method,
    headers : req.headers
  });

  req.pipe(request);

  app.processRequest(request).then((response) => {
    res.statusCode = response.statusCode;
    _.each(response.headers, (value, key) => {
      res.setHeader(key, value);
    });
    response.pipe(res);
  }).catch((err) => {
    res.statusCode = 500;
    res.end(err.stack);
  }).done();
});

server.listen(3000);
console.log('lsiteneing')


