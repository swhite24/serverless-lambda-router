# serverless-lambda-router

[![Build Status](https://travis-ci.org/swhite24/serverless-lambda-router.svg?branch=master)](https://travis-ci.org/swhite24/serverless-lambda-router)

serverless-lambda-router is a router framework to be used within a single [lambda](https://aws.amazon.com/lambda/) function supporting an [API Gateway](https://aws.amazon.com/api-gateway/) stage. Note that this library requires a lambda runtime of `6.10`.

serverless-lambda-router operates around promises, so use of async / await with babel is encouraged.  To deliver a response, resolve the handler with the payload.  To deliver an error, throw the [Boom](https://github.com/hapijs/boom) error.

Originally developed for use with [the serverless framework](https://serverless.com/).

## Installation

```
npm install --save serverless-lambda-router
```

## Usage

```javascript
const Boom = require('boom');
const LambdaRouter = require('serverless-lambda-router');

// Create a router instance
const router = new LambdaRouter({
  // Headers to be attached to response payload
  headers: {
    'Cache-Control': 'max-age=0, private, no-cache, no-store'
  },
  // Function to be notified before route invoke
  onInvoke: event => {},
  // Function to be notified when route throws
  onError: (err, event) => {}
});

// Register handlers
router.get('/foo', async (event, context) => {

  // To deliver a response, return a Promise and resolve with your
  // intended payload.  If using async / wait, you can simply return the payload.
  return {
    foo: 'bar'
  };
});

router.get('/bar', async (event, context) => {

  // To deliver a response, return a Promise and throw an error.
  // If using async / wait, you can simply throw the error.
  throw Boom.notFound('Resource not found');
});

// Multiple handlers can be registered for a given route.
// Handlers may communicate via `context.state`, and the result of the final
// handler determines the response.
router.get('/baz', async (event, context) => {
  context.state.name = 'John Smith';
}, async (event, context) => {
  return {
    name: context.state.name
  };
});

// Export the handler
exports.handler = router.handler();
```
