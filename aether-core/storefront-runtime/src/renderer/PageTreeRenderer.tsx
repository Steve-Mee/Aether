import type { ReactNode } from 'react';
import type { PageTreeNode } from '../sdk/storefrontClient';
import { resolveBlock } from '../blocks/registry';

export interface PageTreeRendererProps {
  tree: PageTreeNode | null | undefined;
}

function renderNode(node: PageTreeNode, key: string): ReactNode {
  if (!node || typeof node.type !== 'string') {
    return null;
  }

  if (node.type === 'Page') {
    return (
      <div key={key} data-page-root>
        {(node.children ?? []).map((child, index) =>
          renderNode(child, `${key}.${index}`)
        )}
      </div>
    );
  }

  const Block = resolveBlock(node.type);
  const childNodes = (node.children ?? []).map((child, index) =>
    renderNode(child, `${key}.${index}`)
  );

  // __type helps UnknownBlock show the original block name
  const props = { ...(node.props ?? {}), __type: node.type };

  return (
    <Block key={key} props={props} node={node}>
      {childNodes.length > 0 ? childNodes : undefined}
    </Block>
  );
}

/**
 * Renders an allowlisted PageTree. Unknown block types render a safe fallback.
 * Does not execute merchant code.
 */
export function PageTreeRenderer({ tree }: PageTreeRendererProps) {
  if (!tree) {
    return (
      <p className="sf-muted sf-section" role="status">
        Empty page
      </p>
    );
  }

  return <>{renderNode(tree, 'root')}</>;
}
