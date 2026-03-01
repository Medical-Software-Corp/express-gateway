import testHelper from '../../common/routing.helper.js';
import Config from '../../../lib/config/config.js';
const helper = testHelper();

describe('@terminate', () => {
  before('setup', () => {
    const config = new Config();
    const configTemplate = {
      http: { port: 0 },
      apiEndpoints: {
        test: { paths: '*' }
      },
      policies: ['terminate'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{
            terminate: [{
              action: {
                statusCode: 429
              }
            }]
          }]
        }
      }
    };
    config.gatewayConfig = configTemplate;
    return helper.setup({ config });
  });

  after('cleanup', helper.cleanup);

  it('should terminate: ', helper.validateError({
    setup: {
      url: '/'
    },
    test: {
      result: 'test',
      errorCode: 429
    }
  }));
});
