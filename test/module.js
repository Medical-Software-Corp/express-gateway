import assert from 'assert';
import path from 'path';
import gateway from '../lib/index.js';
import config from '../lib/config/index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('main module', () => {
  it('fires up a new gateway instance with valid config', () => {
    gateway()
      .load(path.join(__dirname, 'config'))
      .run();

    // config is loaded after the gateway is running.
    assert(!!config.gatewayConfig);
    assert(!!config.systemConfig);
  });
});
