/**
 * Lambda Router
 */

const Boom = require('boom');

class LambdaRouter {

  /**
   * LambdaRouter constructor.
   * @param {Object} options
   * @param {Object} options.headers
   * @param {Function} options.onInvoke
   * @param {Function} options.onError
   */
  constructor(options = {}) {
    this.routes = {};
    this.prefix = options.prefix;
    this.headers = options.headers || {};
    this.onInvoke = options.onInvoke;
    this.onError = options.onError;
  }

  /**
   * Lambda handler function.
   * Maps event details to previously registered route handlers.
   * @returns {Function}
   */
  handler() {
    return async (event, context, cb) => {
      // Prevent callback waiting.
      // IMPORTANT, otherwise lambda may potentially timeout
      // needlessly.
      context.callbackWaitsForEmptyEventLoop = false;

      // Setup state object to allow handlers to pass data along
      context.state = {};

      // Find appropriate handlers
      const route = this._divineRoute(event);

      try {
        // Verify route was found
        if (!route || !route.handlers) throw Boom.notFound('Resource not found');

        // Notify onInvoke handler if provided
        if (this.onInvoke) this.onInvoke(event);

        // Invoke handlers for reply
        let payload;
        for (let handler of route.handlers) {
          payload = await handler(event, context);
        }

        // Deliver response
        return cb(null, {
          statusCode: 200,
          headers: this.headers,
          body: JSON.stringify(Object.assign({ success: true }, payload))
        });
      } catch (err) {
        // Capture error details from boom
        const details = err.output.payload;

        // Get error body from onError handler if provided
        let body;
        if (this.onError) body = this.onError(err, event);
        if (!body) {
          body = {
            success: false,
            error: Object.assign(err.data || {}, {
              statusCode: details.statusCode || 400,
              message: details.message,
              code: details.error
            })
          };
        }

        // Deliver response
        return cb(null, {
          statusCode: details.statusCode || 400,
          headers: this.headers,
          body: JSON.stringify(body)
        });
      }

    };
  }

  /**
   * Add handler for get route.
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  get(path, ...hdlr) {
    this._wrap('GET', path, hdlr);
  }

  /**
   * Add handler for post route.
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  post(path, ...hdlr) {
    this._wrap('POST', path, hdlr);
  }

  /**
   * Add handler for put route.
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  put(path, ...hdlr) {
    this._wrap('PUT', path, hdlr);
  }

  /**
   * Add handler for delete route.
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  del(path, ...hdlr) {
    this._wrap('DELETE', path, hdlr);
  }

  /**
   * Add handler for options route.
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  options(path, ...hdlr) {
    this._wrap('OPTIONS', path, hdlr);
  }

  /**
   * Store route handler reference in routes
   * @param {String} method
   * @param {String} path
   * @param {Function} hdlr - list of handlers to call in succession
   */
  _wrap(method, path, handlers) {
    if (!this.routes[method]) this.routes[method] = [];
    if (this.prefix) {
      path = `${this.prefix}${path}`;
    }
    this.routes[method].push({ path, handlers });
  }

  /**
   * Deliver handler that matches lambda event.
   * @param {Object} event
   * @returns {Object}
   */
  _divineRoute({ httpMethod, resource }) {
    if (!this.routes[httpMethod]) return;
    return this.routes[httpMethod].find(r => r.path === resource);
  }
}

module.exports = LambdaRouter;
