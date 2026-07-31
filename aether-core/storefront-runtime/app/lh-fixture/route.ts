/**
 * Static Lighthouse fixture — raw HTML, no React layout or client JS.
 * Serves Hero + product-list semantics for CI CWV gates without backend.
 */
export const dynamic = 'force-static';

const HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AETHER Lighthouse fixture</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#faf9f7}
    main{max-width:72rem;margin:0 auto;padding:1rem 1rem 2rem}
    h1{font-size:2rem;margin:0 0 .5rem;font-weight:700}
    h2{margin:1.5rem 0 .5rem;font-size:1.25rem;font-weight:600}
    .muted{color:#6b6b6b;margin:0}
    ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:1rem;list-style:none;padding:0;margin:1rem 0 0}
    li{padding:.75rem}
    .card{display:block;text-decoration:none;color:inherit}
    .thumb{display:block;aspect-ratio:1;width:100%;background:#c4a48440;border-radius:.5rem;margin:0 0 .5rem}
    .price{color:#6b6b6b;font-size:.875rem;margin-top:.25rem}
  </style>
</head>
<body>
  <main data-testid="lh-fixture">
    <section aria-labelledby="sf-hero-heading">
      <h1 id="sf-hero-heading">AETHER fixture</h1>
      <p class="muted">Lighthouse CWV gate — static product list</p>
    </section>
    <section aria-labelledby="sf-product-grid-heading">
      <h2 id="sf-product-grid-heading">Products</h2>
      <ul role="list">
        <li>
          <span class="card">
            <span class="thumb" aria-hidden="true"></span>
            <strong>Keramiek schaal</strong>
            <div class="price">EUR 42</div>
          </span>
        </li>
        <li>
          <span class="card">
            <span class="thumb" aria-hidden="true"></span>
            <strong>Espresso mok</strong>
            <div class="price">EUR 18</div>
          </span>
        </li>
        <li>
          <span class="card">
            <span class="thumb" aria-hidden="true"></span>
            <strong>Vaas mid</strong>
            <div class="price">EUR 65</div>
          </span>
        </li>
      </ul>
    </section>
  </main>
</body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
