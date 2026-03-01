'use strict';

import session from 'express-session';
import express from 'express';
import passport from 'passport';
import * as site from './site.js';
import * as oauth2Server from './oauth2-server.js';
import { policy as logger } from '../../logger.js';
import path from 'path';

export default async function (app, config) {
  app.set('view engine', 'ejs');
  if (config.systemConfig.session.storeProvider) {
    try {
      const ProviderStore = (await import(config.systemConfig.session.storeProvider)).default(session);
      config.systemConfig.session.store = new ProviderStore(config.systemConfig.session.storeOptions);
      delete config.systemConfig.session.storeProvider;
      delete config.systemConfig.session.storeOptions;
    } catch (error) {
      logger.error(`Failed to initialize custom express-session store, please ensure you have ${config.systemConfig.session.storeProvider} npm package installed`);
      throw error;
    }
  }

  const middlewares = [
    express.urlencoded({ extended: true }),
    express.json(),
    session(config.systemConfig.session),
    passport.initialize(),
    passport.session()
  ];
  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.get('/login', site.loginForm);
  app.post('/login', middlewares, site.login);
  app.get('/logout', site.logout);

  app.use('/oauth2', middlewares);
  app.get('/oauth2/authorize', oauth2Server.authorization);
  app.post('/oauth2/authorize/decision', oauth2Server.decision);
  app.post('/oauth2/token', oauth2Server.token);

  return app;
}
