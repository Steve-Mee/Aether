let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setRefreshAccessToken(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

export async function tryRefreshAccessToken(): Promise<string | null> {
  if (!refreshHandler) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}
