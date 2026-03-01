import chalk from 'chalk';
import loggers from '../logger/index.js';
import schemas from '../schemas/index.js';
import predefined from './predefined.js';

const logger = loggers.policy;
const conditions = {};

function register({ type = 'condition', name, handler, schema }) {
  const validate = schemas.register(type, name, schema);

  conditions[name] = config => {
    const validationResult = validate(config);
    if (validationResult.isValid) {
      if (handler.length === 2) {
        return req => handler(req, config);
      }

      return handler(config);
    }

    logger.error(`Condition ${chalk.red.bold(name)} config validation failed: ${validationResult.error}`);
    throw new Error('CONDITION_PARAMS_VALIDATION_FAILED');
  };
}

function init() {
  predefined.forEach(register);
  return { register };
}

export { init, conditions };
