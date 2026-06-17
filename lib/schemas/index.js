import Ajv from 'ajv';
import superagent from 'superagent';
import logger from '../logger.js';
import ajvKeywords from 'ajv-keywords';

const loggerGateway = logger.gateway;

const ajv = new Ajv({
  useDefaults: true,
  coerceTypes: true,
  verbose: true,
  logger: loggerGateway,
  loadSchema: uri => superagent.get(uri).then(res => res.body)
});

ajvKeywords(ajv, 'instanceof');

const registeredKeys = [];

function registerAsync(schema) {
  return ajv.compileAsync(schema).then(() => data => validate(schema.$id, data));
}

function register(type, name, schema) {
  /*
    This piece of code is checking that the schema isn't already registered.
    This is not optimal and it's happening because the testing helpers aren't
    removing the schemas when we're shutting down the gateway. Hopefully we'll
    get back to this once we'll have a better story for programmatic startup/shutdown
  */

  if (!schema) {
    loggerGateway.warn(`${name} ${type} hasn't provided a schema. Validation for this ${type} will be skipped.`);
    return () => ({ isValid: true });
  } else {
    if (!schema.$id) {
      throw new Error('The schema must have the $id property.');
    }

    if (registeredKeys.findIndex(keys => keys.$id === schema.$id) === -1) {
      ajv.addSchema(schema);
      registeredKeys.push({ type, $id: schema.$id });
    } else {
      ajv.removeSchema(schema.$id).addSchema(schema);
    }
  }

  return (data) => validate(schema.$id, data);
}

function find(param = null) {
  if (param) {
    const item = ajv.getSchema(param);
    if (item) {
      return { schema: item.schema };
    }
  }

  return registeredKeys
    .filter(item => !param || item.type === param)
    .map(key => ({ type: key.type, schema: ajv.getSchema(key.$id).schema }));
}

const validate = (id, data) =>
  ({ isValid: ajv.validate(id, data), error: ajv.errorsText() });

export default {
  register,
  registerAsync,
  find,
  validate
};
