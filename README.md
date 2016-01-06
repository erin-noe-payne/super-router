# Super Router

[![Travis build status](https://travis-ci.org/autoric/super-router)](https://travis-ci.org/autoric/super-router.svg)


[API Docs](http://autoric.github.io/super-router/doc/)

[Code coverage Report](http://autoric.github.io/super-router/coverage/lcov-report/)

```
const SuperRouter = require('super-router');
const app      = new SuperRouter.App();
const router   = new SuperRouter.Router();

router.addRoute({
  path    : '/cases',
  methods : 'get',
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    return Database.getCases().then((cases)=>{
      response.setBody(cases);
    });
  }
});

router.addRoute({
  path    : '/cases/:caseId',
  methods : 'get',
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    return Database.getCaseById(request.routeParams.caseId).then((case)=>{
      response.setBody(case);
    });
  }
});

app.use({
  path : '/cases/externalId/:externalId(/*restOfRoute)',
  handler : (opts) => {
    const request  = opts.request;
    const response = opts.response;

    return Database.getCaseByExternalId(request.routeParams.externalId).then((case)=>{
      request.path = `/cases/${case.id}${request.routeParams.restOfRoute}`
    });
  }
});
app.use(router.match);
app.use(router.execute);
app.use((opts) => {
  const request  = opts.request;
  const response = opts.response;

  response.setBody(JSON.stringify(response.getBody()));
})

```
