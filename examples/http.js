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
 Objects
 */

app.use((opts) => {
  const request  = opts.request;
  const response = opts.response;
  const onWire   = '{"a":1}';
  const deferred = Q.defer();

  setTimeout(() => {
    try {
      request.body = JSON.parse(onWire);
      deferred.resolve();
    }
    catch (err) {
      deferred.reject(err);
    }
  }, 200);

  return deferred.promise;
});

app.use((opts) => {
  const request  = opts.request;
  const response = opts.response;
  console.log(request.body);
  response.setBody(request.body);
});

app.use((opts) => {
  const response = opts.response;

  const body = response.getBody();

  response.setBody(_.extend(body, { c : 3 }));
});

app.use((opts) => {
  const response = opts.response;

  const body = response.getBody();

  response.setBody(JSON.stringify(body));
});

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
//    const body = response.body;
//    console.log('a');
//
//    console.log('write1');
//    body.write({ a : 1 });
//    Q().delay(100).then(() => {
//      console.log('write2');
//      body.write({ b : 2 });
//    }).delay(100).then(() => {
//      console.log('end3');
//      body.end({ c : 3 });
//    });
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//    console.log('b');
//
//    //Q.delay(200).then(() => {
//    //  throw new Error('asdfasdf');
//    //}).done();
//
//    setTimeout(() => {
//      throw new Error('asdfasdf');
//    }, 200);
//
//    const transform = through2.obj(function (chunk, enc, callback) {
//      console.log('2');
//      this.push(_.map(chunk, (v, k) => {
//        return `${v}${k}`;
//      }));
//      callback();
//    });
//    response.body.pipe(transform);
//    response.setBody(transform);
//    return Q.delay(100);
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//    console.log('c');
//
//    const transformed = response.body.pipe(through2.obj(function (chunk, enc, callback) {
//      console.log('3');
//      this.push(JSON.stringify(chunk));
//      callback();
//    }));
//    response.setBody(transformed);
//    return Q.delay(250);
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
//    response.setBody(fs.createReadStream(path.resolve(__dirname, 'test.txt')));
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    response.statusCode = (201);
//    Q().delay(10).then(() => {
//
//    });
//    let i               = 0;
//    response.setBody(response.body.pipe(through2(function (chunk, enc, callback) {
//      i++;
//      if (i === 17) {
//        callback(new Error('okokok'));
//        //response.body.emit('error', new Error('ohfuck'));
//      }
//      this.push(chunk.toString().toUpperCase());
//      callback();
//    })).on('error', (err) => {
//      response.body.emit('error', err);
//    }));
//  }
//});
//
//app.use({
//  handler : (opts) => {
//    const request  = opts.request;
//    const response = opts.response;
//
//    response.setBody(response.body.pipe(through2(function (chunk, enc, callback) {
//      console.log('c');
//      this.push(` + ${chunk.toString()}`);
//      callback();
//    })));
//  }
//});
//
//app.useError((opts) => {
//  const response = opts.response;
//
//  response.statusCode = 500;
//  response.setBody('there was an error');
//});

const server = http.createServer((req, res) => {
  const request = ({
    path    : req.url,
    method  : req.method,
    headers : req.headers,
    body    : req
  });

  app.processRequest(request).then((response) => {
    // TODO: at this time all middleware is evaluated, but maybe nothing is written to the response body yet.
    res.statusCode = response.statusCode;
    _.each(response.headers, (value, key) => {
      res.setHeader(key, value);
    });
    console.log('piped');
    response.body.pipe(res);
    response.body.once('error', (err) => {
      console.log('an error!', err);
      res.end();
    });
  }).catch((err) => {
    res.statusCode = 500;
    res.end(err.stack);
  }).done();
});

server.listen(3000);
console.log('listening');
