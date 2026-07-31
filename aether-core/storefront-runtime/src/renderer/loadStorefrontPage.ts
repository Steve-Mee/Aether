import {
  storefrontClient,
  StorefrontApiError,
  type StorefrontPage,
  type StorefrontProduct,
  type StorefrontSite,
} from '../sdk/storefrontClient';

export type LoadResult =
  | {
      ok: true;
      site: StorefrontSite;
      page: StorefrontPage;
      products: StorefrontProduct[];
    }
  | {
      ok: false;
      status: number;
      message: string;
      code?: string;
    };

export function pathFromSegments(segments?: string[]): string {
  if (!segments || segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

export async function loadStorefrontPage(input: {
  tenantSlug: string;
  path: string;
  previewToken?: string;
}): Promise<LoadResult> {
  try {
    const site = await storefrontClient.resolveSite(
      input.tenantSlug,
      input.previewToken
    );
    const page = await storefrontClient.getPage(
      input.tenantSlug,
      input.path,
      input.previewToken
    );

    let products: StorefrontProduct[] = [];
    try {
      const catalog = await storefrontClient.getCatalog(input.tenantSlug, {
        limit: 24,
      });
      products = catalog.products;
    } catch {
      // Catalog is optional for page render (blocks show empty state)
      products = [];
    }

    return { ok: true, site, page, products };
  } catch (err) {
    if (err instanceof StorefrontApiError) {
      return {
        ok: false,
        status: err.status,
        message: err.message,
        code: err.code,
      };
    }
    return {
      ok: false,
      status: 500,
      message: err instanceof Error ? err.message : 'Failed to load storefront',
    };
  }
}
