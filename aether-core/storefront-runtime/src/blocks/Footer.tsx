import type { BlockProps } from './types';
import { asString, asStringArray } from './types';

export function Footer({ props }: BlockProps) {
  // Appendix H uses `text`; older trees may use `brand` / `copyright`.
  const brand = asString(
    props?.text,
    asString(props?.brand, asString(props?.copyright, '© Store'))
  );
  const links = asStringArray(props?.links);

  return (
    <footer className="sf-section" role="contentinfo">
      <p style={{ margin: 0 }}>{brand}</p>
      {links.length > 0 ? (
        <nav aria-label="Footer">
          <ul
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--spacing-md)',
              listStyle: 'none',
              padding: 0,
              margin: 'var(--spacing-sm) 0 0',
            }}
          >
            {links.map((link, i) => (
              <li key={`${link}-${i}`}>
                <a href={link.startsWith('/') ? link : '#'}>{link}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </footer>
  );
}
