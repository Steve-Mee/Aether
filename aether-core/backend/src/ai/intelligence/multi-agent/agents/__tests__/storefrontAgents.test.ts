import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AgentRegistry } from '../../AgentRegistry';
import {
  DEFAULT_SPECIALIST_AGENTS,
  STORE_BUILDER_AGENT_KEY,
  DESIGN_AGENT_KEY,
  COPY_SEO_AGENT_KEY,
  STORE_QA_AGENT_KEY,
  STORE_BUILDER_SUPPORTED_INTENTS,
  storeBuilderAgentDefinition,
  designAgentDefinition,
  copySeoAgentDefinition,
  storeQaAgentDefinition,
  buildFallbackSitePlan,
  buildFallbackPageTree,
} from '../index';
import { resolveDelegationTarget } from '../../delegationConfig';
import { ALLOWLISTED_BLOCK_TYPE_SET } from '../../../../../modules/storefront-builder/infrastructure/codegen/allowlistedBlocks';
import { AllowlistCodegenCompiler } from '../../../../../modules/storefront-builder/infrastructure/codegen/AllowlistCodegenCompiler';
import { LocalFsArtifactStoreAdapter } from '../../../../../modules/storefront-builder/infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import { parseSitePlanOrThrow } from '../../../../../modules/storefront-builder/infrastructure/codegen/sitePlanSchema';
import { APPENDIX_H_PLAN } from '../../../../../modules/storefront-builder/infrastructure/codegen/appendixHFixtures';

describe('storefront agents registry', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
  });

  it('registers all four storefront specialists in DEFAULT_SPECIALIST_AGENTS', () => {
    const keys = DEFAULT_SPECIALIST_AGENTS.map((a) => a.agentKey);
    expect(keys).toContain(STORE_BUILDER_AGENT_KEY);
    expect(keys).toContain(DESIGN_AGENT_KEY);
    expect(keys).toContain(COPY_SEO_AGENT_KEY);
    expect(keys).toContain(STORE_QA_AGENT_KEY);
  });

  it('resolves STORE_* intents to store_builder', () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    for (const intent of STORE_BUILDER_SUPPORTED_INTENTS) {
      expect(registry.resolve(intent)?.agentKey).toBe(STORE_BUILDER_AGENT_KEY);
      expect(resolveDelegationTarget(intent)).toBe(STORE_BUILDER_AGENT_KEY);
    }
  });

  it('resolves DESIGN_PROPOSE / COPY_PROPOSE / STORE_QA intents', () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    expect(registry.resolve('DESIGN_PROPOSE')?.agentKey).toBe(DESIGN_AGENT_KEY);
    expect(registry.resolve('COPY_PROPOSE')?.agentKey).toBe(COPY_SEO_AGENT_KEY);
    expect(registry.resolve('STORE_QA')?.agentKey).toBe(STORE_QA_AGENT_KEY);
  });

  it('routes storefront keywords to store_builder', () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    expect(registry.resolve('UNKNOWN', 'bouw een webshop voor mijn merk')?.agentKey).toBe(
      STORE_BUILDER_AGENT_KEY
    );
    expect(registry.resolve('UNKNOWN', 'publish storefront live')?.agentKey).toBe(
      STORE_BUILDER_AGENT_KEY
    );
  });

  it('enforces tool allowlists per agent', () => {
    expect(storeBuilderAgentDefinition.allowedTools).toEqual(
      expect.arrayContaining([
        'createSiteProject',
        'createRevisionFromBrief',
        'runBuild',
        'proposePublish',
        'delegateToAgent',
      ])
    );
    expect(storeBuilderAgentDefinition.allowedTools).not.toContain('deploy');
    expect(designAgentDefinition.allowedTools).toEqual(
      expect.arrayContaining(['proposeLayout', 'proposeTokens', 'proposePageTree'])
    );
    expect(copySeoAgentDefinition.allowedTools).toEqual(
      expect.arrayContaining(['proposeCopy', 'proposeMeta', 'localize'])
    );
    expect(storeQaAgentDefinition.allowedTools).toEqual(
      expect.arrayContaining(['runBuildChecks', 'runLighthouse', 'diffRevisions'])
    );
  });

  it('store_builder can delegate to design, copy_seo, store_qa', () => {
    expect(storeBuilderAgentDefinition.canDelegateTo).toEqual(
      expect.arrayContaining(['design', 'copy_seo', 'store_qa'])
    );
  });
});

describe('storefrontPlanFallback', () => {
  it('produces valid allowlisted SitePlan without LLM', () => {
    const plan = buildFallbackSitePlan({ brand: { name: 'Acme Tea' } });
    expect(() => parseSitePlanOrThrow(plan)).not.toThrow();
    expect(plan.pages.length).toBeGreaterThan(0);
    for (const page of plan.pages) {
      expect(page.tree.type).toBe('Page');
      for (const child of page.tree.children ?? []) {
        expect(ALLOWLISTED_BLOCK_TYPE_SET.has(child.type)).toBe(true);
      }
    }
  });

  it('fallback page tree roots at Page with allowlisted children', () => {
    const tree = buildFallbackPageTree({ brand: { name: 'Nova' } }, '/');
    expect(tree.type).toBe('Page');
    expect(tree.children?.every((c) => ALLOWLISTED_BLOCK_TYPE_SET.has(c.type))).toBe(true);
  });

  it('fallback SitePlan matches Appendix H page paths and passes AllowlistCodegenCompiler', async () => {
    const brief = { brand: { name: 'Atelier Noord' } };
    const plan = buildFallbackSitePlan(brief);
    const expectedPaths = APPENDIX_H_PLAN.pages.map((p) => p.path);
    expect(plan.pages.map((p) => p.path)).toEqual(expectedPaths);

    const home = plan.pages.find((p) => p.path === '/');
    expect(home?.tree.children?.map((c) => c.type)).toEqual([
      'Nav',
      'Hero',
      'ProductGrid',
      'FAQ',
      'Footer',
    ]);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-p06-fallback-'));
    try {
      const compiler = new AllowlistCodegenCompiler(new LocalFsArtifactStoreAdapter(tmpDir));
      const validated = compiler.validate({ briefJson: brief, planJson: plan });
      expect(validated.pages.length).toBe(APPENDIX_H_PLAN.pages.length);

      const compiled = await compiler.compile({
        tenantId: 'tenant_p06',
        revisionId: 'rev_fallback',
        briefJson: brief,
        planJson: plan,
      });
      expect(compiled.pages.length).toBeGreaterThan(0);
      expect(compiled.artifactsPath).toContain('rev_fallback');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects non-allowlisted block types (no agent may emit them)', () => {
    expect(() =>
      parseSitePlanOrThrow({
        version: 1,
        localeDefault: 'nl-NL',
        locales: ['nl-NL'],
        brand: { name: 'Evil' },
        pages: [
          {
            path: '/',
            title: 'Home',
            tree: { type: 'Page', children: [{ type: 'CustomEvilBlock', props: {} }] },
          },
        ],
      })
    ).toThrow(/SitePlan validation failed|Unknown or disallowed block type/i);
  });
});
