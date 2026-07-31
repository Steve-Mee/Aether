export default function Home() {
  return (
    <main className="sf-error">
      <h1>AETHER Storefront Runtime</h1>
      <p className="sf-muted">
        Live sites: <code>/{'{tenantSlug}'}</code>
        <br />
        Preview: <code>/preview/{'{revisionId}'}?token=…&amp;slug=…</code>
      </p>
    </main>
  );
}
