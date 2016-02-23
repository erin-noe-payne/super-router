'use strict';

const http        = require('http');
const SuperRouter = require('./..');
const _           = require('lodash');

const app    = new SuperRouter.App();
const router = new SuperRouter.Router();
const users = {
  1 : {
    name   : 'jane',
    userId : 1
  },
  2 : {
    name   : 'ted',
    userId : 2
  },
  3 : {
    name   : 'marci',
    userId : 3
  }
};

router.addRoute({
  path    : '/',
  methods : 'get',
  handler : (opts) => {
    const response = opts.response;

    response.setBody({
      hello : 'world'
    });
  }
});

router.addRoute({
  path    : '/users',
  methods : 'get',
  handler : (opts) => {
    const response = opts.response;

    response.setBody(_.toArray(users));
  }
});

router.addRoute({
  path    : '/users/:userId',
  methods : 'get',
  handler : (opts) => {
    const request = opts.request;
    const response = opts.response;

    const user = users[request.routeParams.userId];
    if (user == null) {
      const err  = new Error('Resource not found');
      err.statusCode = 404;
      throw err;
    }

    response.setBody(user);
  }
});

app.then(router.match);
app.then((opts) => {
  const request = opts.request;

  if (request.matchedRoute == null) {
    const err  = new Error('Resource not found');
    err.statusCode = 404;
    throw err;
  }
});
app.then(router.execute);
app.then((opts) => {
  const response = opts.response;

  response.setHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify(response.getBody()));
});

app.catch((opts) => {
  const response = opts.response;
  const error    = opts.error;

  response.statusCode = error.statusCode;
  response.setBody({
    statusCode : error.statusCode,
    message    : error.message
  });


  response.setHeader('Content-Type', 'application/json');
  response.setBody(JSON.stringify(response.getBody()));
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
