#!/usr/bin/env node

const eg = {
  get config () {
    return import('../lib/config/index.js').then(m => m.default);
  }
};

import('./environment.js').then(async module => {
  const bootstraped = await module.bootstrap(eg);

  if (bootstraped && bootstraped.program) {
    bootstraped.program.parse(process.argv.slice(2));
  }
});
