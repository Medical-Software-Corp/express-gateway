import https from 'https';
import minimatch from 'minimatch';
import tls from 'tls';
import http from 'http';
import fs from 'fs';
import path from 'path';
import loggerModule from '../logger/index.js';
const logger = loggerModule.gateway;
import config from '../config/index.js';
import eventBus from '../eventBus.js';

export function bootstrap (app) {
  const httpServer = config.gatewayConfig.http ? http.createServer(app) : null;
  const httpsServer = config.gatewayConfig.https && config.gatewayConfig.https.tls ? createTlsServer(config.gatewayConfig.https, app) : null;

  addOnCloseEventHandlingToServer(httpServer);
  addOnCloseEventHandlingToServer(httpsServer);

  return {
    httpServer,
    httpsServer
  };
};

function createTlsServer (httpsConfig, app) {
  let defaultCert = null;
  const sniCerts = [];

  for (const el in httpsConfig.tls) {
    const domain = el;
    const certPaths = httpsConfig.tls[el];
    let cert;
    if (domain === 'default') {
      cert = defaultCert = {};
    } else {
      cert = {};
      sniCerts.push([domain, cert]);
    }

    cert.key = fs.readFileSync(path.resolve(certPaths.key), 'utf-8');
    cert.cert = fs.readFileSync(path.resolve(certPaths.cert), 'utf-8');
    if (certPaths.ca && certPaths.ca.length) {
      cert.ca = certPaths.ca.map(ca => fs.readFileSync(path.resolve(ca), 'utf-8'));
    }
  }

  // see possible options https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
  const options = Object.assign({}, httpsConfig.options);

  if (defaultCert) {
    options.key = defaultCert.key;
    options.cert = defaultCert.cert;
    options.ca = defaultCert.ca;
  }

  if (sniCerts.length > 0) {
    options.SNICallback = (servername, cb) => {
      for (const [domain, cert] of sniCerts) {
        if (minimatch(servername, domain)) {
          logger.debug(`sni: using cert for ${domain}`);
          cb(null, tls.createSecureContext(cert));
          return;
        }
      }
      if (defaultCert) {
        logger.debug('sni: using default cert');
        cb(null, tls.createSecureContext(defaultCert));
      } else {
        logger.error('sni: no cert!');
        cb(new Error('cannot start TLS SNI - no cert configured'));
      }
    };
  }

  return https.createServer(options, app);
}

function addOnCloseEventHandlingToServer (server) {
  if (server) {
    server.on('close', function () {
      eventBus.removeAllListeners();
    });
  }
}
