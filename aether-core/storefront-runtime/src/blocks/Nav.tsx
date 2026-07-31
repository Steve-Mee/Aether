import type { BlockProps } from './types';
import { asString } from './types';

interface NavItem {
  label: string;
  href: string;
}

function parseItems(props?: Record<string, unknown>): NavItem[] {
  const raw = props?.items ?? props?.links;
  if (!Array.isArray(raw)) {
    return [
      { label: 'Home', href: '/' },
      { label: 'Shop', href: '/products' },
    ];
  }
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { label: item, href: '#' };
      }
      if (!item || typeof item !== 'object') return null;
      const label = (item as { label?: unknown; title?: unknown }).label ??
        (item as { title?: unknown }).title;
      const href = (item as { href?: unknown; path?: unknown }).href ??
        (item as { path?: unknown }).path;
      if (typeof label !== 'string') return null;
      return {
        label,
        href: typeof href === 'string' ? href : '#',
      };
    })
    .filter((x): x is NavItem => x !== null);
}

export function Nav({ props }: BlockProps) {
  const brand = asString(props?.brand, 'Store');
  const items = parseItems(props);

  return (
    <header>
      <nav className="sf-section" aria-label="Primary">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
          }}
        >
          <a
            href="/"
            style={{
              fontWeight: 700,
              textDecoration: 'none',
              color: 'var(--color-primary)',
            }}
          >
            {brand}
          </a>
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
            {items.map((item) => (
              <li key={`${item.label}-${item.href}`}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
