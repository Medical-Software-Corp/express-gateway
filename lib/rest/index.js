import logger from '../logger.js';
import eventBus from '../eventBus.js';
import express from 'express';
import usersRoute from './routes/users.js';
import appsRoute from './routes/apps.js';
import scopesRoute from './routes/scopes.js';
import credentialsRoute from './routes/credentials.js';
import tokensRoute from './routes/tokens.js';
import apiEndpointsRoute from './routes/api-endpoints.js';
import serviceEndpointsRoute from './routes/service-endpoints.js';
import pipelinesRoute from './routes/pipelines.js';
import policiesRoute from './routes/policies.js';
import schemasRoute from './routes/schemas.js';

const adminLogger = logger.admin;

export default async function ({ plugins, config } = {}) {
  let cfg;
  if (config) {
    cfg = config.gatewayConfig;
  } else {
    const configModule = await import('../config/index.js');
    cfg = configModule.default.gatewayConfig;
  }

  if (!cfg.admin || cfg.admin.port === undefined || cfg.admin.port === null) {
    adminLogger.verbose('Admin server is not configured, launch canceled');
    return;
  }
  if (cfg.admin.hostname) {
    adminLogger.warn('Warning! use of hostname is deprecated in admin section, use host instead');
  }

  // Remove the default in the code when we will not support both properties anymore.
  cfg.admin.host = cfg.admin.hostname || cfg.admin.host || 'localhost';

  const app = express();
  app.set('x-powered-by', false);
  app.use(express.json());

  if (process.env.LOG_LEVEL === 'debug') {
    app.use((req, res, next) => {
      adminLogger.debug(`${req.url} ${req.method}`);
      req.body && adminLogger.debug(JSON.stringify(req.body, undefined, 2));
      next();
    });
  }

  if (plugins && plugins.adminRoutes && plugins.adminRoutes.length) {
    plugins.adminRoutes.forEach(ext => ext(app));
  }
  app.use('/users', usersRoute());
  app.use('/apps', appsRoute());
  app.use('/scopes', scopesRoute());
  app.use('/credentials', credentialsRoute());
  app.use('/tokens', tokensRoute());
  app.use('/api-endpoints', apiEndpointsRoute({ config }));
  app.use('/service-endpoints', serviceEndpointsRoute({ config }));
  app.use('/pipelines', pipelinesRoute({ config }));
  app.use('/policies', policiesRoute({ config }));
  app.use('/schemas', schemasRoute());

  app.use((err, req, res, next) => {
    adminLogger.debug(err.stack);
    if (err.code === 'INVALID_CONFIG') {
      return res.status(422).send(err.message);
    }
    res.status(500).send(err.message || 'admin API error');
  });

  return new Promise(resolve => {
    const { port, host, backlog } = cfg.admin;
    const srv = app.listen(port, host, backlog, () => {
      const { address, port } = srv.address();
      adminLogger.info(`admin http server listening on ${address}:${port}`);
      eventBus.emit('admin-ready', { adminServer: srv });
      resolve(srv);
    });
  });
}
