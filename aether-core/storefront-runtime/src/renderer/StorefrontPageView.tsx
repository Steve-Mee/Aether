import { CartProvider } from '../cart/CartProvider';
import { StorefrontDataProvider } from '../context/StorefrontDataContext';
import type {
  StorefrontPage,
  StorefrontProduct,
  StorefrontSite,
} from '../sdk/storefrontClient';
import { tokensToCssVars } from '../tokens/applyTokens';
import { PageTreeRenderer } from './PageTreeRenderer';

export function StorefrontPageView({
  site,
  page,
  products,
  previewToken,
}: {
  site: StorefrontSite;
  page: StorefrontPage;
  products: StorefrontProduct[];
  previewToken?: string;
}) {
  const cssVars = tokensToCssVars(site.tokens);

  return (
    <StorefrontDataProvider
      value={{
        tenantSlug: site.slug,
        products,
        previewToken,
      }}
    >
      <CartProvider>
        <main className="sf-main" style={cssVars} data-revision={site.revisionId}>
          <PageTreeRenderer tree={page.treeJson} />
        </main>
      </CartProvider>
    </StorefrontDataProvider>
  );
}
