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

function _lookupAndRedirectBy(identifierType) {
  return (opts) => {
    const request  = opts.request;
    const response = opts.response;

    const newId = request.routeParams.identifier * 2;

    request.path = `/cases/${newId}${request.routeParams._restOfRoute}`;
  };
};

app.use({
  path    : '/cases/caseId/:identifier(/*_restOfRoute)',
  handler : _lookupAndRedirectBy('CaseId')
});
app.use({
  path    : '/cases/caseNumber/:identifier(/*_restOfRoute)',
  handler : _lookupAndRedirectBy('CaseNumber')
});
app.use({
  path    : '/cases/externalId/:identifier(/*_restOfRoute)',
  handler : _lookupAndRedirectBy('ExternalId')
});

router.addRoute({
  path    : '/cases',
  method  : 'get',
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    console.log('route handler');
    response.setHeader('asdf', 'farts')
    response.end({ a : 1 });
  }
});

router.addRoute({
  path    : '/cases/:identifier',
  method  : 'get',
  handler : (opts) => {
  }
});

router.addRoute({
  path    : '/cases/:caseNumber/actions/performAction',
  method  : 'put',
  handler : () => {

  }
});

router.addRoute({
  path    : '/cases/:caseNumber/evidence',
  method  : 'post',
  handler : () => {

  }
});

app.use(router.match);
app.use(router.execute);
app.use((opts) => {
  const request = opts.request;
  let response  = opts.response;

  //response = new app.Response({
  //  statusCode : 500
  //});
  //response.end({error : 'uhoh'});
  //return response;
  //return new app.Response({
  //  statusCode : 500,
  //  body       : { error : 'uhoh' }
  //});
});

app.use((opts) => {
  // Content negotiation
  const request  = opts.request;
  const response = opts.response;

  console.log('transform')
  return response.pipe(through2.obj(function (chunk, enc, callback) {
    console.log(chunk);
    this.push(JSON.stringify(chunk));
    callback();
  }));
});

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
    response.pipe(res);
  }).catch((err) => {
    res.statusCode = 500;
    res.end(err.stack);
  }).done();
});

server.listen(3000);
console.log('listening');
