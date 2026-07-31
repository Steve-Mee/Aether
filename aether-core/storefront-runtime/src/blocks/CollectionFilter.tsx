import type { BlockProps } from './types';
import { asString, asStringArray } from './types';

export function CollectionFilter({ props }: BlockProps) {
  const title = asString(props?.title, 'Filter');
  const options = asStringArray(props?.options ?? props?.categories);

  return (
    <section className="sf-section" aria-labelledby="sf-filter-heading">
      <h2 id="sf-filter-heading" style={{ marginTop: 0, fontSize: '1.125rem' }}>
        {title}
      </h2>
      {options.length === 0 ? (
        <p className="sf-muted">No filters available.</p>
      ) : (
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-sm)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {options.map((option) => (
            <li key={option}>
              <a
                href={`?filter=${encodeURIComponent(option)}`}
                className="sf-muted"
                style={{ textDecoration: 'underline' }}
              >
                {option}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
