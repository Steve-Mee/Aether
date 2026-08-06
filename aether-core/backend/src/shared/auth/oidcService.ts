import { randomBytes } from 'crypto';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OidcUserInfo {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
}

export interface OidcAuthRequest {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OidcConfiguration = any;

let cachedConfig: OidcConfiguration | null = null;

export function isOidcEnabled(): boolean {
  return process.env.SSO_OIDC_ENABLED === 'true';
}

export function getOidcConfig(): OidcConfig {
  const issuer = process.env.SSO_OIDC_ISSUER;
  const clientId = process.env.SSO_OIDC_CLIENT_ID;
  const clientSecret = process.env.SSO_OIDC_CLIENT_SECRET;
  const redirectUri =
    process.env.SSO_OIDC_REDIRECT_URI ?? 'http://localhost:9000/api/auth/oidc/callback';

  if (!issuer || !clientId || !clientSecret) {
    throw new Error(
      'OIDC not configured: SSO_OIDC_ISSUER, SSO_OIDC_CLIENT_ID, SSO_OIDC_CLIENT_SECRET required'
    );
  }

  return { issuer, clientId, clientSecret, redirectUri };
}

async function loadOpenIdClient() {
  return import('openid-client');
}

export async function getOidcConfiguration(): Promise<OidcConfiguration> {
  if (cachedConfig) return cachedConfig;

  const oidc = await loadOpenIdClient();
  const config = getOidcConfig();
  cachedConfig = await oidc.discovery(
    new URL(config.issuer),
    config.clientId,
    config.clientSecret
  );
  return cachedConfig;
}

/** @internal test helper */
export function clearOidcConfigurationCache(): void {
  cachedConfig = null;
}

export async function createOidcAuthRequest(): Promise<OidcAuthRequest> {
  const oidc = await loadOpenIdClient();
  const oidcConfig = getOidcConfig();
  const configuration = await getOidcConfiguration();

  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  const redirectTo = oidc.buildAuthorizationUrl(configuration, {
    redirect_uri: oidcConfig.redirectUri,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return {
    authorizationUrl: redirectTo.href,
    state,
    nonce,
    codeVerifier,
  };
}

export async function exchangeOidcCode(
  currentUrl: URL,
  expected: { state: string; nonce: string; codeVerifier: string }
): Promise<{ accessToken?: string; userInfo: OidcUserInfo }> {
  const oidc = await loadOpenIdClient();
  const configuration = await getOidcConfiguration();

  const tokens = await oidc.authorizationCodeGrant(configuration, currentUrl, {
    pkceCodeVerifier: expected.codeVerifier,
    expectedState: expected.state,
    expectedNonce: expected.nonce,
  });

  const claimsRaw = tokens.claims;
  const claimBag =
    typeof claimsRaw === 'function'
      ? claimsRaw()
      : claimsRaw && typeof claimsRaw === 'object'
        ? claimsRaw
        : undefined;

  let sub = typeof claimBag?.sub === 'string' ? claimBag.sub : undefined;
  let email = typeof claimBag?.email === 'string' ? claimBag.email : undefined;
  let name = typeof claimBag?.name === 'string' ? claimBag.name : undefined;
  let preferredUsername =
    typeof claimBag?.preferred_username === 'string' ? claimBag.preferred_username : undefined;

  if ((!sub || !email) && tokens.access_token) {
    const userInfo = await oidc.fetchUserInfo(
      configuration,
      tokens.access_token,
      sub ?? cryptoRandomSubjectPlaceholder()
    );
    sub = sub ?? userInfo.sub;
    email = email ?? (typeof userInfo.email === 'string' ? userInfo.email : undefined);
    name = name ?? (typeof userInfo.name === 'string' ? userInfo.name : undefined);
    preferredUsername =
      preferredUsername ??
      (typeof userInfo.preferred_username === 'string' ? userInfo.preferred_username : undefined);
  }

  if (!sub || !email) {
    throw new Error('OIDC userinfo missing required fields (sub, email)');
  }

  return {
    accessToken: tokens.access_token,
    userInfo: {
      sub,
      email,
      name,
      preferred_username: preferredUsername,
    },
  };
}

function cryptoRandomSubjectPlaceholder(): string {
  return randomBytes(16).toString('base64url');
}

export function generateStateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateNonce(): string {
  return randomBytes(32).toString('base64url');
}
