'use client';

import type { BlockProps } from './types';
import { asString } from './types';

export function NewsletterSignup({ props }: BlockProps) {
  const title = asString(props?.title, 'Stay in the loop');
  const description = asString(
    props?.description,
    'Get updates about new products.'
  );
  const buttonLabel = asString(props?.buttonLabel, 'Subscribe');

  return (
    <section className="sf-section" aria-labelledby="sf-newsletter-heading">
      <h2 id="sf-newsletter-heading" style={{ marginTop: 0 }}>
        {title}
      </h2>
      <p className="sf-muted">{description}</p>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-md)',
        }}
      >
        <label htmlFor="sf-newsletter-email" className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Email
        </label>
        <input
          id="sf-newsletter-email"
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          style={{
            flex: '1 1 12rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-muted)',
          }}
        />
        <button type="submit" className="sf-cta">
          {buttonLabel}
        </button>
      </form>
    </section>
  );
}
