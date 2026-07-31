import {
  AllowlistCodegenCompilerStub,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_PLAN,
  APPENDIX_H_TOKENS,
} from '../infrastructure/codegen/AllowlistCodegenCompilerStub';
import { ALLOWLISTED_BLOCK_TYPE_SET } from '../infrastructure/codegen/allowlistedBlocks';

function collectBlockTypes(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: unknown; children?: unknown[] };
  if (typeof n.type === 'string') out.add(n.type);
  if (Array.isArray(n.children)) {
    for (const child of n.children) collectBlockTypes(child, out);
  }
}

describe('AllowlistCodegenCompilerStub (Appendix H)', () => {
  it('emits Appendix H home tree + tokens + plan page paths', async () => {
    const stub = new AllowlistCodegenCompilerStub();
    const result = await stub.compile({
      tenantId: 'tenant_a',
      revisionId: 'rev_h',
      briefJson: { brand: { name: 'Atelier Noord' } },
      planJson: {},
    });

    expect(result.tokensJson).toMatchObject({
      color: APPENDIX_H_TOKENS.color,
      font: APPENDIX_H_TOKENS.font,
      radius: APPENDIX_H_TOKENS.radius,
      primary: APPENDIX_H_TOKENS.color.primary,
      accent: APPENDIX_H_TOKENS.color.accent,
    });
    expect(result.pages.map((p) => p.path)).toEqual(APPENDIX_H_PLAN.pages.map((p) => p.path));

    const home = result.pages.find((p) => p.path === '/');
    expect(home?.treeJson).toMatchObject({
      type: 'Page',
      children: APPENDIX_H_HOME_TREE.children,
    });
  });

  it('rejects non-allowlisted block types in stub output (security contract)', async () => {
    const stub = new AllowlistCodegenCompilerStub();
    const result = await stub.compile({
      tenantId: 'tenant_a',
      revisionId: 'rev_h2',
      briefJson: {},
      planJson: {},
    });

    const types = new Set<string>();
    for (const page of result.pages) {
      collectBlockTypes(page.treeJson, types);
    }
    types.delete('Page'); // root wrapper only
    for (const type of types) {
      expect(ALLOWLISTED_BLOCK_TYPE_SET.has(type)).toBe(true);
    }
  });
});
