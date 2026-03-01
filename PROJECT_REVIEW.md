# Express Gateway - Project Review

## Overview

**Express Gateway** is a microservices API gateway built on top of Express.js. It acts as a centralized entry point for microservices and serverless architectures, providing security, rate limiting, authentication, and routing capabilities.

**Note:** This project is currently deprecated and no longer actively maintained. See the README for details.

### Key Information
- **Language:** JavaScript (Node.js)
- **Framework:** Express.js
- **Version:** 1.16.10
- **License:** Apache-2.0
- **Minimum Node Version:** 18.0.0

## Project Purpose

Express Gateway provides:
1. **API Gateway functionality** - Routes requests to appropriate microservices
2. **Security** - OAuth2, JWT, API key authentication, basic auth
3. **Rate Limiting** - Control request rates to protect backend services
4. **Request/Response Transformation** - Modify headers, bodies, and parameters
5. **Proxy** - Forward requests to backend services
6. **Centralized Configuration** - YAML-based configuration for all gateway features

## Architecture

### Core Components

#### 1. **Gateway Server** (`lib/gateway/`)
The main HTTP(S) server that handles incoming requests.

- **`index.js`** - Bootstraps the gateway server, loads plugins, registers policies
- **`server.js`** - Creates Express HTTP/HTTPS servers
- **`pipelines.js`** - Configures request processing pipelines
- **`context.js`** - Request context object passed through the pipeline
- **`actionParams.js`** - Handles policy action parameters

**Flow:**
```
Incoming Request → vhost routing → API Endpoint match → Pipeline → Policies → Backend Service
```

#### 2. **Policies** (`lib/policies/`)
Middleware functions that process requests/responses. Each policy is a reusable component.

**Built-in Policies:**
- `basic-auth` - HTTP Basic Authentication
- `cors` - Cross-Origin Resource Sharing
- `expression` - Conditional expression evaluation
- `headers` - Header manipulation
- `jwt` - JSON Web Token authentication
- `key-auth` - API key authentication
- `log` - Request logging
- `oauth2` - OAuth2 authorization
- `oauth2-introspect` - Token introspection
- `proxy` - Proxying to backend services (most commonly used)
- `rate-limit` - Request rate limiting
- `request-transformer` - Transform request headers/body
- `response-transformer` - Transform response headers/body
- `terminate` - Terminate request with custom response

**Policy Registration:**
```javascript
// Policies are registered with schema validation
register({
  name: 'policy-name',
  schema: { /* JSON Schema */ },
  policy: (params) => (req, res, next) => {
    // Policy implementation
  }
});
```

#### 3. **Configuration System** (`lib/config/`)
YAML-based configuration with hot-reloading support.

**Two main configuration files:**

**`gateway.config.yml`** - Gateway-specific configuration:
- `apiEndpoints` - Define API entry points (host, paths, methods)
- `serviceEndpoints` - Define backend service URLs
- `policies` - List of policies to load
- `pipelines` - Connect API endpoints to policies and service endpoints

**`system.config.yml`** - System-wide configuration:
- Database (Redis) settings
- Crypto settings
- Session configuration
- Token expiry times
- Plugin configuration

**Example Pipeline Configuration:**
```yaml
apiEndpoints:
  admin:
    host: 'api.example.com'
    paths: '/admin/*'
    methods: 'GET,POST'

serviceEndpoints:
  backend:
    url: 'http://localhost:3000'

policies:
  - proxy
  - key-auth
  - rate-limit

pipelines:
  admin-pipeline:
    apiEndpoints:
      - admin
    policies:
      - key-auth:
      - rate-limit:
          max: 100
          windowMs: 60000
      - proxy:
          action:
            serviceEndpoint: backend
```

#### 4. **Plugin System** (`lib/plugins.js`)
Extensibility mechanism for adding custom policies, conditions, and routes.

**Plugins can provide:**
- Custom policies
- Custom conditions
- Gateway routes
- Admin API routes

**Plugin Structure:**
```javascript
module.exports = {
  version: '1.0.0',
  init: (pluginContext) => {
    // Register custom policy
    pluginContext.registerPolicy({
      name: 'custom-policy',
      policy: () => (req, res, next) => { /* ... */ },
      schema: { /* ... */ }
    });
  }
};
```

#### 5. **CLI** (`bin/`)
Command-line interface for managing the gateway.

**Main Commands:**
- `eg gateway create` - Create new gateway project
- `eg users create` - Create API consumer users
- `eg credentials create` - Create credentials (API keys, OAuth clients)
- `eg scopes create` - Create authorization scopes
- `eg apps create` - Create applications

**Generator-based:** Uses Yeoman for scaffolding and interactive prompts.

#### 6. **Admin REST API** (`lib/rest/`)
Management API for runtime administration (users, apps, credentials, scopes).

**Endpoints:**
- `/users` - Manage users
- `/apps` - Manage applications
- `/credentials` - Manage credentials
- `/scopes` - Manage authorization scopes

**Default Port:** 9876

#### 7. **Data Store** (`lib/db.js`)
Redis-based persistent storage for users, credentials, tokens.

**Features:**
- Can use real Redis or in-memory emulation
- Stores: users, apps, credentials, tokens, authorization codes
- Namespace support (default: 'EG')

#### 8. **Services** (`lib/services/`)
Business logic for managing gateway entities.

- **`auth.js`** - Authentication service
- **`consumers/`** - User and app management
- **`credentials/`** - Credential management (API keys, OAuth)
- **`tokens/`** - Token management (access/refresh tokens)
- **`authorization-codes/`** - OAuth authorization codes

#### 9. **Conditions** (`lib/conditions/`)
Conditional expressions for pipeline routing.

**Predefined Conditions:**
- `pathMatch` - Match request path
- `method` - Match HTTP method
- `hostMatch` - Match request host
- `expression` - Custom JavaScript expression
- `authenticated` - Check authentication status
- `anonymous` - Check if request is anonymous
- `pathExact` - Exact path match

## Request Flow

```
1. Request arrives at gateway server
   ↓
2. Vhost routing (if configured)
   ↓
3. API Endpoint matching (host, path, method)
   ↓
4. Pipeline selection
   ↓
5. Policy execution (in sequence)
   │
   ├─→ Authentication policies (key-auth, oauth2, jwt, etc.)
   ├─→ Authorization checks
   ├─→ Rate limiting
   ├─→ Request transformation
   ├─→ Proxy to backend service
   └─→ Response transformation
   ↓
6. Response sent to client
```

### Context Object

Every request gets an `EgContext` object that flows through the pipeline:
- Contains Express `req` and `res` objects
- `requestID` - Unique request identifier
- `consumer` - Authenticated user/app
- Methods for template evaluation and condition matching

## Key Features Explained

### 1. **Virtual Hosts**
Route requests based on the `Host` header:
```yaml
apiEndpoints:
  api1:
    host: 'api1.example.com'
    paths: '/*'
  api2:
    host: 'api2.example.com'
    paths: '/*'
```

### 2. **Path Matching**
- Exact paths: `/api/users`
- Wildcards: `/api/*`
- Regex: Use `pathRegex` for complex patterns
- Multiple paths per endpoint

### 3. **Method Filtering**
Restrict endpoints to specific HTTP methods:
```yaml
apiEndpoints:
  api:
    paths: '/users'
    methods: 'GET,POST'
```

### 4. **Hot Reloading**
Gateway watches configuration files and reloads without restart:
- Watches `gateway.config.yml`
- Emits `hot-reload` event
- Rebuilds pipelines
- Disable with `EG_DISABLE_CONFIG_WATCH=true`

### 5. **OAuth2 Support**
Complete OAuth2 server implementation:
- Authorization Code flow
- Client Credentials flow
- Password flow
- Token refresh
- Token introspection

### 6. **Rate Limiting**
Multiple strategies:
- In-memory (single instance)
- Redis (distributed)
- Per-consumer or global
- Configurable time windows and limits

### 7. **Proxy Strategies**
Different ways to proxy requests:
- Simple proxy
- Load balancing (round-robin)
- Service discovery integration

## Development

### Project Structure

```
express-gateway/
├── bin/                    # CLI commands and generators
│   ├── generators/         # Yeoman generators for scaffolding
│   └── index.js           # CLI entry point
├── lib/                    # Core library
│   ├── conditions/        # Request conditions
│   ├── config/            # Configuration system
│   ├── gateway/           # Gateway server
│   ├── policies/          # Built-in policies
│   ├── rest/              # Admin REST API
│   ├── schemas/           # JSON schemas for validation
│   ├── services/          # Business logic services
│   ├── db.js              # Database layer
│   ├── eventBus.js        # Event system
│   ├── logger.js          # Logging
│   └── plugins.js         # Plugin loader
├── test/                   # Test suite
│   ├── cli/               # CLI tests
│   ├── e2e/               # End-to-end tests
│   └── ...                # Unit tests
├── admin/                  # Admin UI (deprecated)
├── gateway.config.yml      # Example gateway config
├── system.config.yml       # Example system config
└── package.json
```

### Scripts

```bash
# Start gateway
npm start

# Start with debug logging
npm run start:dev

# Run linter
npm run lint

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run E2E tests
npm run test:e2e
```

### Testing
- **Framework:** Mocha
- **Assertions:** Should.js
- **HTTP Testing:** Supertest
- **Coverage:** NYC (Istanbul)
- **Mocking:** Sinon

### Environment Variables

- `EG_CONFIG_DIR` - Path to configuration directory
- `EG_HTTP_PORT` - HTTP server port (default: 8080)
- `EG_DISABLE_CONFIG_WATCH` - Disable hot-reload
- `EG_DB_EMULATE` - Use in-memory Redis (default: true)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Getting Started

### Installation

```bash
npm install -g express-gateway
```

### Create a New Gateway

```bash
eg gateway create
cd my-gateway
npm start
```

This creates a new gateway project with:
- Configuration files
- Sample API endpoints
- Basic pipeline setup

### Basic Gateway Configuration

**gateway.config.yml:**
```yaml
http:
  port: 8080

apiEndpoints:
  api:
    host: localhost
    paths: '/api/*'

serviceEndpoints:
  backend:
    url: 'http://localhost:3000'

policies:
  - proxy

pipelines:
  api-pipeline:
    apiEndpoints:
      - api
    policies:
      - proxy:
          action:
            serviceEndpoint: backend
```

### Adding Authentication

```yaml
policies:
  - key-auth
  - proxy

pipelines:
  api-pipeline:
    apiEndpoints:
      - api
    policies:
      - key-auth:
      - proxy:
          action:
            serviceEndpoint: backend
```

Then create a user and API key:
```bash
eg users create
eg credentials create -c username -t key-auth
```

### Using as a Library

```javascript
const gateway = require('express-gateway');

gateway()
  .load(path.join(__dirname, 'config'))
  .run();
```

## Plugin Development

### Creating a Custom Plugin

```javascript
// plugin.js
module.exports = {
  version: '1.0.0',
  init: function (pluginContext) {
    pluginContext.registerPolicy({
      name: 'my-custom-policy',
      policy: (params) => {
        return (req, res, next) => {
          // Policy logic here
          console.log('Custom policy executed');
          next();
        };
      },
      schema: {
        $id: 'http://express-gateway.io/schemas/policies/my-custom-policy.json',
        type: 'object',
        properties: {
          // Policy parameter schema
        }
      }
    });
  }
};
```

### Loading a Plugin

**system.config.yml:**
```yaml
plugins:
  express-gateway-plugin-example:
    package: 'express-gateway-plugin-example'
```

Or install locally:
```bash
npm install express-gateway-plugin-example
```

## Common Use Cases

### 1. **API Gateway for Microservices**
- Single entry point for multiple services
- Centralized authentication
- Service discovery and load balancing

### 2. **Legacy System Modernization**
- Add authentication to legacy APIs
- Transform legacy formats
- Rate limiting for protection

### 3. **Serverless Function Gateway**
- Route requests to serverless functions
- Add authentication and rate limiting
- Manage CORS and headers

### 4. **API Management**
- Consumer management
- API key distribution
- Usage analytics (via logs)

### 5. **Development Proxy**
- Local development with production-like setup
- Mock backends
- Request/response logging

## Security Considerations

### Authentication Methods
1. **API Keys** - Simple key-based auth
2. **OAuth2** - Full OAuth2 server implementation
3. **JWT** - Stateless token authentication
4. **Basic Auth** - Username/password authentication

### Best Practices
- Use HTTPS in production
- Rotate secrets regularly
- Use strong cipher keys
- Implement rate limiting
- Enable CORS selectively
- Validate all inputs
- Keep dependencies updated
- Use Redis for distributed environments
- Implement proper logging and monitoring

### Credentials Storage
- Passwords hashed with bcrypt
- Secrets encrypted with AES256
- Tokens stored in Redis with expiry

## Performance Tips

1. **Use Redis** for distributed deployments
2. **Enable clustering** - Run multiple gateway instances
3. **Optimize policies** - Only use necessary policies
4. **Cache configurations** - Hot-reload has overhead
5. **Use connection pooling** for proxy
6. **Monitor memory** - Gateway is stateful for sessions
7. **Disable debug logging** in production

## Troubleshooting

### Common Issues

**Gateway won't start:**
- Check port availability
- Verify configuration syntax (YAML)
- Check Redis connection (if not emulated)

**Authentication not working:**
- Verify credentials exist
- Check policy order (auth before proxy)
- Review scope requirements

**Proxy errors:**
- Verify backend service is running
- Check serviceEndpoint URL
- Review proxy strategy configuration

**Hot-reload not working:**
- Check file permissions
- Verify `EG_DISABLE_CONFIG_WATCH` is not set
- Review configuration syntax

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check admin API
curl http://localhost:9876/users

# Test API endpoint
curl -H "Authorization: apiKey YOUR_KEY" http://localhost:8080/api
```

## Comparison with Other API Gateways

| Feature | Express Gateway | Kong | AWS API Gateway | Tyk |
|---------|----------------|------|-----------------|-----|
| Language | JavaScript | Lua/Go | Managed | Go |
| Deployment | Self-hosted | Self-hosted | Cloud | Self-hosted/Cloud |
| Open Source | Yes (Apache-2.0) | Yes | No | Yes |
| OAuth2 | Built-in | Plugin | No | Yes |
| Node.js Ecosystem | Native | No | No | No |
| Plugin System | Yes | Yes | Limited | Yes |
| Admin API | REST | REST | AWS API | REST/GraphQL |

## Ecosystem

### Related Projects
- **express-gateway-plugin-** - Community plugins
- **express-gateway.io** - Documentation website
- **Express.js** - Underlying framework
- **Yeoman** - Generator framework

### Community Resources
- Gitter chat room
- GitHub issues and discussions
- Google Groups forum
- Twitter (@express_gateway)

## Deprecation Notice

**Important:** Express Gateway is no longer actively maintained as of late 2020. The project maintainers have stated that they are no longer able to dedicate time to the project.

### Alternatives
- **Kong** - Popular API gateway
- **Tyk** - Open-source API gateway
- **AWS API Gateway** - Managed service
- **Azure API Management** - Managed service
- **KrakenD** - High-performance gateway
- **Traefik** - Modern reverse proxy and load balancer

### Migration Considerations
If you're using Express Gateway:
1. Evaluate your requirements
2. Test alternatives in non-production
3. Plan migration strategy
4. Consider forking if needed

## Conclusion

Express Gateway is a well-architected, extensible API gateway that leverages the Node.js and Express.js ecosystems. Its strengths include:

✅ **Pros:**
- Easy to understand (if you know Express)
- Flexible plugin system
- Good documentation
- YAML-based configuration
- Complete OAuth2 implementation
- Hot-reloading support

❌ **Cons:**
- No longer maintained (deprecated)
- Single-threaded (Node.js limitation)
- Limited built-in monitoring
- Memory usage for session storage
- Smaller community than alternatives

For new projects, consider more actively maintained alternatives. For existing deployments, the codebase is stable and can be maintained or forked if needed.

## Additional Resources

- [GitHub Repository](https://github.com/ExpressGateway/express-gateway)
- [Official Documentation](http://www.express-gateway.io/docs)
- [Getting Started Guide](http://www.express-gateway.io/getting-started)
- [Plugin Development](http://www.express-gateway.io/docs/plugins/)
- [Configuration Reference](http://www.express-gateway.io/docs/configuration/)

---

**Document Version:** 1.0  
**Created:** 2026-03-01  
**Express Gateway Version:** 1.16.10
