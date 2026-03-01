# Express Gateway - Quick Start Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Creating Your First Gateway](#creating-your-first-gateway)
4. [Basic Configuration](#basic-configuration)
5. [Common Use Cases](#common-use-cases)
6. [Testing Your Gateway](#testing-your-gateway)
7. [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** version 18.0.0 or higher
- **npm** (comes with Node.js)
- Basic understanding of HTTP APIs
- A backend service to proxy (or use our example)

Check your Node.js version:
```bash
node --version  # Should be >= 18.0.0
```

## Installation

### Global Installation (Recommended for CLI)

```bash
npm install -g express-gateway
```

Verify installation:
```bash
eg --version
```

### Local Installation (For programmatic use)

```bash
mkdir my-gateway
cd my-gateway
npm init -y
npm install express-gateway
```

## Creating Your First Gateway

### Step 1: Generate Gateway Project

```bash
eg gateway create
```

You'll be prompted with:
```
? What's the name of your Express Gateway? my-first-gateway
? Where would you like to install your Express Gateway? my-first-gateway
? What type of Express Gateway do you want to create? Getting Started with Express Gateway
```

This creates:
```
my-first-gateway/
├── server.js              # Entry point
├── config/
│   ├── gateway.config.yml # Gateway configuration
│   └── system.config.yml  # System configuration
└── package.json
```

### Step 2: Start the Gateway

```bash
cd my-first-gateway
npm start
```

You should see:
```
info: gateway http server listening on 0.0.0.0:8080
info: admin http server listening on localhost:9876
```

### Step 3: Test the Gateway

```bash
curl http://localhost:8080
```

## Basic Configuration

### Understanding gateway.config.yml

```yaml
http:
  port: 8080  # Gateway listens on this port

# Define your API endpoints (what clients call)
apiEndpoints:
  api:
    host: localhost
    paths: '/api/*'

# Define your backend services (where requests go)
serviceEndpoints:
  backend:
    url: 'http://localhost:3000'

# Define available policies
policies:
  - proxy

# Connect everything in pipelines
pipelines:
  api-pipeline:
    apiEndpoints:
      - api
    policies:
      - proxy:
          action:
            serviceEndpoint: backend
```

### Configuration Concepts

**1. API Endpoints** - External interfaces clients use
```yaml
apiEndpoints:
  users-api:
    host: 'api.example.com'
    paths: '/users/*'
    methods: 'GET,POST,PUT,DELETE'
```

**2. Service Endpoints** - Internal backend services
```yaml
serviceEndpoints:
  users-service:
    url: 'http://localhost:3001'
  orders-service:
    url: 'http://localhost:3002'
```

**3. Policies** - Processing steps for requests
```yaml
policies:
  - proxy
  - key-auth
  - rate-limit
  - cors
```

**4. Pipelines** - Connect API endpoints to policies
```yaml
pipelines:
  users-pipeline:
    apiEndpoints:
      - users-api
    policies:
      - key-auth:
      - rate-limit:
          max: 100
          windowMs: 60000
      - proxy:
          action:
            serviceEndpoint: users-service
```

## Common Use Cases

### Use Case 1: Simple Proxy

**Goal:** Forward all requests to a backend service

**Configuration:**
```yaml
http:
  port: 8080

apiEndpoints:
  api:
    host: '*'
    paths: '/*'

serviceEndpoints:
  backend:
    url: 'http://localhost:3000'

policies:
  - proxy

pipelines:
  main:
    apiEndpoints:
      - api
    policies:
      - proxy:
          action:
            serviceEndpoint: backend
```

**Test:**
```bash
# Start backend (example)
cd my-backend
npm start  # Running on :3000

# Start gateway
cd my-gateway
npm start  # Running on :8080

# Request through gateway
curl http://localhost:8080/users
# Proxied to http://localhost:3000/users
```

### Use Case 2: API Key Authentication

**Goal:** Protect your API with API keys

**Step 1: Add key-auth policy**
```yaml
policies:
  - key-auth
  - proxy

pipelines:
  secure-api:
    apiEndpoints:
      - api
    policies:
      - key-auth:
      - proxy:
          action:
            serviceEndpoint: backend
```

**Step 2: Create a user**
```bash
eg users create
# Follow prompts
# Username: alice
# Email: alice@example.com
```

**Step 3: Create API key**
```bash
eg credentials create -c alice -t key-auth
```

Output:
```
keyId: 1A2B3C4D5E6F
keySecret: ABC123XYZ789
```

**Step 4: Test with API key**
```bash
# Without key (should fail)
curl http://localhost:8080/api/users
# Response: 401 Unauthorized

# With key (should succeed)
curl -H "Authorization: apiKey 1A2B3C4D5E6F:ABC123XYZ789" \
     http://localhost:8080/api/users
# Response: (proxied data)
```

### Use Case 3: Rate Limiting

**Goal:** Limit requests to prevent abuse

**Configuration:**
```yaml
policies:
  - rate-limit
  - proxy

pipelines:
  rate-limited-api:
    apiEndpoints:
      - api
    policies:
      - rate-limit:
          max: 100                # Max 100 requests
          windowMs: 60000         # Per 60 seconds (1 minute)
      - proxy:
          action:
            serviceEndpoint: backend
```

**Test:**
```bash
# Send 101 requests quickly
for i in {1..101}; do
  curl http://localhost:8080/api/test
done

# Last request should return:
# 429 Too Many Requests
```

### Use Case 4: Multiple Services Routing

**Goal:** Route different paths to different services

**Configuration:**
```yaml
apiEndpoints:
  users-api:
    host: '*'
    paths: '/users/*'
  orders-api:
    host: '*'
    paths: '/orders/*'

serviceEndpoints:
  users-service:
    url: 'http://localhost:3001'
  orders-service:
    url: 'http://localhost:3002'

policies:
  - proxy

pipelines:
  users-pipeline:
    apiEndpoints:
      - users-api
    policies:
      - proxy:
          action:
            serviceEndpoint: users-service
  
  orders-pipeline:
    apiEndpoints:
      - orders-api
    policies:
      - proxy:
          action:
            serviceEndpoint: orders-service
```

**Result:**
```
GET /users/123  → http://localhost:3001/users/123
GET /orders/456 → http://localhost:3002/orders/456
```

### Use Case 5: CORS Configuration

**Goal:** Allow cross-origin requests from web browsers

**Configuration:**
```yaml
policies:
  - cors
  - proxy

pipelines:
  api:
    apiEndpoints:
      - api
    policies:
      - cors:
          origin: 'https://myapp.com'
          credentials: true
          methods: 'GET,POST,PUT,DELETE'
          allowedHeaders: 'Content-Type,Authorization'
      - proxy:
          action:
            serviceEndpoint: backend
```

**Test:**
```bash
curl -H "Origin: https://myapp.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:8080/api/users
```

Response includes:
```
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET,POST,PUT,DELETE
```

### Use Case 6: Request/Response Transformation

**Goal:** Modify headers before reaching backend

**Add Custom Header:**
```yaml
policies:
  - headers
  - proxy

pipelines:
  api:
    apiEndpoints:
      - api
    policies:
      - headers:
          forwardHeaders:
            X-Gateway-Version: '1.0'
            X-Powered-By: 'Express-Gateway'
      - proxy:
          action:
            serviceEndpoint: backend
```

Backend receives:
```
X-Gateway-Version: 1.0
X-Powered-By: Express-Gateway
```

### Use Case 7: JWT Authentication

**Goal:** Validate JWT tokens

**Configuration:**
```yaml
policies:
  - jwt
  - proxy

pipelines:
  secure-api:
    apiEndpoints:
      - api
    policies:
      - jwt:
          secretOrPublicKey: 'your-secret-key'
          audience: 'myapi.com'
          issuer: 'auth.myapi.com'
      - proxy:
          action:
            serviceEndpoint: backend
```

**Test:**
```bash
# Generate JWT (example using jwt.io)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Request with JWT
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/users
```

### Use Case 8: OAuth2 Server

**Goal:** Implement OAuth2 authorization

**Configuration:**
```yaml
policies:
  - oauth2
  - proxy

pipelines:
  oauth-pipeline:
    apiEndpoints:
      - api
    policies:
      - oauth2:
      - proxy:
          action:
            serviceEndpoint: backend
```

**Create OAuth2 Client:**
```bash
# Create app
eg apps create
# Name: MyApp
# Redirect URI: http://localhost:4200/callback

# Create OAuth2 credentials
eg credentials create -c MyApp -t oauth2
```

**OAuth2 Flow:**
```bash
# 1. Get authorization code
curl "http://localhost:8080/oauth2/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=http://localhost:4200/callback"

# 2. Exchange code for token
curl -X POST http://localhost:8080/oauth2/token \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:4200/callback"

# Response:
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 7200
}

# 3. Use access token
curl -H "Authorization: Bearer ACCESS_TOKEN" \
     http://localhost:8080/api/protected
```

## Testing Your Gateway

### Manual Testing with curl

**Basic Request:**
```bash
curl http://localhost:8080/api/test
```

**With Headers:**
```bash
curl -H "Authorization: apiKey KEY:SECRET" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/test
```

**POST Request:**
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"name":"John","email":"john@example.com"}' \
     http://localhost:8080/api/users
```

**View Response Headers:**
```bash
curl -i http://localhost:8080/api/test
```

**Verbose Output:**
```bash
curl -v http://localhost:8080/api/test
```

### Testing with httpie (Alternative)

```bash
# Install httpie
npm install -g httpie

# Basic request
http GET localhost:8080/api/test

# With authentication
http GET localhost:8080/api/test \
  Authorization:"apiKey KEY:SECRET"

# POST request
http POST localhost:8080/api/users \
  name=John \
  email=john@example.com
```

### Load Testing

**Using Apache Bench:**
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:8080/api/test
```

**Using wrk:**
```bash
# Install wrk
# Run load test
wrk -t10 -c100 -d30s http://localhost:8080/api/test
```

### Admin API Testing

**List Users:**
```bash
curl http://localhost:9876/users
```

**Create User:**
```bash
curl -X POST http://localhost:9876/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "firstname": "Bob",
    "lastname": "Smith",
    "email": "bob@example.com"
  }'
```

**List Credentials:**
```bash
curl http://localhost:9876/credentials
```

## Troubleshooting

### Gateway Won't Start

**Error:** Port already in use
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or change port in gateway.config.yml
http:
  port: 8081
```

**Error:** Configuration syntax error
```bash
# Check YAML syntax
# Common issues:
# - Incorrect indentation (use spaces, not tabs)
# - Missing colons
# - Unquoted special characters
```

### Authentication Not Working

**Issue:** 401 Unauthorized

**Checklist:**
1. Verify credential exists: `eg credentials list`
2. Check policy order (auth before proxy)
3. Verify header format: `Authorization: apiKey ID:SECRET`
4. Check user is active: `eg users info -u username`

### Proxy Errors

**Error:** ECONNREFUSED

**Solutions:**
1. Verify backend is running
2. Check serviceEndpoint URL
3. Test backend directly: `curl http://localhost:3000`

**Error:** 504 Gateway Timeout

**Solutions:**
1. Increase timeout in proxy policy
2. Check backend performance
3. Check network connectivity

### Configuration Not Reloading

**Issue:** Changes don't take effect

**Solutions:**
1. Check file is saved
2. Watch for errors in console
3. Restart gateway manually
4. Verify `EG_DISABLE_CONFIG_WATCH` is not set

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Or in code
DEBUG=express-gateway:* npm start
```

## Next Steps

### 1. Explore More Policies

Read about all available policies:
- `basic-auth` - HTTP Basic Authentication
- `expression` - Conditional logic
- `log` - Request logging
- `request-transformer` - Modify requests
- `response-transformer` - Modify responses
- `terminate` - Return custom responses

### 2. Create Custom Plugins

Learn to extend Express Gateway with custom policies:
```javascript
// my-plugin.js
module.exports = {
  version: '1.0.0',
  init: (pluginContext) => {
    pluginContext.registerPolicy({
      name: 'my-policy',
      policy: (params) => {
        return (req, res, next) => {
          // Your logic here
          next();
        };
      }
    });
  }
};
```

### 3. Production Deployment

Prepare for production:
1. Use HTTPS (configure TLS)
2. Set up Redis (disable emulation)
3. Configure environment variables
4. Set up monitoring
5. Enable logging
6. Configure load balancing
7. Implement health checks

### 4. Advanced Features

Explore advanced capabilities:
- Service discovery integration
- Dynamic configuration updates
- Custom conditions
- Multi-tenancy
- API versioning
- WebSocket proxying

### 5. Integration Examples

Integrate with:
- Docker and Kubernetes
- Monitoring tools (Prometheus, Grafana)
- Logging systems (ELK stack)
- Service meshes
- CI/CD pipelines

## Useful Commands Reference

### CLI Commands

```bash
# Gateway management
eg gateway create              # Create new gateway
eg gateway start               # Start gateway

# User management
eg users create                # Create user
eg users list                  # List users
eg users info -u <username>    # User details
eg users update -u <username>  # Update user
eg users remove -u <username>  # Delete user

# Credential management
eg credentials create -c <consumer> -t <type>  # Create credential
eg credentials list                            # List credentials
eg credentials info -i <id>                    # Credential details
eg credentials deactivate -i <id>              # Deactivate credential
eg credentials remove -i <id>                  # Delete credential

# Scope management
eg scopes create               # Create scope
eg scopes list                 # List scopes
eg scopes remove -s <scope>    # Delete scope

# App management
eg apps create                 # Create app
eg apps list                   # List apps
eg apps info -a <appname>      # App details
```

### Configuration Examples

**Full Example:**
```yaml
http:
  port: 8080
https:
  port: 8443
  tls:
    default:
      key: /path/to/key.pem
      cert: /path/to/cert.pem

apiEndpoints:
  public-api:
    host: 'api.example.com'
    paths: '/public/*'
  
  admin-api:
    host: 'admin.example.com'
    paths: '/admin/*'
    methods: 'GET,POST,PUT,DELETE'

serviceEndpoints:
  public-service:
    url: 'http://localhost:3000'
  
  admin-service:
    url: 'http://localhost:3001'

policies:
  - cors
  - key-auth
  - rate-limit
  - proxy

pipelines:
  public-pipeline:
    apiEndpoints:
      - public-api
    policies:
      - cors:
      - rate-limit:
          max: 1000
          windowMs: 60000
      - proxy:
          action:
            serviceEndpoint: public-service
  
  admin-pipeline:
    apiEndpoints:
      - admin-api
    policies:
      - key-auth:
      - rate-limit:
          max: 100
          windowMs: 60000
      - proxy:
          action:
            serviceEndpoint: admin-service
```

## Resources

- [Official Documentation](http://www.express-gateway.io/docs)
- [GitHub Repository](https://github.com/ExpressGateway/express-gateway)
- [Getting Started Guide](http://www.express-gateway.io/getting-started)
- [Plugin Development](http://www.express-gateway.io/docs/plugins/)
- [Configuration Reference](http://www.express-gateway.io/docs/configuration/)

---

**Happy Gateway Building!** 🚀

For questions or issues, please refer to:
- GitHub Issues: https://github.com/ExpressGateway/express-gateway/issues
- Gitter Chat: https://gitter.im/ExpressGateway/express-gateway
