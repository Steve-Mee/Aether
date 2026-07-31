import type { BlockProps } from './types';
import { asString } from './types';

interface FaqItem {
  question: string;
  answer: string;
}

function parseItems(props?: Record<string, unknown>): FaqItem[] {
  const raw = props?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const q = (item as { question?: unknown; q?: unknown }).question ??
        (item as { q?: unknown }).q;
      const a = (item as { answer?: unknown; a?: unknown }).answer ??
        (item as { a?: unknown }).a;
      if (typeof q !== 'string' || typeof a !== 'string') return null;
      return { question: q, answer: a };
    })
    .filter((x): x is FaqItem => x !== null);
}

export function FAQ({ props }: BlockProps) {
  const title = asString(props?.title, 'FAQ');
  const items = parseItems(props);

  return (
    <section className="sf-section" aria-labelledby="sf-faq-heading">
      <h2 id="sf-faq-heading" style={{ marginTop: 0 }}>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="sf-muted">No questions yet.</p>
      ) : (
        <div>
          {items.map((item, i) => (
            <details key={i} style={{ marginBottom: 'var(--spacing-sm)' }}>
              <summary>{item.question}</summary>
              <p className="sf-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
