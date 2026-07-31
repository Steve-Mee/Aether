'use client';

import type { BlockProps } from './types';
import { asString } from './types';

export function ContactForm({ props }: BlockProps) {
  const title = asString(props?.title, 'Contact');
  const submitLabel = asString(props?.submitLabel, 'Send');

  return (
    <section className="sf-section" aria-labelledby="sf-contact-heading">
      <h2 id="sf-contact-heading" style={{ marginTop: 0 }}>
        {title}
      </h2>
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{
          display: 'grid',
          gap: 'var(--spacing-md)',
          maxWidth: '28rem',
        }}
      >
        <div>
          <label htmlFor="sf-contact-name">Name</label>
          <input
            id="sf-contact-name"
            name="name"
            required
            autoComplete="name"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-muted)',
              marginTop: '0.25rem',
            }}
          />
        </div>
        <div>
          <label htmlFor="sf-contact-email">Email</label>
          <input
            id="sf-contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-muted)',
              marginTop: '0.25rem',
            }}
          />
        </div>
        <div>
          <label htmlFor="sf-contact-message">Message</label>
          <textarea
            id="sf-contact-message"
            name="message"
            required
            rows={4}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-muted)',
              marginTop: '0.25rem',
            }}
          />
        </div>
        <button type="submit" className="sf-cta">
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
