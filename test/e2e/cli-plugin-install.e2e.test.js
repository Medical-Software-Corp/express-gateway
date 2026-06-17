import fs from 'fs';
import path from 'path';
import util from 'util';

import should from 'should';
import cpr from 'cpr';
import rimraf from 'rimraf';
import tmp from 'tmp';
import yaml from 'js-yaml';
import { runCLICommand } from '../common/cli.helper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_NAME = 'express-gateway-plugin-test';

const gatewayDirectory = path.join(__dirname, '../../lib/config');
const pluginDirectory = path.join(__dirname, '../fixtures', PACKAGE_NAME);

let tempPath = null;

const config = {
  systemConfigPath: null,
  gatewayConfigPath: null
};

describe('E2E: eg plugins install', () => {
  before(() => {
    return util.promisify(tmp.dir)()
      .then(temp => {
        tempPath = temp;
        const _cpr = util.promisify(cpr);
        return _cpr(gatewayDirectory, tempPath);
      })
      .then(() => {
        config.systemConfigPath = path.join(tempPath, 'system.config.yml');
        config.gatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

        return runCLICommand({
          cliArgs: ['plugins', 'install', pluginDirectory, '-n', '-g',
            '-o', '"foo=bar"',
            '-o', '"baz=4444"'],
          adminPort: 0,
          configDirectoryPath: tempPath,
          cliExecOptions: { cwd: tempPath }
        });
      });
  });

  after(done => {
    rimraf(tempPath, done);
  });

  it('installs a plugin with a directory package specifier', () => {
    const systemConfigData = fs.readFileSync(config.systemConfigPath);
    const systemConfig = yaml.load(systemConfigData.toString());

    const expected = {
      test: {
        package: 'express-gateway-plugin-test',
        foo: 'bar',
        baz: '4444'
      }
    };

    should(systemConfig.plugins).be.deepEqual(expected);
  });
});
