'use strict';

const http        = require('http');
const SuperRouter = require('./..');

const app      = new SuperRouter.App();
const router   = new SuperRouter.Router();
const _        = require('lodash');
const through2 = require('through2');
const fs       = require('fs');
const path     = require('path');
const Q        = require('q');

/*
 Router
 */

router.addRoute({
  path    : '/cases',
  method  : 'get',
  handler : () => {

  }
});

router.addRoute({
  path    : '/a/b/c',
  method  : 'get',
  handler : () => {

  }
});


router.addRoute({
  path    : '/a/b',
  method  : 'get',
  handler : () => {

  }
});

app.use(router.match);
app.use(router.execute);
app.use((opts) => {
  const request  = opts.request;
  const response = opts.response;

  return response.pipe(through2.obj(function (chunk, enc, callback) {
    this.push(JSON.stringify(chunk));
    callback();
  }));
})

/*
 Object stream
 */
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    Q().timeout(500).then(() => {
//      console.log('write');
//      return response.write({ a : 1 });
//    }).timeout(500).then(() => {
//      console.log('write');
//      return response.write({ b : 2 });
//    }).timeout(500).then(() => {
//      console.log('end');
//      return response.end({ c : 3 });
//    });
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    return response.pipe(through2.obj(function (chunk, enc, callback) {
//      this.push(_.map(chunk, (v, k) => {
//        return `${v}${k}`;
//      }));
//      callback();
//    }));
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    return response.pipe(through2.obj(function (chunk, enc, callback) {
//      this.push(JSON.stringify(chunk));
//      callback();
//    }));
//  }
//});

/*
 Text string
 */
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    return fs.createReadStream(path.resolve(__dirname, 'test.txt'));
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    return response.pipe(through2(function (chunk, enc, callback) {
//      this.push(chunk.toString().toUpperCase());
//      callback();
//    }));
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    return response.pipe(through2(function (chunk, enc, callback) {
//      this.push(` + ${chunk.toString()}`);
//      callback();
//    }));
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
console.log('listening');
