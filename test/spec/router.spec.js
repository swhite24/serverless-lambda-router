const Boom = require('boom');
const LambdaRouter = require('../../src');
const { methods, getEvent } = require('../util/data');

describe('Lambda Router', () => {

  it('should export a function', () => expect(LambdaRouter).to.be.a('function'));

  describe('on instantiation', () => {
    let router;
    beforeEach(() => router = new LambdaRouter());

    it('should have an empty set of routes', () => expect(router.routes).to.be.a('object'));

    methods.forEach(method => {
      it(`should expose a ${ method } method`, () => expect(router[method]).to.be.a('function'));
      it(`#${ method } should add a route`, () => {
        const handler = sinon.spy();
        const key = method === 'del' ? 'DELETE' : method.toUpperCase();

        router[method]('/foo', handler);
        expect(router.routes[key]).to.be.instanceOf(Array);
        expect(router.routes[key]).to.have.length(1);
      });
      it(`#${ method } should allow multiple handlers`, () => {
        const handler1 = sinon.spy();
        const handler2 = sinon.spy();
        const key = method === 'del' ? 'DELETE' : method.toUpperCase();

        router[method]('/foo', handler1, handler2);
        expect(router.routes[key][0].handlers).to.have.length(2);
      });
    });
  });

  describe('#handler', () => {
    let router, cb, context;

    beforeEach(() => {
      router = new LambdaRouter();
      cb = sinon.spy();
      context = {};
    });

    it('should return a function', () => {
      expect(router.handler()).to.be.a('function');
    });

    it('should prevent callback from waiting on event loop', async () => {
      const handler = router.handler();

      try {
        await handler({}, context, cb);
      } catch (err) {}
      expect(context.callbackWaitsForEmptyEventLoop).to.equal(false);
    });

    it('should setup a state object on context', async () => {
      const handler = router.handler();

      try {
        await handler({}, context, cb);
      } catch (err) {}
      expect(context.state).to.be.an('object');
    });

    it('should invoke all handlers matching a given route', async () => {
      const routeHandler1 = sinon.spy();
      const routeHandler2 = sinon.spy();
      const handler = router.handler();

      router.get('/foo', routeHandler1, routeHandler2);
      await handler(getEvent('GET', '/foo'), context, cb);

      expect(routeHandler1).to.have.been.called;
      expect(routeHandler2).to.have.been.called;
    });

    it('should invoke callback with successful response if handler does not throw', async () => {
      const routeHandler = sinon.stub().resolves({ foo: 'bar' });
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/foo'), context, cb);

      const args = cb.getCall(0).args;
      expect(cb).to.have.been.called;
      expect(args[0]).to.equal(null);
      expect(JSON.parse(args[1].body).success).to.equal(true);
      expect(JSON.parse(args[1].body).foo).to.equal('bar');
    });

    it('should invoke callback with failure response if handler throws', async () => {
      const routeHandler = sinon.stub().rejects(Boom.notFound('Resource not found', {foo: 'bar' }));
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/foo'), context, cb);

      const args = cb.getCall(0).args;
      expect(cb).to.have.been.called;
      expect(args[0]).to.equal(null);
      expect(JSON.parse(args[1].body).success).to.equal(false);
    });

    it('should invoke callback with error response if route not found', async () => {
      const handler = router.handler();
      await handler(getEvent('GET', '/foo'), context, cb);

      const args = cb.getCall(0).args;
      expect(cb).to.have.been.called;
      expect(args[0]).to.equal(null);
      expect(JSON.parse(args[1].body).success).to.equal(false);
    });

    it('should attach provided headers to response', async () => {
      router = new LambdaRouter({ headers: { 'Authorization': 'foo' }});
      const routeHandler = sinon.stub().resolves({ foo: 'bar' });
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/foo'), context, cb);

      const args = cb.getCall(0).args;
      expect(cb).to.have.been.called;
      expect(args[0]).to.equal(null);
      expect(args[1].headers).to.be.an('object');
      expect(args[1].headers.Authorization).to.equal('foo');
    });

    it('should call `onInvoke` handler when route with prefix is found', async () => {
      const onInvoke = sinon.spy();
      router = new LambdaRouter({ onInvoke: onInvoke, prefix: '/v1' });
      const routeHandler = sinon.stub().resolves({ foo: 'bar' });
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/v1/foo'), context, cb);

      expect(cb).to.have.been.called;
      expect(onInvoke).to.have.been.called;
    });

    it('should call `onInvoke` handler when route is found', async () => {
      const onInvoke = sinon.spy();
      router = new LambdaRouter({ onInvoke });
      const routeHandler = sinon.stub().resolves({ foo: 'bar' });
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/foo'), context, cb);

      expect(cb).to.have.been.called;
      expect(onInvoke).to.have.been.called;
    });

    it('should call `onError` handler if route handler throws', async () => {
      const onError = sinon.stub().returns({ foo: 'bar' });
      router = new LambdaRouter({ onError });
      const routeHandler = sinon.stub().rejects(Boom.notFound('Resource not found'));
      const handler = router.handler();

      router.get('/foo', routeHandler);
      await handler(getEvent('GET', '/foo'), context, cb);

      const args = cb.getCall(0).args;
      expect(cb).to.have.been.called;
      expect(onError).to.have.been.called;
      expect(JSON.parse(args[1].body).foo).to.equal('bar');
    });
  });
});
