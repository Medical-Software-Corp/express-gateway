import schemas from '../schemas/index.js';
import loggers from '../logger.js';
import express from 'express';
import { PassThrough } from 'stream';

const logger = loggers.gateway;
const jsonParser = express.json();
const urlEncoded = express.urlencoded({ extended: true });

export default {
  name: 'json-schema',
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/json-schema.json',
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'Json schema to validate against.',
        examples: [{ type: 'string' }]
      },
      logErrors: {
        type: 'boolean',
        default: false,
        description: 'Value istructing the gateway to report the errors on the logger or not'
      }
    },
    required: ['schema', 'logErrors']
  },
  handler: config => {
    return schemas.registerAsync(config.schema).then(validator => {
      if (config.logErrors) {
        return req => {
          const { isValid, error } = validator(req.body);
          logger.warn(error);
          return isValid;
        };
      }
      return req => validator(req.body).isValid;
    });
  },
  middlewares: [(req, res, next) => {
    req.egContext.requestStream = new PassThrough();
    req.pipe(req.egContext.requestStream);

    jsonParser(req, res, (err) => {
      if (err) return next(err);

      urlEncoded(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    });
  }]
};
