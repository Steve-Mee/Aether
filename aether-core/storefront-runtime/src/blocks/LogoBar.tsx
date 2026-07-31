import type { BlockProps } from './types';
import { asString, asStringArray } from './types';

export function LogoBar({ props }: BlockProps) {
  const title = asString(props?.title, 'As seen in');
  const logos = asStringArray(props?.logos);
  const names = asStringArray(props?.names);

  const items =
    logos.length > 0
      ? logos
      : names.length > 0
        ? names
        : ['Partner'];

  return (
    <section className="sf-section" aria-label={title}>
      <p className="sf-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>
        {title}
      </p>
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
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="sf-muted">
            {item.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item} alt="" height={32} />
            ) : (
              item
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
