import assert from 'assert';
import gateway from '../../lib/gateway.js';
import eventBus from '../../lib/eventBus.js';
import Config from '../../lib/config/config.js';
import request from 'supertest';

const config = new Config();
config.loadGatewayConfig();

describe('gateway routing with plugins', () => {
  let gatewaySrv, httpSrvFromEvent;
  before('fires up a new gateway instance', function () {
    eventBus.on('http-ready', ({ httpServer }) => {
      httpSrvFromEvent = httpServer;
    });
    return gateway({
      plugins: {
        gatewayRoutes: [function (gatewayExpressInstance) {
          gatewayExpressInstance.all('/test', (req, res) => res.json({ enabled: true }));
        }]
      },
      config
    }).then(srv => {
      gatewaySrv = srv.app;
      return srv;
    });
  });

  it('should add custom route', () => {
    return request(gatewaySrv)
      .get('/test')
      .then(res => {
        assert.ok(res.body.enabled);
      });
  });
  it('should fire http-ready event', () => {
    assert.ok(httpSrvFromEvent);
    assert.strictEqual(httpSrvFromEvent, gatewaySrv);
  });

  after('close gateway srv', () => {
    gatewaySrv.close();
  });
});
