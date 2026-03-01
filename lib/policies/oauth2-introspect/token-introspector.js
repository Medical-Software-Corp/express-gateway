import superagent from 'superagent';
import { policy as logger } from '../../logger/index.js';

export default (options) => {
  return (token, tokenTypeHint) => {
    const data = { token };

    if (tokenTypeHint) {
      data.token_type_hint = tokenTypeHint;
    }

    logger.info(`token-introspector : ${options.endpoint}`);

    return superagent
      .post(options.endpoint)
      .set('authorization', options.authorization_value)
      .type('form')
      .send(data)
      .timeout({ response: options.timeout })
      .then(res => {
        if (res.body.active === true) {
          logger.debug('token-introspector : Token is active');
          return res.body;
        }
        logger.debug('token-introspector : Token is not active');

        throw new Error('Token not active');
      });
  };
};
