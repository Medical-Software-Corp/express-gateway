# Express Gateway - Architecture Deep Dive

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│  (Web Browser, Mobile App, External Service, API Consumer)      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/HTTP Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Gateway                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  HTTP/HTTPS Server                        │  │
│  │                   (Express.js)                            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │              Virtual Host Routing                          │ │
│  │         (Route by Host header: api.example.com)           │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │            API Endpoint Matching                           │ │
│  │     (Match path, method, host from gateway.config.yml)    │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │              Pipeline Selection                            │ │
│  │         (Select configured policy pipeline)               │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐ │
│  │                 Policy Chain                               │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  1. Authentication (key-auth, oauth2, jwt, basic)   │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  2. Authorization (check scopes, permissions)       │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  3. Rate Limiting (throttle requests)               │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  4. Request Transformation (headers, body)          │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  5. CORS (Cross-Origin Resource Sharing)            │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  6. Logging (request/response logging)              │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  7. Proxy (forward to backend service)              │  │ │
│  │  └────────────────────┬────────────────────────────────┘  │ │
│  │  ┌────────────────────▼────────────────────────────────┐  │ │
│  │  │  8. Response Transformation (headers, body)         │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Backend     │   │  Backend     │   │  Backend     │
  │  Service 1   │   │  Service 2   │   │  Service N   │
  │ (REST API)   │   │ (GraphQL)    │   │ (gRPC)       │
  └──────────────┘   └──────────────┘   └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Supporting Components                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │   Redis    │  │   Admin    │  │   Config   │  │  Plugins   ││
│  │  Database  │  │  REST API  │  │  Hot       │  │  System    ││
│  │  (users,   │  │  (Port     │  │  Reload    │  │  (Custom   ││
│  │   tokens)  │  │   9876)    │  │            │  │  Policies) ││
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Component Interactions

### 1. Request Processing Flow

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐
│ Client  │───▶│ Gateway  │───▶│ Pipeline │───▶│ Policy  │───▶│Backend  │
│Request  │    │ Router   │    │ Selector │    │ Chain   │    │Service  │
└─────────┘    └──────────┘    └──────────┘    └─────────┘    └─────────┘
                                                      │
                                                      ▼
                                                ┌──────────┐
                                                │  Redis   │
                                                │  Check   │
                                                │  Creds   │
                                                └──────────┘
```

### 2. Configuration System

```
┌──────────────────┐        ┌──────────────────┐
│ gateway.config   │        │ system.config    │
│     .yml         │        │     .yml         │
│                  │        │                  │
│ - API Endpoints  │        │ - DB Settings    │
│ - Service URLs   │        │ - Crypto Config  │
│ - Pipelines      │        │ - Plugins        │
│ - Policies       │        │ - Sessions       │
└────────┬─────────┘        └────────┬─────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌───────────────────────┐
         │  Config Loader        │
         │  (lib/config/         │
         │   config.js)          │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  Chokidar Watcher     │
         │  (File System         │
         │   Monitoring)         │
         └───────────┬───────────┘
                     │
                     │ File Change
                     ▼
         ┌───────────────────────┐
         │  hot-reload Event     │
         │  (EventBus)           │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Pipeline Rebuild     │
         │  (No Restart!)        │
         └───────────────────────┘
```

### 3. Plugin System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Express Gateway Core                  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Plugin Loader (lib/plugins.js)        │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        │                                │
│      ┌─────────────────┼─────────────────┐             │
│      │                 │                 │             │
│      ▼                 ▼                 ▼             │
│  ┌────────┐      ┌────────┐      ┌────────┐           │
│  │ Plugin │      │ Plugin │      │ Plugin │           │
│  │   1    │      │   2    │      │   N    │           │
│  └───┬────┘      └───┬────┘      └───┬────┘           │
│      │               │               │                 │
│      │  ┌────────────┼───────────────┘                │
│      │  │            │                                 │
│      ▼  ▼            ▼                                 │
│  ┌─────────────────────────────┐                      │
│  │   Policy Registry           │                      │
│  │   (lib/policies/index.js)   │                      │
│  └─────────────────────────────┘                      │
│  ┌─────────────────────────────┐                      │
│  │   Condition Registry        │                      │
│  │   (lib/conditions/)         │                      │
│  └─────────────────────────────┘                      │
│  ┌─────────────────────────────┐                      │
│  │   Gateway Routes            │                      │
│  │   (Custom Express routes)   │                      │
│  └─────────────────────────────┘                      │
└────────────────────────────────────────────────────────┘
```

### 4. Data Layer Architecture

```
┌────────────────────────────────────────────────────┐
│              Service Layer (lib/services/)          │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Users   │  │   Apps   │  │  Tokens  │         │
│  │ Service  │  │ Service  │  │ Service  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │                │
│       └─────────────┴─────────────┘                │
│                     │                              │
│                     ▼                              │
│       ┌─────────────────────────┐                  │
│       │   DAO Layer             │                  │
│       │   (Data Access Objects) │                  │
│       └───────────┬─────────────┘                  │
│                   │                                │
│                   ▼                                │
│       ┌─────────────────────────┐                  │
│       │   Redis Adapter         │                  │
│       │   (lib/db.js)           │                  │
│       └───────────┬─────────────┘                  │
│                   │                                │
│          ┌────────┴────────┐                       │
│          │                 │                       │
│          ▼                 ▼                       │
│    ┌──────────┐      ┌──────────┐                 │
│    │  Redis   │      │  Memory  │                 │
│    │  Server  │      │ Emulator │                 │
│    │(ioredis) │      │(ioredis- │                 │
│    │          │      │  mock)   │                 │
│    └──────────┘      └──────────┘                 │
└────────────────────────────────────────────────────┘
```

## Core Subsystems

### 1. Gateway Subsystem (`lib/gateway/`)

**Purpose:** Handle incoming HTTP requests and route through pipelines

**Key Files:**
- `index.js` - Bootstrap gateway, load plugins, create servers
- `server.js` - Create HTTP/HTTPS servers with Express
- `pipelines.js` - Configure request processing pipelines
- `context.js` - Request context with template evaluation
- `actionParams.js` - Handle policy parameters

**Data Flow:**
```
Request → server.js (Express App)
        → pipelines.js (Route Matching)
        → context.js (Create Context)
        → Policy Chain Execution
        → Backend Service
```

### 2. Policy Subsystem (`lib/policies/`)

**Purpose:** Reusable middleware for request processing

**Structure:**
```
lib/policies/
├── index.js              # Policy registry and loader
├── basic-auth/           # HTTP Basic Authentication
├── cors/                 # CORS handling
├── jwt/                  # JWT authentication
├── key-auth/             # API Key authentication
├── oauth2/               # OAuth2 server
├── proxy/                # Proxy to backend
├── rate-limit/           # Rate limiting
├── request-transformer/  # Transform requests
├── response-transformer/ # Transform responses
└── ...
```

**Policy Lifecycle:**
1. **Registration** - Policy registered with schema
2. **Validation** - Parameters validated against schema
3. **Execution** - Policy function called with params
4. **Chaining** - Next policy called via `next()`

### 3. Configuration Subsystem (`lib/config/`)

**Purpose:** Centralized configuration management

**Files:**
- `config.js` - Main config loader and watcher
- `index.js` - Public API for config access
- `gateway.config.yml` - Gateway configuration
- `system.config.yml` - System configuration
- `models/` - Configuration models
- `schemas/` - JSON schemas for validation

**Features:**
- YAML parsing with variable substitution
- Schema validation
- Hot-reloading with file watching
- Environment variable support

### 4. Admin API Subsystem (`lib/rest/`)

**Purpose:** REST API for managing gateway entities

**Endpoints:**
```
GET    /users              # List users
POST   /users              # Create user
GET    /users/:id          # Get user
PUT    /users/:id          # Update user
DELETE /users/:id          # Delete user

GET    /apps               # List apps
POST   /apps               # Create app
...

GET    /credentials        # List credentials
POST   /credentials        # Create credentials
...

GET    /scopes             # List scopes
POST   /scopes             # Create scope
...
```

**Authentication:**
- Can be protected with policies
- Defaults to localhost:9876
- Can be disabled in configuration

### 5. CLI Subsystem (`bin/`)

**Purpose:** Command-line interface for gateway management

**Structure:**
```
bin/
├── index.js              # CLI entry point
├── environment.js        # Yeoman environment setup
├── eg.js                 # Command registry
├── generators/           # Yeoman generators
│   ├── gateway/         # Create gateway project
│   ├── users/           # User management
│   ├── apps/            # App management
│   ├── credentials/     # Credential management
│   └── scopes/          # Scope management
```

**Command Structure:**
```
eg <command> <subcommand> [options]

Examples:
eg gateway create
eg users create -u username -p password
eg credentials create -c consumer -t key-auth
```

## Key Design Patterns

### 1. Middleware Chain Pattern

Policies are Express middleware chained together:

```javascript
// Each policy is a function that returns middleware
policy(params) {
  return (req, res, next) => {
    // Do work
    next(); // Continue to next policy
  };
}
```

### 2. Plugin Architecture

Plugins extend gateway functionality:

```javascript
module.exports = {
  version: '1.0.0',
  init: (pluginContext) => {
    // Register custom components
    pluginContext.registerPolicy({ /* ... */ });
    pluginContext.registerCondition({ /* ... */ });
    pluginContext.registerGatewayRoute(app => { /* ... */ });
  }
};
```

### 3. Service Layer Pattern

Business logic separated from HTTP layer:

```javascript
// Service Layer
const userService = require('./services/consumers/user');

// HTTP Layer uses service
router.post('/users', (req, res) => {
  userService.create(userData)
    .then(user => res.json(user));
});
```

### 4. Event-Driven Architecture

Components communicate via events:

```javascript
const eventBus = require('./eventBus');

// Emit event
eventBus.emit('gateway-started', { port: 8080 });

// Listen for event
eventBus.on('hot-reload', (config) => {
  // Reload configuration
});
```

### 5. Schema Validation

JSON Schema validates all inputs:

```javascript
const schema = {
  type: 'object',
  properties: {
    max: { type: 'number' },
    windowMs: { type: 'number' }
  },
  required: ['max']
};

// Validation happens automatically
const validate = schemas.register('policy', 'rate-limit', schema);
```

## Security Architecture

### Authentication Flow

```
┌─────────┐
│ Request │
└────┬────┘
     │
     ▼
┌─────────────────┐
│ Extract Token/  │
│   Credentials   │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Lookup in Redis │
│ (credentials)   │
└────┬────────────┘
     │
     ├─ Valid ──────▶ ┌──────────────┐
     │                │ Set req.user │
     │                └──────┬───────┘
     │                       │
     │                       ▼
     │                ┌──────────────┐
     │                │ Check Scopes │
     │                └──────┬───────┘
     │                       │
     │                       ▼
     │                ┌──────────────┐
     │                │ Continue     │
     │                │ Pipeline     │
     │                └──────────────┘
     │
     └─ Invalid ────▶ ┌──────────────┐
                      │ Return 401   │
                      └──────────────┘
```

### OAuth2 Flow (Authorization Code)

```
┌──────────┐                               ┌──────────┐
│  Client  │                               │ Gateway  │
└────┬─────┘                               └────┬─────┘
     │                                          │
     │  1. GET /oauth2/authorize?              │
     │     client_id=xxx&                      │
     │     response_type=code                  │
     │────────────────────────────────────────▶│
     │                                          │
     │  2. 302 Redirect to login               │
     │◀────────────────────────────────────────│
     │                                          │
     │  3. POST /login (credentials)           │
     │────────────────────────────────────────▶│
     │                                          │
     │  4. 302 Redirect with code              │
     │     redirect_uri?code=AUTHCODE          │
     │◀────────────────────────────────────────│
     │                                          │
     │  5. POST /oauth2/token                  │
     │     grant_type=authorization_code       │
     │     code=AUTHCODE                       │
     │────────────────────────────────────────▶│
     │                                          │
     │  6. { access_token, refresh_token }     │
     │◀────────────────────────────────────────│
     │                                          │
     │  7. GET /api/resource                   │
     │     Authorization: Bearer ACCESS_TOKEN  │
     │────────────────────────────────────────▶│
     │                                          │
     │  8. Resource data                       │
     │◀────────────────────────────────────────│
```

## Performance Characteristics

### Request Latency

```
Component                 Typical Latency
────────────────────────────────────────
Route Matching            < 1ms
Policy Execution:
  - Authentication        1-5ms (Redis lookup)
  - Rate Limiting         1-3ms (Redis check)
  - Proxy                 Network latency
  - Transformation        < 1ms
────────────────────────────────────────
Total Overhead            5-10ms (excluding proxy)
```

### Throughput

- **Single Instance:** 1,000-10,000 req/s (depends on policies)
- **With Clustering:** Linear scaling with CPU cores
- **Bottlenecks:** Redis, backend services, network I/O

### Memory Usage

- **Base:** 50-100 MB
- **Per Request:** ~1 KB context object
- **Session Storage:** Depends on session size and count
- **Recommendation:** 512 MB - 2 GB per instance

## Scalability Patterns

### Horizontal Scaling

```
┌──────────┐     ┌──────────────┐
│  Load    │────▶│  Gateway     │
│ Balancer │     │  Instance 1  │
│          │     └──────┬───────┘
│          │            │
│          │     ┌──────▼───────┐
│          │────▶│  Gateway     │
│          │     │  Instance 2  │
│          │     └──────┬───────┘
│          │            │
│          │     ┌──────▼───────┐
│          │────▶│  Gateway     │
│          │     │  Instance N  │
└──────────┘     └──────┬───────┘
                        │
                 ┌──────▼────────┐
                 │     Redis     │
                 │   (Shared)    │
                 └───────────────┘
```

### Deployment Topologies

**1. Single Instance (Development)**
```
[Client] → [Gateway:8080] → [Backend]
```

**2. Load Balanced (Production)**
```
[Client] → [Load Balancer] → [Gateway 1]
                          → [Gateway 2] → [Redis]
                          → [Gateway N]
```

**3. Multi-Region (Global)**
```
[Client] → [GeoDNS] → [Region 1: LB + Gateways + Redis]
                   → [Region 2: LB + Gateways + Redis]
                   → [Region N: LB + Gateways + Redis]
```

## Monitoring and Observability

### Logging

```javascript
const logger = require('./logger');

// Log levels: error, warn, info, debug
logger.info('Gateway started on port 8080');
logger.error('Failed to connect to Redis', { error });
```

### Metrics to Monitor

1. **Request Metrics**
   - Request rate (req/s)
   - Response time (p50, p95, p99)
   - Error rate (4xx, 5xx)

2. **Gateway Metrics**
   - CPU usage
   - Memory usage
   - Event loop lag

3. **Backend Metrics**
   - Upstream response time
   - Upstream error rate
   - Connection pool usage

4. **Redis Metrics**
   - Operation latency
   - Connection count
   - Memory usage

### Health Checks

```yaml
# Add health check endpoint
apiEndpoints:
  health:
    host: '*'
    paths: '/health'

pipelines:
  health:
    apiEndpoints:
      - health
    policies:
      - terminate:
          action:
            statusCode: 200
            message: 'OK'
```

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │     E2E     │  ← test/e2e/
        │   Tests     │
        └─────────────┘
       ┌───────────────┐
       │ Integration   │  ← test/
       │    Tests      │
       └───────────────┘
     ┌─────────────────────┐
     │    Unit Tests       │  ← test/
     │ (policies, services)│
     └─────────────────────┘
```

### Test Structure

```javascript
describe('rate-limit policy', () => {
  it('should limit requests', (done) => {
    // Arrange
    const policy = rateLimit({ max: 10, windowMs: 60000 });
    
    // Act
    for (let i = 0; i < 11; i++) {
      policy(req, res, next);
    }
    
    // Assert
    expect(res.statusCode).to.equal(429);
    done();
  });
});
```

## Upgrade and Migration Guide

### Upgrading Express Gateway

```bash
# Check current version
npm list express-gateway

# Update to latest
npm update express-gateway

# Or specific version
npm install express-gateway@1.16.10
```

### Breaking Changes (Historical)

- **1.x → 2.x:** Never released (project deprecated)
- **0.x → 1.x:** Configuration format changes

### Migration from Other Gateways

**From Kong:**
1. Map Kong plugins to EG policies
2. Convert Lua to JavaScript
3. Adapt configuration format

**From AWS API Gateway:**
1. Export API definitions
2. Create corresponding pipelines
3. Set up authentication

## Troubleshooting Guide

### Debug Mode

```bash
# Enable debug logging
DEBUG=express-gateway:* npm start

# Or
LOG_LEVEL=debug npm start
```

### Common Error Messages

**"POLICY_NOT_FOUND"**
- Policy not loaded in config
- Check `policies:` section in gateway.config.yml

**"POLICY_PARAMS_VALIDATION_FAILED"**
- Invalid policy parameters
- Check schema requirements

**"ECONNREFUSED"**
- Backend service not running
- Check serviceEndpoint URL

**"Redis connection failed"**
- Redis not running (if emulate: false)
- Check Redis host/port in system.config.yml

### Performance Profiling

```bash
# CPU profiling
node --prof lib/index.js

# Heap snapshot
node --inspect lib/index.js
# Open chrome://inspect
```

## Best Practices

### Configuration Management

✅ **Do:**
- Use environment variables for secrets
- Keep configs in version control (except secrets)
- Use different configs per environment
- Document all configuration options

❌ **Don't:**
- Hardcode sensitive data
- Share configs between environments
- Disable hot-reload in development

### Policy Design

✅ **Do:**
- Keep policies focused (single responsibility)
- Make policies reusable
- Document policy parameters
- Use schema validation

❌ **Don't:**
- Mix concerns in one policy
- Access database directly (use services)
- Block event loop with sync operations

### Security

✅ **Do:**
- Use HTTPS in production
- Rotate secrets regularly
- Implement rate limiting
- Validate all inputs
- Use strong cipher keys

❌ **Don't:**
- Expose admin API publicly
- Use default secrets
- Skip authentication
- Log sensitive data

### Performance

✅ **Do:**
- Use Redis for distributed deployments
- Enable clustering
- Cache when possible
- Monitor metrics

❌ **Don't:**
- Run everything on one instance
- Use synchronous operations
- Ignore memory leaks
- Skip load testing

---

**Document Version:** 1.0  
**Created:** 2026-03-01  
**Express Gateway Version:** 1.16.10
