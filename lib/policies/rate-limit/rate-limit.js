import RateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { policy as logger } from '../../logger/index.js';
import db from '../../db/index.js';

export default (params) => {
  if (params.rateLimitBy) {
    params.keyGenerator = (req) => {
      try {
        return req.egContext.evaluateAsTemplateString(params.rateLimitBy);
      } catch (err) {
        logger.error('Failed to generate rate-limit key with config: %s; %s', params.rateLimitBy, err.message);
      }
    };
  }
  return new RateLimit(Object.assign(params, {
    store: new RedisStore({
      client: db,
      expiry: params.windowMs / 1000
    })
  }));
};
