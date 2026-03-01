import should from 'should';

import testHelper from '../common/routing.helper.js';
import config from '../../lib/config.js';
const originalGatewayConfig = config.gatewayConfig;

describe('Missing policies', () => {
  const helper = testHelper();
  describe('Using a policy that is not installed', () => {
    before('setup', () => {
      config.gatewayConfig = {
        http: { port: 0 },
        policies: ['rewrite'],
        pipelines: {
          pipeline1: {
            apiEndpoint: 'authorizedEndpoint',
            policies: [{ rewrite: { action: { serviceEndpoint: 'backend' } } }]
          }
        }
      };
    });

    it('should prevent the gateway from starting', () => should(helper.setup({ config })).rejectedWith('POLICY_NOT_FOUND'));
  });

  describe('Using a policy that is not listed in policies array', () => {
    before('setup', () => {
      config.gatewayConfig = {
        http: { port: 0 },
        policies: ['basic-auth'],
        apiEndpoints: {
          authorizedEndpoint: {
            host: '*',
            paths: ['/test']
          }
        },
        pipelines: {
          pipeline1: {
            apiEndpoint: 'authorizedEndpoint',
            policies: [{ proxy: { action: { serviceEndpoint: 'backend' } } }]
          }
        }
      };
    });

    it('should prevent the gateway from starting', () => should(helper.setup({ config })).rejectedWith('POLICY_NOT_DECLARED'));
  });

  afterEach('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });
});
