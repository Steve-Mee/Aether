import type { BlockProps } from './types';
import { asString, asStringArray } from './types';

export function TrustBadges({ props }: BlockProps) {
  const title = asString(props?.title, 'Why shop with us');
  const badges = asStringArray(props?.badges ?? props?.items);

  const items =
    badges.length > 0
      ? badges
      : ['Secure checkout', 'Fast shipping', 'Easy returns'];

  return (
    <section className="sf-section" aria-labelledby="sf-trust-heading">
      <h2 id="sf-trust-heading" style={{ marginTop: 0, fontSize: '1.125rem' }}>
        {title}
      </h2>
      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-md)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {items.map((badge) => (
          <li key={badge} className="sf-muted">
            {badge}
          </li>
        ))}
      </ul>
    </section>
  );
}
