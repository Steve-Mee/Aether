import type { BlockProps } from './types';

export function UnknownBlock({ props, node }: BlockProps) {
  const type =
    (typeof props?.__type === 'string' && props.__type) ||
    node?.type ||
    'Unknown';

  return (
    <aside className="sf-unknown sf-section" role="status">
      Unsupported block: {type}
    </aside>
  );
}
