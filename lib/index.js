import './eventBus.js';
import * as pluginsLoader from './plugins.js';
import gatewayModule from './gateway/index.js';
import restModule from './rest/index.js';
import config from './config/index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Main {
  constructor () {
    this.configPath = null;
  }

  load (configPath) {
    this.configPath = configPath;
    return this;
  }

  async run () {
    process.env.EG_CONFIG_DIR = this.configPath || process.env.EG_CONFIG_DIR;
    const { default: config } = await import('./config/index.js');
    const plugins = await pluginsLoader.load({ config });
    const gateway = await gatewayModule({ plugins, config });
    const admin = await restModule({ plugins, config });

    return Promise.all([gateway, admin]);
  }
}

export default () => {
  return new Main();
};

const isMainModule = process.argv[1] === __filename || process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async () => {
    const plugins = await pluginsLoader.load({ config });
    await gatewayModule({ plugins, config });
    await restModule({ plugins, config });
  })();
}
