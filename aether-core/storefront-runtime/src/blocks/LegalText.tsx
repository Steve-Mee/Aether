import type { BlockProps } from './types';
import { asString } from './types';

export function LegalText({ props }: BlockProps) {
  const title = asString(props?.title, 'Legal');
  const body = asString(props?.body, asString(props?.text, ''));

  return (
    <section className="sf-section" aria-labelledby="sf-legal-heading">
      <h1 id="sf-legal-heading" style={{ marginTop: 0 }}>
        {title}
      </h1>
      <div className="sf-muted" style={{ whiteSpace: 'pre-wrap' }}>
        {body || 'Legal content coming soon.'}
      </div>
    </section>
  );
}
