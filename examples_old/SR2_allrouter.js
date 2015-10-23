const SuperRouter = require('./..');

const app = new SuperRouter.Router();


app.use((req, res) => {
  req.method = 'GET';
});
app.use(auth);
app.use(ContentType.request);

app.addRoute({})
app.addRoute({})
app.addRoute({})
app.addRoute({})

app.addRedirect({
  path : '/cases/externalId/:identifier(/*_restOfRoute)',
  handler : (req, res) => {
    return CaseModel.getById(req.input.identifier, 'externalId').then((caseInstance) => {
      return `/cases/${caseInstance.id}${req.routeInfo._restOfRoute}`;
    }).catch(() => {
      throw new NotFoundError();
    });
  }
});

app.use(customizeOpts)
app.use(ContentType.response)

app.addErrorMiddleare((err, req, res) => {
  res.send(500);
})

const Server = require('lr-http').serverFor({
  name : 'test-service',
  port : 3000,
  handler : (httpReq, httpReq) => {
    const superRequest = new SuperRouter.Request();
    const superResponse = new SuperRouter.Response();
    superRequest.headers = httpReq.headers;
    superRequest.path = httpReq.path;
    superRequest.method = httpReq.method;

    httpReq.pipe(superRequest);
    app.route(superRequest, superResponse).then(() => {
      httpReq.headers = superResponse.headers;
      httpReq.status = superResponse.status;
      superResponse.pipe(httpReq);
    });
  }
})