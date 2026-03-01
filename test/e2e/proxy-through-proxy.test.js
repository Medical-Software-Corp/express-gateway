import httpProxy from 'http-proxy';
import http from 'http';
import assert from 'assert';
import request from 'superagent';
import gwHelper from '../common/gateway.helper.js';
import cliHelper from '../common/cli.helper.js';

['HTTP_PROXY', 'http_proxy'].forEach((envVariable) => {
  describe('@e2e @proxy through proxy', () => {
    const gatewayConfig = {
      apiEndpoints: {
        api: {
          path: '/test'
        }
      },
      policies: ['proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['api'],
          policies: [{
            proxy: {
              action: { serviceEndpoint: 'backend' }
            }
          }]
        }
      }
    };

    const proxiedUrls = {};
    let gw, proxy, srv, bs;

    before('init', (done) => {
      cliHelper.bootstrapFolder().then(dirInfo => {
        proxy = httpProxy.createProxyServer({ changeOrigin: true });

        srv = http.createServer(function (req, res) {
          proxiedUrls[req.url] = true;
          proxy.web(req, res, { target: req.url });
        });

        const server = srv.listen(0, (err) => {
          if (err) {
            return done(err);
          }

          process.env[envVariable] = `http://localhost:${server.address().port}`;
          gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }).then(({ gatewayProcess, backendServers }) => {
            gw = gatewayProcess;
            bs = backendServers[0];
            done();
          }).catch(done);
        });
      });
    });

    after('cleanup', (done) => {
      delete process.env[envVariable];
      gw.kill();
      proxy.close();
      srv.close(() => bs.close(done));
    });

    it(`should respect ${envVariable} env var and send through proxy`, () => {
      return request
        .get(`http://localhost:${gatewayConfig.http.port}/test`)
        .then((res) => {
          assert.ok(res.text);
          // we need to ensure that request went through proxy, not directly
          assert.ok(proxiedUrls[`${gatewayConfig.serviceEndpoints.backend.urls[0]}/test`], 'Proxy was not called');
        });
    });
  });
});
