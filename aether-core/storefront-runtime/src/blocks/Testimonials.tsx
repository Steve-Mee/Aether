import type { BlockProps } from './types';
import { asString } from './types';

interface Testimonial {
  quote: string;
  author: string;
}

function parseItems(props?: Record<string, unknown>): Testimonial[] {
  const raw = props?.items ?? props?.testimonials;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const quote = (item as { quote?: unknown; text?: unknown }).quote ??
        (item as { text?: unknown }).text;
      const author = (item as { author?: unknown; name?: unknown }).author ??
        (item as { name?: unknown }).name;
      if (typeof quote !== 'string') return null;
      return {
        quote,
        author: typeof author === 'string' ? author : '',
      };
    })
    .filter((x): x is Testimonial => x !== null);
}

export function Testimonials({ props }: BlockProps) {
  const title = asString(props?.title, 'What customers say');
  const items = parseItems(props);

  return (
    <section className="sf-section" aria-labelledby="sf-testimonials-heading">
      <h2 id="sf-testimonials-heading" style={{ marginTop: 0 }}>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="sf-muted">No testimonials yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 'var(--spacing-md)' }}>
              <blockquote style={{ margin: 0 }}>
                <p>“{item.quote}”</p>
                {item.author ? (
                  <footer className="sf-muted">— {item.author}</footer>
                ) : null}
              </blockquote>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
