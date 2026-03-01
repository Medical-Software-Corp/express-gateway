import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { policy as logger } from '../logger/index.js';
import schemas from '../schemas/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const register = (policyOptions) => {
  const { name, schema, policy: action } = policyOptions;

  const validate = schemas.register('policy', name, schema);

  policyOptions.policy = (params, ...args) => {
    const validationResult = validate(params);
    if (validationResult.isValid) {
      return action(params, ...args);
    }

    logger.error(`Policy ${chalk.default.red.bold(name)} params validation failed: ${validationResult.error}`);
    throw new Error('POLICY_PARAMS_VALIDATION_FAILED');
  };

  policies[name] = policyOptions;
};

const resolve = (policyName) => {
  const policy = policies[policyName];

  if (!policy) {
    logger.error(`Could not find policy ${policyName}, Please make sure the plugins providing such policy
     is correctly configured in system.config file.`);
    throw new Error('POLICY_NOT_FOUND');
  }

  return policy;
};

const policies = {};

schemas.register('internal', 'baseAuth', {
  $id: 'http://express-gateway.io/schemas/base/auth.json',
  type: 'object',
  properties: {
    passThrough: {
      type: 'boolean',
      default: false,
      description: 'Specify whether continue with pipeline processing in case the authentication fails'
    }
  },
  required: ['passThrough']
});

const policyNames = fs
  .readdirSync(path.resolve(__dirname))
  .filter(dir => fs.lstatSync(path.resolve(__dirname, dir)).isDirectory());

const load = async (policiesToBeLoaded) => {
  const corePolicies = policiesToBeLoaded.filter(name => policyNames.includes(name));

  for (const name of corePolicies) {
    if (!policies[name]) {
      logger.debug(`registering policy ${chalk.green(name)}`);
      const policy = (await import(path.resolve(__dirname, name, 'index.js'))).default;
      policies[name] = Object.assign(policy, { name });
      register(policy);
    }
  }
};

export { register, resolve, policies, load };
