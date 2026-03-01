import fs from 'fs';
import path from 'path';
import jsYaml from 'js-yaml';
import should from 'should';
// eslint-disable-next-line no-unused-vars
import Config from '../../lib/config.js';
import schema from '../../lib/schemas.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('EG templates schema validation', () => {
  ['basic', 'getting-started'].forEach((template) => {
    const basePath = path.join(__dirname, '../../bin/generators/gateway/templates', template, 'config');
    ['gateway.config', 'system.config'].forEach((config) => {
      it(`${template} should pass the JSON schema validation for ${config}`, () => {
        should(schema.validate(`http://express-gateway.io/models/${config}.json`,
          jsYaml.load(fs.readFileSync(path.join(basePath, `${config}.yml`)))).isValid).be.true();
      });
    });
  });
});
