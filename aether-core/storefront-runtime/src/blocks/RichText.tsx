import type { BlockProps } from './types';
import { asString } from './types';

export function RichText({ props }: BlockProps) {
  const body = asString(props?.body, asString(props?.html, ''));
  const title = asString(props?.title);

  return (
    <section className="sf-section" aria-label={title || 'Content'}>
      {title ? <h2 style={{ marginTop: 0 }}>{title}</h2> : null}
      <div style={{ whiteSpace: 'pre-wrap' }}>{body}</div>
    </section>
  );
}
