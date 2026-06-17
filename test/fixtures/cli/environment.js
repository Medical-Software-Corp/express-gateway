import { TestAdapter } from 'yeoman-test/lib/adapter.js';
import { bootstrap as environmentBootstrap } from '../../../bin/environment.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const defaultEg = {
  exit () {},
  get config () {
    const cfg = require('../../../lib/config');
    return cfg.default || cfg;
  },
  get services () {
    const svc = require('../../../lib/services');
    return svc.default || svc;
  }
};

export const bootstrap = (eg, adapter) => {
  eg = eg || defaultEg;
  adapter = adapter || new TestAdapter();

  const { program, env } = environmentBootstrap(eg, adapter);

  if (!env.hasOwnProperty('_originalCreate')) {
    env._originalCreate = env.create;
  }

  env.resetHijack = () => {
    env.create = env._originalCreate.bind(env);
    env._hijackers = {};
    env._isHijacked = false;
  };

  env.prepareHijack = () => {
    if (env._isHijacked) {
      return;
    }

    env.create = (namespace, options) => {
      const generator = env._originalCreate.bind(env)(namespace, options);

      const namespaces = Object.keys(env._hijackers);
      if (namespaces.indexOf(namespace) !== -1) {
        const hijacker = env._hijackers[namespace];
        hijacker(generator);
      }

      return generator;
    };
    env._isHijacked = true;
  };

  env._hijackers = {};
  env.hijack = (namespace, hijacker) => {
    env._hijackers[namespace] = hijacker;
  };

  return { program, env };
};
