import session from 'supertest-session';
import should from 'should';
import qs from 'querystring';
import url from 'url';
import express from 'express';
import sinon from 'sinon';
import assert from 'assert';

import logger from '../../lib/policies/log/instance.js';
import services from '../../lib/services.js';
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
import db from '../../lib/db.js';

import testHelper from '../common/routing.helper.js';
import config from '../../lib/config.js';
const originalGatewayConfig = config.gatewayConfig;

describe('E2E: oauth2, proxy, log, expression, rate-limit policies', () => {
  const helper = testHelper();
  const spy = sinon.spy();
  let user, application, token, app, backendServer;

  before('setup', (done) => {
    sinon.spy(logger, 'info');

    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:7777'
        }
      },
      apiEndpoints: {
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: ['authorizedScope']
        }
      },
      policies: ['oauth2', 'proxy', 'log', 'expression', 'rate-limit'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [
            { oauth2: null },
            {
              expression: {
                action: {
                  jscode: 'req.url = req.url + "/67"'
                }
              }
            },
            {
              log: [
                {
                  action: {
                     
                    message: '${req.url} ${egContext.req.method}'
                  }
                },
                {
                  condition: {
                    name: 'never'
                  },
                  action: {
                     
                    message: '${req.url} ${egContext.req.method}'
                  }
                }
              ]
            },
            {
              'rate-limit': {
                action: {
                  max: 1,
                   
                  rateLimitBy: '${req.host}'
                }
              }
            },
            {
              proxy: {
                action: { serviceEndpoint: 'backend' }
              }
            }
          ]
        }
      }
    };

    db
      .flushdb()
      .then(function () {
        const user1 = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        return userService.insert(user1);
      })
      .then(_user => {
        should.exist(_user);
        user = _user;

        const app1 = {
          name: 'irfan_app',
          redirectUri: 'https://some.host.com/some/route'
        };

        return applicationService.insert(app1, user.id);
      })
      .then(_app => {
        should.exist(_app);
        application = _app;

        return credentialService.insertScopes(['authorizedScope']);
      })
      .then(() =>
        Promise.all([credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['authorizedScope'] }),
          credentialService.insertCredential(user.id, 'basic-auth', { password: 'password', scopes: ['authorizedScope'] })])
      )
      .then(res => {
        should.exist(res);
        return helper.setup();
      })
      .then(apps => {
        app = apps.app;
        const request = session(app);

        request
          .post('/login')
          .query({
            username: user.username,
            password: 'password'
          })
          .expect(302)
          .end(function (err, res) {
            should.not.exist(err);

            request
              .get('/oauth2/authorize')
              .query({
                redirect_uri: application.redirectUri,
                response_type: 'token',
                client_id: application.id,
                scope: 'authorizedScope'
              })
              .expect(200)
              .end(function (err, res) {
                should.not.exist(err);

                request
                  .post('/oauth2/authorize/decision')
                  .query({ transaction_id: res.headers.transaction_id })
                  .expect(302)
                  .end(function (err, res) {
                    should.not.exist(err);
                    const params = qs.parse(url.parse(res.headers.location).hash.slice(1));
                    token = params.access_token;

                    const backendApp = express();
                    backendApp.all('*', (req, res) => {
                      spy(req.headers);
                      res.send();
                    });

                    const runningBackendApp = backendApp.listen(7777, () => {
                      backendServer = runningBackendApp;
                      done();
                    });
                  });
              });
          });
      })
      .catch(done);
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    logger.info.restore();
    backendServer.close();
    return helper.cleanup();
  });

  it('should execute oauth2, proxy, log, expression, rate-limit policies and return 200', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        assert(spy.calledOnce);
        assert.strictEqual(logger.info.getCall(0).args[0], '/authorizedPath/67 GET');
        should.not.exist(logger.info.getCall(1));
        done();
      });
  });

  it('should execute oauth2, proxy, log, expression, rate-limit policies and return 429 as rate limit is reached', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(429)
      .end(function (err) {
        should.not.exist(err);
        assert(spy.calledOnce);
        assert.strictEqual(logger.info.getCall(1).args[0], '/authorizedPath/67 GET');
        done();
      });
  });
});
