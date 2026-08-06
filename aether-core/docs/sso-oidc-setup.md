# SSO OIDC Setup Guide — AETHER

Enterprise SSO via OpenID Connect (OIDC) for AETHER self-hosted deployments.

## Overview

AETHER supports OIDC-based Single Sign-On (SSO) for enterprise deployments. This allows users to authenticate using their organization's identity provider (IdP) such as:

- **Okta**
- **Auth0**
- **Azure AD / Microsoft Entra ID**
- **Google Workspace**
- **Keycloak** (self-hosted)
- Any OIDC-compliant provider

## Architecture

```
User → Frontend → Backend /api/auth/oidc/login
                ↓
        OIDC Provider (IdP)
                ↓
        Backend /api/auth/oidc/callback
                ↓
        Create/Find User → Issue JWT → Frontend
```

### Key Features

- **Auto-provisioning**: Users authenticated via OIDC are automatically created in AETHER
- **Role mapping**: Default role is `operator` (can be customized)
- **Multi-tenant**: OIDC works with AETHER's tenant isolation
- **Coexistence**: Password-based auth continues to work alongside OIDC
- **No passwords**: OIDC users don't have local password hashes

## Configuration

### 1. Environment Variables

Add to `.env`:

```bash
# Enable OIDC SSO
SSO_OIDC_ENABLED=true

# OIDC Provider Configuration
SSO_OIDC_ISSUER=https://your-idp.example.com
SSO_OIDC_CLIENT_ID=aether-client-id
SSO_OIDC_CLIENT_SECRET=your-client-secret
SSO_OIDC_REDIRECT_URI=http://localhost:9000/api/auth/oidc/callback

# Frontend callback (for post-auth redirect)
VITE_API_URL=http://localhost:9000
```

### 2. Provider-Specific Setup

#### Okta

1. **Create Application**:
   - Sign in to Okta Admin Console
   - Applications → Create App Integration
   - Choose "OIDC - OpenID Connect"
   - Choose "Web Application"

2. **Configure**:
   - **App integration name**: AETHER
   - **Sign-in redirect URIs**: `http://localhost:9000/api/auth/oidc/callback` (adjust for production)
   - **Sign-out redirect URIs**: `http://localhost:5173`
   - **Controlled access**: Choose appropriate group assignments

3. **Get Credentials**:
   - Copy **Client ID** → `SSO_OIDC_CLIENT_ID`
   - Copy **Client secret** → `SSO_OIDC_CLIENT_SECRET`
   - Issuer: `https://{yourOktaDomain}/oauth2/default` → `SSO_OIDC_ISSUER`

#### Auth0

1. **Create Application**:
   - Sign in to Auth0 Dashboard
   - Applications → Create Application
   - Choose "Regular Web Applications"

2. **Configure**:
   - **Allowed Callback URLs**: `http://localhost:9000/api/auth/oidc/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`

3. **Get Credentials**:
   - Copy **Client ID** → `SSO_OIDC_CLIENT_ID`
   - Copy **Client Secret** → `SSO_OIDC_CLIENT_SECRET`
   - Domain: `https://{yourDomain}.auth0.com` → `SSO_OIDC_ISSUER`

#### Azure AD / Microsoft Entra ID

1. **Register Application**:
   - Sign in to Azure Portal
   - Azure Active Directory → App registrations → New registration
   - Name: AETHER
   - Redirect URI: `http://localhost:9000/api/auth/oidc/callback`

2. **Configure**:
   - Authentication → Platform configurations → Web
   - Add redirect URI if not done in step 1
   - Implicit grant: Select "ID tokens"

3. **Create Client Secret**:
   - Certificates & secrets → New client secret
   - Copy secret value → `SSO_OIDC_CLIENT_SECRET`

4. **Get Credentials**:
   - Overview → **Application (client) ID** → `SSO_OIDC_CLIENT_ID`
   - Overview → **Directory (tenant) ID** → use in issuer
   - Issuer: `https://login.microsoftonline.com/{tenantId}/v2.0` → `SSO_OIDC_ISSUER`

#### Google Workspace

1. **Create OAuth Client**:
   - Google Cloud Console → APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:9000/api/auth/oidc/callback`

2. **Get Credentials**:
   - Copy **Client ID** → `SSO_OIDC_CLIENT_ID`
   - Copy **Client secret** → `SSO_OIDC_CLIENT_SECRET`
   - Issuer: `https://accounts.google.com` → `SSO_OIDC_ISSUER`

#### Keycloak (Self-Hosted)

1. **Create Client**:
   - Sign in to Keycloak Admin Console
   - Clients → Create
   - Client ID: `aether`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`

2. **Configure**:
   - Valid Redirect URIs: `http://localhost:9000/api/auth/oidc/callback`
   - Base URL: `http://localhost:5173`

3. **Get Credentials**:
   - Credentials tab → Copy **Secret** → `SSO_OIDC_CLIENT_SECRET`
   - Client ID: `aether` → `SSO_OIDC_CLIENT_ID`
   - Issuer: `http://keycloak.example.com/realms/{realmName}` → `SSO_OIDC_ISSUER`

## User Flow

### First-Time Login

1. User clicks "Sign in with SSO" on frontend
2. Frontend redirects to `/api/auth/oidc/login`
3. Backend redirects to IdP login page
4. User authenticates with IdP
5. IdP redirects to `/api/auth/oidc/callback` with code
6. Backend exchanges code for tokens, retrieves user info
7. Backend creates user in AETHER (if not exists) with default role
8. Backend issues JWT and refresh token
9. Backend redirects to frontend with token
10. Frontend stores token and loads dashboard

### Subsequent Logins

Same flow, but user is found (not created) at step 7.

## Role Mapping

By default, OIDC users are created with `operator` role. To customize:

### Option 1: Manual Role Assignment

After first login, admin can change role:

```sql
UPDATE "User" 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

### Option 2: Claim-Based Mapping (Custom)

Extend `OidcController.callback` to map IdP claims to roles:

```typescript
// In OidcController.callback, after exchanging code:
let role: UserRole = 'operator'; // default

// Example: Map Azure AD groups to roles
if (userInfo.groups?.includes('AETHER-Admins')) {
  role = 'admin';
} else if (userInfo.groups?.includes('AETHER-Viewers')) {
  role = 'viewer';
}

// Use `role` when creating user
```

## Multi-Tenant Considerations

OIDC respects AETHER's tenant isolation:

- Tenant is determined by query parameter or default: `?tenantId=tenant_acme`
- User is scoped to tenant: `(tenantId, email)` unique constraint
- Same email can exist in multiple tenants with different roles

**Production recommendation**: Bind specific IdP configurations to tenants in database rather than global env vars.

## Security Considerations

### 1. State & Nonce Validation

AETHER validates `state` and `nonce` to prevent CSRF and replay attacks.

### 2. Session Storage

OIDC login state (`state`, `nonce`, `codeVerifier`) is stored in **Redis** when `REDIS_URL` is set, with a 10-minute TTL (`oidc:session:{state}`). If Redis is unavailable or not configured, the backend falls back to an in-memory map and logs a warning — suitable for local dev only; production should always use Redis so sessions survive restarts and work across replicas.

### 3. Access Token Cookie (SPA Tradeoff)

After OIDC callback, the backend sets two cookies:

| Cookie | httpOnly | Purpose |
|--------|----------|---------|
| Refresh token (`/api/auth` path) | **Yes** | Long-lived session renewal; never exposed to JavaScript |
| `aether_access_token` (bridge) | **No** | Short-lived handoff read once by `OidcCallbackPage`, then copied to `localStorage` and cleared |

**Why not httpOnly for the access token?** The SPA stores the JWT in `localStorage` and sends it via `Authorization: Bearer` on API calls. OIDC completes on the backend domain; the frontend must read the bridge cookie once to seed that store. Making it httpOnly would require a different auth model (e.g. cookie-only API with CSRF protection on every request).

**Refresh token remains httpOnly** — the SPA can recover sessions via `POST /api/auth/refresh` without ever touching the refresh token in JavaScript.

**Hardening options (future):** Move to httpOnly session cookies with a BFF proxy, or return the access token via a one-time authorization code exchanged server-side by the SPA.

### 4. HTTPS Required in Production

Always use HTTPS for:
- `SSO_OIDC_REDIRECT_URI`
- Frontend URLs
- IdP communication

### 5. Client Secret Protection

Never commit `SSO_OIDC_CLIENT_SECRET` to version control. Use:
- Environment variables
- Secret management (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)

## Testing

### Local Testing with Mock IdP

Use Keycloak locally:

```bash
docker run -d \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

Configure AETHER:

```bash
SSO_OIDC_ENABLED=true
SSO_OIDC_ISSUER=http://localhost:8080/realms/master
SSO_OIDC_CLIENT_ID=aether
SSO_OIDC_CLIENT_SECRET=<secret-from-keycloak>
SSO_OIDC_REDIRECT_URI=http://localhost:9000/api/auth/oidc/callback
```

### Test Flow

1. Start AETHER: `docker-compose up`
2. Navigate to frontend: http://localhost:5173
3. Click "Sign in with SSO"
4. Should redirect to IdP
5. Enter credentials
6. Should redirect back to AETHER dashboard

### Verify in Logs

Backend logs should show:

```
OIDC login initiated for tenant: tenant_default
OIDC callback received with code
User created/found: user@example.com
Access token issued
```

## Troubleshooting

### Error: "OIDC not configured"

- Verify `SSO_OIDC_ENABLED=true`
- Verify `SSO_OIDC_ISSUER`, `SSO_OIDC_CLIENT_ID`, `SSO_OIDC_CLIENT_SECRET` are set
- Restart backend: `docker-compose restart backend`

### Error: "Invalid or expired state"

- Session expired (>10 minutes) — retry login
- Server restarted (in-memory sessions lost) — implement Redis sessions
- Check browser cookies not blocked

### Error: "OIDC userinfo missing required fields"

- IdP not returning `email` claim
- Configure IdP to include `email` in ID token / userinfo endpoint
- Some IdPs require explicit scope request (already included: `openid email profile`)

### User Not Auto-Provisioned

- Check database for existing user with same email in different tenant
- Check backend logs for errors during user creation
- Verify `tenantId` is correctly determined from query param or default

### Redirect Loop

- Verify `SSO_OIDC_REDIRECT_URI` matches IdP configuration exactly
- Check for trailing slashes (should match)
- Ensure `VITE_API_URL` is correct for frontend callback

## Production Deployment

### 1. Use Production URLs

```bash
SSO_OIDC_REDIRECT_URI=https://aether.example.com/api/auth/oidc/callback
VITE_API_URL=https://aether.example.com
```

### 2. Enable HTTPS

- Use reverse proxy (nginx, Caddy) with TLS
- Obtain certificate (Let's Encrypt, commercial CA)
- Update IdP redirect URIs to use `https://`

### 3. Implement Redis Session Store

Redis-backed OIDC sessions are built in (`OidcSessionStore`). Ensure production sets:

```bash
REDIS_URL=redis://your-redis-host:6379
```

Sessions use key `oidc:session:{state}` with 600s TTL. No additional code changes required.

### 4. Configure Tenant-Specific IdPs

For multi-tenant SaaS, store IdP config per tenant:

```typescript
// Fetch tenant-specific OIDC config from database
const tenantOidcConfig = await prisma.tenantOidcConfig.findUnique({
  where: { tenantId }
});

// Use tenant config instead of global env vars
```

### 5. Add Monitoring

Log SSO events to audit trail:

```typescript
await prisma.auditLog.create({
  data: {
    tenantId,
    userId: user.id,
    action: 'sso.login',
    details: { provider: 'oidc', email: userInfo.email },
  }
});
```

## Disabling Password Auth (Optional)

To enforce SSO-only authentication:

1. Set environment variable:
   ```bash
   SSO_ENFORCE_ONLY=true
   ```

2. Update `AuthController.login` to reject password logins:
   ```typescript
   if (process.env.SSO_ENFORCE_ONLY === 'true') {
     return res.status(403).json({ error: 'Password authentication disabled. Use SSO.' });
   }
   ```

3. Hide password login form in frontend

## SAML Support (Future)

OIDC is the primary SSO method. For SAML support:

- Add `passport-saml` package
- Create `SamlController` similar to `OidcController`
- Add routes `/api/auth/saml/login` and `/api/auth/saml/callback`
- Configure behind `SSO_SAML_ENABLED` flag

## Related Documentation

- `observability-runbook.md` — Monitor SSO login failures
- `backup-restore-runbook.md` — Backup includes User table with SSO users
- Backend `src/shared/auth/oidcService.ts` — OIDC implementation
- Frontend `src/lib/auth/` — Frontend SSO integration

## Support

For SSO setup assistance:
1. Verify IdP configuration matches this guide
2. Check backend logs for specific errors
3. Test with mock IdP (Keycloak) first
4. Consult IdP documentation for provider-specific quirks
