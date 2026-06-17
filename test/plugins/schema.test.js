import path from 'path';
import should from 'should';
import { createRequire } from 'module';

import pluginsLoader from '../../lib/plugins.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Caching fixture plugin, but redefining its properties for testing plugin load.
const pluginName = 'express-gateway-plugin-test';
const pluginDirectory = path.join(__dirname, '../fixtures', pluginName);
const testPlugin = require(pluginDirectory);

testPlugin.schema = {
  $id: `http://express-gateway.io/schemas/plugin/${pluginName}.json`,
  required: ['schema-test-param']
};

testPlugin.init = (pluginContext) => {
  pluginContext.registerPolicy('schema-test-policy');
};

describe('Plugin schema validation on load', () => {
  it('fails loading when parameter undefined', () => {
    const missingParameterConfig = {
      config: {
        systemConfig: {
          plugins: {
            test: {
              package: pluginDirectory
            }
          }
        }
      }
    };

    const loadedPlugins = pluginsLoader.load(missingParameterConfig);
    should(loadedPlugins).have.property('policies').empty();
  });

  it('loads plugin and registers policy successfully', () => {
    const config = {
      config: {
        systemConfig: {
          plugins: {
            test: {
              package: pluginDirectory,
              'schema-test-param': 'defined'
            }
          }
        }
      }
    };

    const loadedPlugins = pluginsLoader.load(config);
    should(loadedPlugins).have.property('policies', ['schema-test-policy']);
  });
});
