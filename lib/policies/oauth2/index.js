import schemas from '../../schemas/index.js';
import jwtPolicyExport from '../jwt/index.js';
const jwtSchema = jwtPolicyExport.schema;

schemas.register('policy', 'jwt', jwtSchema);

import policy from './oauth2.js';
import routes from './oauth2-routes.js';

export default {
  policy,
  routes,
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2.json',
    allOf: [
      { $ref: 'http://express-gateway.io/schemas/base/auth.json' },
      {
        type: 'object',
        properties: {
          jwt: { $ref: 'jwt.json' }
        }
      }]
  }
};
