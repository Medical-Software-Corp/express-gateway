import policy from './basic-auth.js';

export default {
  policy,
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/basic-auth.json',
    allOf: [
      { $ref: 'http://express-gateway.io/schemas/base/auth.json' }
    ]
  }
};
