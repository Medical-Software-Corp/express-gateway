// TODO: this is EG admin client; internal utility
import createClient from './client.js';
import createUsers from './users.js';
import createApps from './apps.js';
import createScopes from './scopes.js';
import createCredentials from './credentials.js';
import createTokens from './tokens.js';
import createPolicies from './config/policies.js';
import createPipelines from './config/pipelines.js';
import createApiEndpoints from './config/api-endpoints.js';
import createServiceEndpoints from './config/service-endpoints.js';
import createSchemas from './config/schemas.js';

export default function (options) {
  const client = createClient(options);

  return {
    users: createUsers(client),
    apps: createApps(client),
    scopes: createScopes(client),
    credentials: createCredentials(client),
    tokens: createTokens(client),
    config: {
      policies: createPolicies(client),
      pipelines: createPipelines(client),
      apiEndpoints: createApiEndpoints(client),
      serviceEndpoints: createServiceEndpoints(client),
      schemas: createSchemas(client)
    }
  };
}
