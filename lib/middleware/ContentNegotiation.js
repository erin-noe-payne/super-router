'use strict';

const Q = require('q');

class ContentNegotiation {

  static request(opts) {
    const request = opts.request;

    if (_isChunked(request)) {
      return;
    }

    const deferred = Q.defer();
    let newBody    = {};
    request.body.on('data', (chunk) => {
      try {
        newBody = JSON.parse(chunk);
      }
      catch (e) {
        const error = new Error(`Invalid JSON in request body.`);
        error.name = 'InvalidJSON';
        error.messageDetails = 'Hint: JSON does not allow a trailing comma.';
        error.statusCode = 400;
        deferred.reject(error);
      }
    });

    request.body.on('end', () => {
      request.body = newBody;
      deferred.resolve();
    });

    return deferred.promise;
  }

  static response(opts) {
    const response = opts.response;
    if (!_isChunked(response)) {
      response.setHeader('content-type', 'application/json');
      return response.setBody(JSON.stringify(response.getBody()));
    }
  }

}

function _isChunked(reqres) {
  const contentType = reqres.getHeader('Transfer-Encoding');
  return (contentType && contentType.toLowerCase().indexOf('chunked') > -1);
}

module.exports = ContentNegotiation;
