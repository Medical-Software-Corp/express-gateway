import expressionPolicyModule from '../../../lib/policies/expression/index.js';
const expressionPolicy = expressionPolicyModule.policy;
import EgContextBase from '../../../lib/gateway/context.js';
import assert from 'assert';

describe('expression action', () => {
  const res = {
    test: 'text'
  };
  const req = {
    url: '/test',
    method: 'GET',
    egContext: Object.create(new EgContextBase())
  };
  req.egContext.req = req;
  req.egContext.res = res;
  it('should execute code against eg context', (done) => {
    const expressionMiddleware = expressionPolicy({
      jscode: 'req.url = req.url + "/67" ; res.test = res.test + 68;'
    });

    expressionMiddleware(req, res, () => {
      assert.strictEqual(req.url, '/test/67');
      assert.strictEqual(res.test, 'text68');
      done();
    });
  });
});
