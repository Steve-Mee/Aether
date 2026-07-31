import { ErrorView } from '@/renderer/ErrorView';
import { loadStorefrontPage, pathFromSegments } from '@/renderer/loadStorefrontPage';
import { StorefrontPageView } from '@/renderer/StorefrontPageView';

export const dynamic = 'force-dynamic';

export default async function LiveStorefrontPage({
  params,
}: {
  params: { tenantSlug: string; path?: string[] };
}) {
  const path = pathFromSegments(params.path);
  const result = await loadStorefrontPage({
    tenantSlug: params.tenantSlug,
    path,
  });

  if (!result.ok) {
    const title =
      result.status === 404
        ? 'Page not found'
        : result.status === 401
          ? 'Unauthorized'
          : 'Something went wrong';
    return <ErrorView title={title} message={result.message} />;
  }

  return (
    <StorefrontPageView
      site={result.site}
      page={result.page}
      products={result.products}
    />
  );
}
