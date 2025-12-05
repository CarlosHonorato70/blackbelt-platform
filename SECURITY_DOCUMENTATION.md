# 🔒 Security Documentation - Black Belt Platform

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting](#rate-limiting)
4. [Security Headers](#security-headers)
5. [CORS Configuration](#cors-configuration)
6. [IP Monitoring & Blocking](#ip-monitoring--blocking)
7. [Data Protection](#data-protection)
8. [Security Best Practices](#security-best-practices)
9. [Incident Response](#incident-response)
10. [Compliance](#compliance)

---

## Security Overview

Black Belt Platform implements multiple layers of security to protect against common web vulnerabilities and attacks:

```
┌─────────────────────────────────────────────┐
│         Security Layer Stack                │
├─────────────────────────────────────────────┤
│  1. Helmet (Security Headers)               │
│  2. CORS (Origin Validation)                │
│  3. Rate Limiting (DDoS Protection)         │
│  4. IP Monitoring (Auto-blocking)           │
│  5. Request Validation                      │
│  6. Authentication (OAuth 2.0)              │
│  7. Authorization (RBAC + ABAC)             │
│  8. Multi-tenant Isolation (RLS)            │
│  9. Audit Logging                           │
│ 10. Data Encryption (HTTPS)                 │
└─────────────────────────────────────────────┘
```

### Threat Model

**Protected Against:**
- ✅ DDoS attacks (rate limiting)
- ✅ Brute force attacks (strict auth limits)
- ✅ XSS (Content Security Policy)
- ✅ Clickjacking (X-Frame-Options)
- ✅ MIME sniffing (X-Content-Type-Options)
- ✅ Man-in-the-middle (HSTS)
- ✅ SQL injection (parameterized queries)
- ✅ Cross-tenant data access (RLS)
- ✅ Automated abuse (IP blocking)

---

## Authentication & Authorization

### OAuth 2.0 Flow

1. **User Login**
```
Client → OAuth Provider → Callback → Server → JWT Token → HTTP-Only Cookie
```

2. **Token Storage**
- Stored in HTTP-only cookies (not accessible via JavaScript)
- Automatic refresh on expiration
- Secure flag in production (HTTPS only)

3. **Session Management**
```typescript
// Session duration: 24 hours
// Refresh token: 30 days
// Idle timeout: 2 hours
```

### Role-Based Access Control (RBAC)

**Roles:**
- `admin`: Full platform access
- `manager`: Manage own tenant
- `assessor`: Create/edit assessments
- `viewer`: Read-only access

### Attribute-Based Access Control (ABAC)

Permissions checked based on:
- User role
- Tenant ownership
- Resource ownership
- Action type (create/read/update/delete)

### Protected Procedures

```typescript
// Requires authentication
protectedProcedure

// Requires tenant context
tenantProcedure

// Public (no auth)
publicProcedure
```

---

## Rate Limiting

### Configuration

Implemented using `express-rate-limit` with in-memory storage.

#### General API Endpoints

**Path**: `/api/*`  
**Limit**: 100 requests per 15 minutes per IP  
**Headers**:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1638360000
```

**Response on Limit**:
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

#### Authentication Endpoints

**Path**: `/api/auth/*`, `/api/oauth/*`  
**Limit**: 5 requests per 15 minutes per IP  
**Stricter** to prevent brute force attacks

#### Email Endpoints

**Path**: Email delivery functions  
**Limit**: 10 requests per 1 hour per IP  
Prevents email spam

#### File Upload Endpoints

**Path**: Upload routes  
**Limit**: 20 requests per 1 hour per IP  
Prevents storage abuse

### Bypassing Rate Limits

Only **health check endpoints** bypass rate limiting:
- `GET /health`
- `GET /api/health`

### Production Considerations

For production with multiple servers, use **Redis** for distributed rate limiting:

```typescript
// Install: redis + rate-limit-redis
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

const limiter = rateLimit({
  store: new RedisStore({
    client,
    prefix: 'rl:',
  }),
  // ...
});
```

---

## Security Headers

### Helmet Configuration

Implemented via `helmet` middleware for comprehensive HTTP security headers.

#### Content Security Policy (CSP)

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Dev only
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}
```

**Production**: Remove `unsafe-inline` and `unsafe-eval`, use nonces.

#### HTTP Strict Transport Security (HSTS)

```typescript
hsts: {
  maxAge: 31536000,        // 1 year
  includeSubDomains: true,
  preload: true,
}
```

Forces HTTPS for all requests for 1 year.

#### Other Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Powered-By: (hidden)
```

---

## CORS Configuration

### Allowed Origins

```typescript
const allowedOrigins = [
  'http://localhost:3000',      // Local development
  'http://localhost:3001',      // Alternative port
  'http://localhost:5173',      // Vite dev server
  process.env.VITE_FRONTEND_URL,
  process.env.FRONTEND_URL,
];
```

### CORS Settings

```typescript
{
  origin: validateOrigin,      // Whitelist validation
  credentials: true,           // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Tenant-ID',
  ],
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset'
  ],
  maxAge: 86400,              // 24 hours preflight cache
}
```

### Development Mode

In development (`NODE_ENV=development`), all origins are allowed for convenience.

**Production**: Strictly enforce whitelist.

---

## IP Monitoring & Blocking

### Automatic Tracking

All requests are monitored for suspicious behavior:

```typescript
// Violations counted on:
- 403 Forbidden responses
- 429 Too Many Requests responses
```

### Progressive Blocking

```
1st violation → Logged
2nd violation → Logged
3rd violation → Logged
4th violation → Logged
5th violation → **BLOCKED**
```

### Blocked IP Behavior

- All requests immediately rejected with `403 Forbidden`
- Logged to security dashboard
- Admin can unblock via dashboard

### Suspicious Patterns Detected

- Known scanning tools (sqlmap, nikto, nmap, burp)
- Excessive failed authentications
- Rapid successive requests
- Large content-length (> 50MB)

### Storage

**Current**: In-memory (suitable for single-server)  
**Production**: Use Redis for distributed tracking

```typescript
// Admin functions
unblockIP(ip: string)           // Manually unblock
getBlockedIPs(): string[]       // List all blocked
getSuspiciousIPs(): Map         // Get violation counts
```

---

## Data Protection

### Database Security

#### Multi-Tenant Isolation

- **Row-Level Security (RLS)**: Every query filtered by `tenantId`
- **Shared database**: Single database with isolation
- **No cross-tenant access**: Enforced at application layer

```typescript
// Every query automatically includes
WHERE tenant_id = <current_tenant>
```

#### SQL Injection Prevention

- **Drizzle ORM**: Parameterized queries
- **No raw SQL**: (except where absolutely necessary)
- **Input validation**: Zod schemas

#### Encryption

- **At rest**: MySQL encryption at rest (configured at DB level)
- **In transit**: HTTPS/TLS for all connections
- **Sensitive fields**: Hashed passwords (bcrypt)

### LGPD Compliance

- **Data Subject Rights**: Export functionality
- **Audit trail**: All changes logged
- **Data retention**: Configurable retention policies
- **Consent management**: User consent tracking

---

## Security Best Practices

### For Developers

1. **Never commit secrets**
   - Use `.env` files (gitignored)
   - Use environment variables
   - Rotate secrets regularly

2. **Validate all inputs**
   ```typescript
   const schema = z.object({
     email: z.string().email(),
     age: z.number().min(0).max(120),
   });
   ```

3. **Use prepared statements**
   ```typescript
   // Good: Drizzle ORM
   await db.select().from(users).where(eq(users.id, id));
   
   // Bad: String concatenation
   await db.execute(`SELECT * FROM users WHERE id = '${id}'`);
   ```

4. **Implement proper error handling**
   ```typescript
   try {
     // ...
   } catch (error) {
     // Log full error server-side
     console.error(error);
     // Return generic error to client
     throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
   }
   ```

5. **Keep dependencies updated**
   ```bash
   pnpm audit
   pnpm update
   ```

### For Administrators

1. **Use strong passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols

2. **Enable 2FA** (when available)

3. **Review audit logs** regularly

4. **Monitor security dashboard**
   - Check blocked IPs
   - Review suspicious activity
   - Investigate anomalies

5. **Backup database** regularly
   ```bash
   # Daily automated backups
   pnpm docker:backup
   ```

6. **Update application** regularly
   - Security patches
   - Dependency updates

---

## Incident Response

### Suspected Breach

1. **Isolate**: Disconnect affected systems
2. **Assess**: Determine scope of breach
3. **Contain**: Prevent further damage
4. **Investigate**: Analyze logs and audit trail
5. **Remediate**: Fix vulnerabilities
6. **Notify**: Inform affected parties (LGPD requirement)
7. **Document**: Create incident report

### Security Incident Contacts

- **Security Team**: security@blackbelt.com.br
- **On-call**: +55 11 98765-4321 (24/7)

### Audit Logs

All actions logged to `audit_logs` table:
```sql
SELECT * FROM audit_logs 
WHERE action_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY action_timestamp DESC;
```

---

## Compliance

### LGPD (Lei Geral de Proteção de Dados)

- ✅ **Data minimization**: Collect only necessary data
- ✅ **Purpose limitation**: Use data only for stated purposes
- ✅ **Access rights**: Data subject can export/delete
- ✅ **Security**: Encryption and access controls
- ✅ **Breach notification**: Within 72 hours
- ✅ **DPO**: Designated privacy officer

### NR-01 Compliance

- ✅ **Risk assessment**: Complete COPSOQ-II implementation
- ✅ **Documentation**: Automated report generation
- ✅ **Audit trail**: All actions logged
- ✅ **Data integrity**: No tampering possible

### ISO 27001 Alignment

- ✅ **Access control**: RBAC + ABAC
- ✅ **Cryptography**: HTTPS/TLS
- ✅ **Logging**: Comprehensive audit logs
- ✅ **Incident management**: Response procedures
- ✅ **Business continuity**: Backup strategy

---

## Security Monitoring

### Real-time Dashboard

Access: `/security` (admin only)

**Metrics**:
- Total requests (24h)
- Blocked requests
- Rate limit hits
- Blocked IPs
- Suspicious IPs
- Auth failures

**Actions**:
- View security events
- Unblock IPs
- Monitor trends

### Log Analysis

```bash
# View recent security events
tail -f logs/security.log | grep WARNING

# Count blocked IPs
grep "BLOCKED" logs/security.log | wc -l

# Top suspicious IPs
grep "suspicious" logs/security.log | awk '{print $5}' | sort | uniq -c | sort -nr
```

---

## Production Security Checklist

- [ ] Enable HTTPS/TLS with valid certificate
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SESSION_SECRET` (32+ chars)
- [ ] Configure production CORS origins
- [ ] Enable Redis for distributed rate limiting
- [ ] Setup automated database backups
- [ ] Configure log aggregation (e.g., ELK stack)
- [ ] Enable monitoring (e.g., Datadog, New Relic)
- [ ] Setup alerts for security events
- [ ] Review and harden CSP directives
- [ ] Enable database encryption at rest
- [ ] Implement database connection pooling
- [ ] Configure firewall rules
- [ ] Disable unnecessary services
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Incident response plan documented
- [ ] Security team training

---

## Security Updates

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@blackbelt.com.br
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Assessment**: Within 72 hours
- **Fix**: Based on severity (critical: 24h, high: 7d, medium: 30d)
- **Disclosure**: After fix deployed

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [LGPD Guide](https://www.gov.br/governodigital/pt-br/seguranca-e-protecao-de-dados/lgpd)
- [NR-01 Portaria](https://www.gov.br/trabalho-e-emprego/pt-br)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Security is everyone's responsibility. Stay vigilant! 🔒**
