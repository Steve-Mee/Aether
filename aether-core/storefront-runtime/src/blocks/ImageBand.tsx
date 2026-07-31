import type { BlockProps } from './types';
import { asString } from './types';

export function ImageBand({ props }: BlockProps) {
  const src = asString(props?.src, asString(props?.imageUrl));
  const alt = asString(props?.alt, '');
  const caption = asString(props?.caption);

  if (!src) {
    return (
      <section className="sf-section sf-muted" role="status">
        Image unavailable
      </section>
    );
  }

  return (
    <figure className="sf-section" style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', borderRadius: 'var(--radius)' }}
      />
      {caption ? (
        <figcaption className="sf-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
