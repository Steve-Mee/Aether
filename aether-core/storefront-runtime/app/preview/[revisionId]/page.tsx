import { ErrorView } from '@/renderer/ErrorView';
import { loadStorefrontPage } from '@/renderer/loadStorefrontPage';
import { StorefrontPageView } from '@/renderer/StorefrontPageView';

export const dynamic = 'force-dynamic';

export default async function PreviewStorefrontPage({
  params,
  searchParams,
}: {
  params: { revisionId: string };
  searchParams: { token?: string; slug?: string; path?: string };
}) {
  const token = searchParams.token?.trim();
  const slug = searchParams.slug?.trim();
  const path =
    typeof searchParams.path === 'string' && searchParams.path.length > 0
      ? searchParams.path.startsWith('/')
        ? searchParams.path
        : `/${searchParams.path}`
      : '/';

  if (!token || !slug) {
    return (
      <ErrorView
        title="Preview unavailable"
        message="Preview requires query params token and slug (tenant public slug)."
      />
    );
  }

  const result = await loadStorefrontPage({
    tenantSlug: slug,
    path,
    previewToken: token,
  });

  if (!result.ok) {
    const title =
      result.status === 404
        ? 'Preview page not found'
        : result.status === 401
          ? 'Invalid or expired preview token'
          : 'Preview failed';
    return <ErrorView title={title} message={result.message} />;
  }

  if (result.site.revisionId !== params.revisionId) {
    return (
      <ErrorView
        title="Revision mismatch"
        message="Preview token does not match the requested revision."
      />
    );
  }

  return (
    <StorefrontPageView
      site={result.site}
      page={result.page}
      products={result.products}
      previewToken={token}
    />
  );
}
