import supertest from 'supertest';
import testHelper from '../common/routing.helper.js';
import config from '../../lib/config.js';

describe('Pipelines', () => {
  describe('send a request that cannot be handled by any pipeline', () => {
    const helper = testHelper();
    let _app;

    before('setup', () => {
      config.gatewayConfig = {
        http: {
          port: 0
        },
        apiEndpoints: {
          verticals: {
            path: '/verticals'
          }
        },
        policies: ['terminate'],
        pipelines: {
          common: {
            apiEndpoints: [
              'verticals'
            ],
            policies: [
              {
                terminate: [
                  {
                    action: {
                      statusCode: 200,
                      message: 'stop'
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      return helper.setup().then(({ app }) => { _app = app; });
    });

    after(helper.cleanup);

    it('should return 404', () =>
      supertest(_app)
        .get('/no-clue')
        .expect(404)
    );
  });
});
