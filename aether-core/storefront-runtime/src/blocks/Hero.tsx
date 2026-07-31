import type { BlockProps } from './types';
import { asString } from './types';

export function Hero({ props }: BlockProps) {
  const headline = asString(props?.headline, 'Welcome');
  const subheadline = asString(props?.subheadline);
  const ctaLabel = asString(props?.ctaLabel);
  const ctaHref = asString(props?.ctaHref, '/products');
  const imageUrl = asString(props?.imageUrl);

  return (
    <section className="sf-section" aria-labelledby="sf-hero-heading">
      {imageUrl ? (
        // Decorative/supporting brand image from allowlisted props only
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" style={{ width: '100%', marginBottom: 'var(--spacing-md)' }} />
      ) : null}
      <h1 id="sf-hero-heading" style={{ fontSize: '2.5rem', margin: '0 0 var(--spacing-sm)' }}>
        {headline}
      </h1>
      {subheadline ? <p className="sf-muted">{subheadline}</p> : null}
      {ctaLabel ? (
        <p style={{ marginTop: 'var(--spacing-md)' }}>
          <a className="sf-cta" href={ctaHref}>
            {ctaLabel}
          </a>
        </p>
      ) : null}
    </section>
  );
}
