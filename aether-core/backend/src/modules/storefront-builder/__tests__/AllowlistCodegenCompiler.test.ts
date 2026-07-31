import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { LocalFsArtifactStoreAdapter } from '../infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import { AllowlistCodegenCompiler } from '../infrastructure/codegen/AllowlistCodegenCompiler';
import {
  APPENDIX_H_ABOUT_TREE,
  APPENDIX_H_CONTACT_TREE,
  APPENDIX_H_COPY_NL,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_LEGAL_TREE,
  APPENDIX_H_PDP_TREE,
  APPENDIX_H_PLAN,
  APPENDIX_H_PRODUCTS_TREE,
  APPENDIX_H_TOKENS,
  APPENDIX_H_TREES_BY_TEMPLATE,
} from '../infrastructure/codegen/appendixHFixtures';
import { CodegenRejectedError } from '../infrastructure/codegen/CodegenRejectedError';
import { ALLOWLISTED_BLOCK_TYPES } from '../infrastructure/codegen/allowlistedBlocks';
import {
  MAX_PAGE_TREE_DEPTH,
  parsePageTreeOrThrow,
  parseSitePlanOrThrow,
} from '../infrastructure/codegen/sitePlanSchema';
import { tokensToCss } from '../infrastructure/codegen/tokensCss';

/** Compare trees ignoring Footer brand text (compiler may swap © brandName). */
function expectTreeMatchesAppendixH(
  actual: unknown,
  expected: { type: string; children: ReadonlyArray<{ type: string; props?: unknown }> }
): void {
  expect(actual).toMatchObject({ type: 'Page' });
  const actualChildren = (actual as { children: Array<{ type: string; props?: Record<string, unknown> }> })
    .children;
  expect(actualChildren).toHaveLength(expected.children.length);
  expected.children.forEach((exp, i) => {
    expect(actualChildren[i].type).toBe(exp.type);
    if (exp.type === 'Footer') {
      expect(actualChildren[i].props?.text).toMatch(/^© /);
    } else if (exp.props !== undefined) {
      expect(actualChildren[i].props).toEqual(exp.props);
    }
  });
}
const validPlan = {
  version: 1 as const,
  localeDefault: 'nl-NL',
  locales: ['nl-NL'],
  tokens: {
    primary: '#3D2B1F',
    accent: '#C4A484',
    background: '#faf9f7',
    colors: {
      primary: '#3D2B1F',
      accent: '#C4A484',
      background: '#faf9f7',
    },
    typography: { fontFamily: 'Georgia, serif', fontSizeBase: '16px' },
    radius: '0.5rem',
  },
  copy: {
    'nl-NL': { brandName: 'Atelier Noord', homeHeadline: 'Handmade keramiek' },
  },
  pages: [
    {
      path: '/',
      title: 'Home',
      sortOrder: 0,
      seo: { title: 'Atelier Noord', description: 'Handmade keramiek' },
      tree: {
        type: 'Page',
        children: [
          {
            type: 'Hero',
            props: {
              headline: 'Handmade keramiek',
              ctaLabel: 'Shop',
              ctaHref: '/products',
            },
          },
          { type: 'ProductGrid', props: { source: 'featured', limit: 8 } },
          { type: 'FAQ', props: { items: [{ q: 'Verzending?', a: '2-3 dagen' }] } },
        ],
      },
    },
    {
      path: '/products',
      title: 'Collectie',
      sortOrder: 1,
      seo: { title: 'Collectie' },
      tree: {
        type: 'Page',
        children: [
          { type: 'CollectionFilter', props: {} },
          { type: 'ProductGrid', props: { source: 'all', limit: 24 } },
        ],
      },
    },
  ],
};

describe('AllowlistCodegenCompiler', () => {
  let tmpDir: string;
  let artifacts: LocalFsArtifactStoreAdapter;
  let compiler: AllowlistCodegenCompiler;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-codegen-'));
    artifacts = new LocalFsArtifactStoreAdapter(tmpDir);
    compiler = new AllowlistCodegenCompiler(artifacts);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('compiles valid brief→plan→trees and writes artifact layout', async () => {
    const result = await compiler.compile({
      tenantId: 'tenant_a',
      revisionId: 'rev_valid',
      briefJson: { brand: { name: 'Atelier Noord' } },
      planJson: validPlan,
    });

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].path).toBe('/');
    expect(result.tokensJson).toMatchObject({
      primary: '#3D2B1F',
      accent: '#C4A484',
      color: { primary: '#3D2B1F', accent: '#C4A484' },
    });

    const root = artifacts.resolveRoot('rev_valid');
    expect(result.artifactsPath).toBe(root);

    const listed = await artifacts.list('rev_valid');
    expect(listed).toEqual(
      expect.arrayContaining([
        'plan.json',
        'tokens.json',
        'tokens.css',
        'qa-report.json',
        'pages/index.tree.json',
        'pages/products.tree.json',
        'copy/nl.json',
      ])
    );

    const planOnDisk = JSON.parse((await artifacts.read('rev_valid', 'plan.json'))!.toString('utf8'));
    expect(planOnDisk.pages[0].tree.children[0].type).toBe('Hero');

    const qa = JSON.parse((await artifacts.read('rev_valid', 'qa-report.json'))!.toString('utf8'));
    expect(qa.status).toBe('pending');
  });

  it('rejects unknown block type with CODEGEN_REJECTED', async () => {
    const badPlan = {
      ...validPlan,
      pages: [
        {
          path: '/',
          title: 'Home',
          tree: {
            type: 'Page',
            children: [{ type: 'EvilScript', props: { src: 'https://evil.example' } }],
          },
        },
      ],
    };

    await expect(
      compiler.compile({
        tenantId: 'tenant_a',
        revisionId: 'rev_bad',
        briefJson: {},
        planJson: badPlan,
      })
    ).rejects.toMatchObject({
      name: 'CodegenRejectedError',
      code: 'CODEGEN_REJECTED',
    });

    await expect(
      compiler.compile({
        tenantId: 'tenant_a',
        revisionId: 'rev_bad',
        briefJson: {},
        planJson: badPlan,
      })
    ).rejects.toBeInstanceOf(CodegenRejectedError);
  });

  it('rejects nested injection of non-allowlisted block under Hero', () => {
    expect(() =>
      parsePageTreeOrThrow({
        type: 'Page',
        children: [
          {
            type: 'Hero',
            props: { headline: 'ok' },
            children: [
              {
                type: 'RawHtml',
                props: { html: '<script>alert(1)</script>' },
              },
            ],
          },
        ],
      })
    ).toThrow(CodegenRejectedError);

    try {
      parsePageTreeOrThrow({
        type: 'Page',
        children: [
          {
            type: 'Hero',
            children: [{ type: 'eval', props: {} }],
          },
        ],
      });
      throw new Error('expected CODEGEN_REJECTED');
    } catch (err) {
      expect(err).toBeInstanceOf(CodegenRejectedError);
      const details = (err as CodegenRejectedError).details as {
        issues: Array<{ message: string }>;
      };
      expect(details.issues.some((i) => /disallowed block type|eval/i.test(i.message))).toBe(
        true
      );
    }
  });

  it('rejects dangerous overrides in v1', async () => {
    const withOverrides = {
      ...validPlan,
      overrides: {
        'Hero.tsx': "eval('alert(1)')",
      },
    };

    try {
      await compiler.compile({
        tenantId: 'tenant_a',
        revisionId: 'rev_overrides',
        briefJson: {},
        planJson: withOverrides,
      });
      throw new Error('expected CODEGEN_REJECTED');
    } catch (err) {
      expect(err).toBeInstanceOf(CodegenRejectedError);
      expect((err as CodegenRejectedError).code).toBe('CODEGEN_REJECTED');
      const details = (err as CodegenRejectedError).details as {
        issues: Array<{ message: string; path: string }>;
      };
      expect(
        details.issues.some(
          (i) => i.path === 'overrides' || /overrides/i.test(i.message)
        )
      ).toBe(true);
    }
  });

  it('generates deterministic tokens.css', () => {
    const css = tokensToCss({
      primary: '#3D2B1F',
      accent: '#C4A484',
      background: '#faf9f7',
      colors: {
        primary: '#3D2B1F',
        accent: '#C4A484',
        background: '#faf9f7',
      },
      typography: {
        fontFamily: 'Georgia, serif',
        fontSizeBase: '16px',
        scale: { lg: '1.25rem', sm: '0.875rem' },
      },
      spacing: { section: '4rem', unit: 8 },
      radius: '0.5rem',
    });

    expect(css).toMatchSnapshot();
    expect(css).toContain('--color-primary: #3D2B1F;');
    expect(css).toContain('--font-size-lg: 1.25rem;');
    expect(css).toContain('--spacing-unit: 8px;');
  });

  it('is deterministic for the same input (snapshot of artifacts)', async () => {
    const input = {
      tenantId: 'tenant_a',
      revisionId: 'rev_snap_a',
      briefJson: { brand: { name: 'Atelier Noord' } },
      planJson: validPlan,
    };

    const a = await compiler.compile(input);
    const planA = (await artifacts.read('rev_snap_a', 'plan.json'))!.toString('utf8');
    const tokensCssA = (await artifacts.read('rev_snap_a', 'tokens.css'))!.toString('utf8');
    const treeA = (await artifacts.read('rev_snap_a', 'pages/index.tree.json'))!.toString('utf8');

    const b = await compiler.compile({ ...input, revisionId: 'rev_snap_b' });
    const planB = (await artifacts.read('rev_snap_b', 'plan.json'))!.toString('utf8');
    const tokensCssB = (await artifacts.read('rev_snap_b', 'tokens.css'))!.toString('utf8');
    const treeB = (await artifacts.read('rev_snap_b', 'pages/index.tree.json'))!.toString('utf8');

    expect(planA).toBe(planB);
    expect(tokensCssA).toBe(tokensCssB);
    expect(treeA).toBe(treeB);
    expect(a.pages).toEqual(b.pages);
    expect(a.tokensJson).toEqual(b.tokensJson);

    expect({
      plan: JSON.parse(planA),
      tokensCss: tokensCssA,
      indexTree: JSON.parse(treeA),
    }).toMatchSnapshot();
  });

  it('compiles Appendix H fixtures (all pages + copy/nl.json)', async () => {
    for (const tree of Object.values(APPENDIX_H_TREES_BY_TEMPLATE)) {
      expect(() => parsePageTreeOrThrow(tree)).not.toThrow();
    }

    const result = await compiler.compile({
      tenantId: 'tenant_a',
      revisionId: 'rev_appendix_h',
      briefJson: { brand: { name: 'Atelier Noord' } },
      planJson: {
        ...APPENDIX_H_PLAN,
        tokens: APPENDIX_H_TOKENS,
      },
    });

    expect(result.pages.map((p) => p.path)).toEqual(
      APPENDIX_H_PLAN.pages.map((p) => p.path)
    );
    expect(result.pages).toHaveLength(6);

    const byPath: Record<string, unknown> = {
      '/': APPENDIX_H_HOME_TREE,
      '/products': APPENDIX_H_PRODUCTS_TREE,
      '/products/:slug': APPENDIX_H_PDP_TREE,
      '/about': APPENDIX_H_ABOUT_TREE,
      '/contact': APPENDIX_H_CONTACT_TREE,
      '/legal': APPENDIX_H_LEGAL_TREE,
    };
    for (const page of result.pages) {
      expectTreeMatchesAppendixH(page.treeJson, byPath[page.path] as typeof APPENDIX_H_HOME_TREE);
    }

    expect(result.tokensJson).toMatchObject({
      color: APPENDIX_H_TOKENS.color,
      font: APPENDIX_H_TOKENS.font,
      radius: APPENDIX_H_TOKENS.radius,
    });

    const listed = await artifacts.list('rev_appendix_h');
    expect(listed).toEqual(
      expect.arrayContaining([
        'plan.json',
        'tokens.json',
        'tokens.css',
        'pages/index.tree.json',
        'pages/products.tree.json',
        'pages/products.[slug].tree.json',
        'pages/about.tree.json',
        'pages/contact.tree.json',
        'pages/legal.tree.json',
        'copy/nl.json',
        'qa-report.json',
      ])
    );

    const copyNl = JSON.parse(
      (await artifacts.read('rev_appendix_h', 'copy/nl.json'))!.toString('utf8')
    );
    expect(copyNl).toMatchObject({
      ...APPENDIX_H_COPY_NL,
      brandName: 'Atelier Noord',
    });

    for (const [filePath, expected] of [
      ['pages/index.tree.json', APPENDIX_H_HOME_TREE],
      ['pages/products.tree.json', APPENDIX_H_PRODUCTS_TREE],
      ['pages/products.[slug].tree.json', APPENDIX_H_PDP_TREE],
      ['pages/about.tree.json', APPENDIX_H_ABOUT_TREE],
      ['pages/contact.tree.json', APPENDIX_H_CONTACT_TREE],
      ['pages/legal.tree.json', APPENDIX_H_LEGAL_TREE],
    ] as const) {
      const onDisk = JSON.parse(
        (await artifacts.read('rev_appendix_h', filePath))!.toString('utf8')
      );
      expectTreeMatchesAppendixH(onDisk, expected);
    }
  });

  it('synthesizes Appendix H default plan from brief when pages are missing', async () => {
    const result = await compiler.compile({
      tenantId: 'tenant_a',
      revisionId: 'rev_default',
      briefJson: {
        brand: { name: 'Atelier Noord', primaryColor: '#111111', accentColor: '#abcdef' },
      },
      planJson: {},
    });

    expect(result.pages.length).toBe(APPENDIX_H_PLAN.pages.length);
    expect(result.pages.map((p) => p.path)).toEqual(
      APPENDIX_H_PLAN.pages.map((p) => p.path)
    );
    expect(result.pages[0].treeJson).toMatchObject({
      type: 'Page',
      children: expect.arrayContaining([
        expect.objectContaining({ type: 'Nav' }),
        expect.objectContaining({ type: 'Hero' }),
        expect.objectContaining({ type: 'ProductGrid' }),
        expect.objectContaining({ type: 'FAQ' }),
        expect.objectContaining({ type: 'Footer' }),
      ]),
    });
    expectTreeMatchesAppendixH(result.pages[0].treeJson, APPENDIX_H_HOME_TREE);
    expectTreeMatchesAppendixH(
      result.pages.find((p) => p.path === '/products')!.treeJson,
      APPENDIX_H_PRODUCTS_TREE
    );
    expectTreeMatchesAppendixH(
      result.pages.find((p) => p.path === '/products/:slug')!.treeJson,
      APPENDIX_H_PDP_TREE
    );
    expectTreeMatchesAppendixH(
      result.pages.find((p) => p.path === '/about')!.treeJson,
      APPENDIX_H_ABOUT_TREE
    );
    expectTreeMatchesAppendixH(
      result.pages.find((p) => p.path === '/contact')!.treeJson,
      APPENDIX_H_CONTACT_TREE
    );
    expectTreeMatchesAppendixH(
      result.pages.find((p) => p.path === '/legal')!.treeJson,
      APPENDIX_H_LEGAL_TREE
    );
    expect(result.tokensJson).toMatchObject({ primary: '#111111', accent: '#abcdef' });

    const copyNl = JSON.parse(
      (await artifacts.read('rev_default', 'copy/nl.json'))!.toString('utf8')
    );
    expect(copyNl).toMatchObject(APPENDIX_H_COPY_NL);
  });
  it('requires tenantId (security)', async () => {
    await expect(
      compiler.compile({
        tenantId: '',
        revisionId: 'rev_x',
        briefJson: {},
        planJson: validPlan,
      })
    ).rejects.toMatchObject({ code: 'CODEGEN_REJECTED' });
  });

  it('charter allowlist matches compiler constant', () => {
    expect(ALLOWLISTED_BLOCK_TYPES).toEqual([
      'Hero',
      'LogoBar',
      'ProductGrid',
      'ProductDetail',
      'RichText',
      'ImageBand',
      'FAQ',
      'Testimonials',
      'NewsletterSignup',
      'Footer',
      'Nav',
      'CartDrawer',
      'CheckoutShell',
      'LegalText',
      'ContactForm',
      'CollectionFilter',
      'TrustBadges',
    ]);
    expect(() => parseSitePlanOrThrow(validPlan)).not.toThrow();
  });

  it('rejects page trees deeper than MAX_PAGE_TREE_DEPTH (DoS guard)', () => {
    let node: Record<string, unknown> = { type: 'RichText', props: { body: 'leaf' } };
    for (let i = 0; i < MAX_PAGE_TREE_DEPTH + 2; i++) {
      node = { type: 'Hero', props: { title: `d${i}` }, children: [node] };
    }
    expect(() =>
      parsePageTreeOrThrow({ type: 'Page', children: [node] })
    ).toThrow(CodegenRejectedError);
  });

  it('fuzz: random unknown block names always CODEGEN_REJECTED', () => {
    const junk = [
      'Script',
      'iframe',
      'eval',
      'RawHtml',
      '__proto__',
      'constructor',
      'Function',
      'Object',
      'document',
      'window',
      'require',
      'import',
      'tsx',
      'Component',
    ];
    for (const type of junk) {
      expect(() =>
        parsePageTreeOrThrow({
          type: 'Page',
          children: [{ type, props: { x: 1 } }],
        })
      ).toThrow(CodegenRejectedError);
    }
  });

  it('fuzz: nested allowlisted tree within depth limit compiles', async () => {
    let children: Record<string, unknown>[] = [{ type: 'RichText', props: { body: 'ok' } }];
    for (let i = 0; i < 4; i++) {
      children = [{ type: 'Hero', props: { title: `L${i}` }, children }];
    }
    const plan = {
      ...validPlan,
      pages: [{ path: '/', title: 'Home', tree: { type: 'Page', children } }],
    };
    await expect(
      compiler.compile({
        tenantId: 'tenant_a',
        revisionId: 'rev_fuzz_depth',
        briefJson: {},
        planJson: plan,
      })
    ).resolves.toMatchObject({ pages: expect.any(Array) });
  });

  it('fuzz: depth overflow always CODEGEN_REJECTED', () => {
    let node: Record<string, unknown> = { type: 'RichText', props: { body: 'leaf' } };
    for (let i = 0; i < MAX_PAGE_TREE_DEPTH + 2; i++) {
      node = { type: 'Hero', props: { title: `D${i}` }, children: [node] };
    }
    expect(() =>
      parsePageTreeOrThrow({ type: 'Page', children: [node] })
    ).toThrow(CodegenRejectedError);
  });

  it('fuzz: nested unknown type under allowlisted parents rejected', () => {
    expect(() =>
      parsePageTreeOrThrow({
        type: 'Page',
        children: [
          {
            type: 'Hero',
            props: { headline: 'ok' },
            children: [
              {
                type: 'FAQ',
                props: { items: [] },
                children: [{ type: 'RawScript', props: { src: 'evil.js' } }],
              },
            ],
          },
        ],
      })
    ).toThrow(CodegenRejectedError);
  });

  it('fuzz: dangerous prop keys do not bypass allowlist (unknown type still rejected)', () => {
    const dangerousProps: Array<Record<string, unknown>> = [
      Object.assign(Object.create(null), { polluted: true }),
      { constructor: { prototype: {} } },
      { children: '<script>alert(1)</script>', dangerouslySetInnerHTML: { __html: 'x' } },
      { href: 'javascript:alert(1)', onClick: 'evil()' },
    ];
    for (const props of dangerousProps) {
      expect(() =>
        parsePageTreeOrThrow({
          type: 'Page',
          children: [{ type: 'EvilBlock', props }],
        })
      ).toThrow(CodegenRejectedError);
    }
  });

  it('fuzz: freeform plan keys with overrides variants rejected', async () => {
    const variants = [
      { overrides: { 'Hero.tsx': 'export default () => null' } },
      { overrides: { './pages/Home.tsx': 'eval(1)' } },
      { overrides: { anything: true } },
    ];
    for (const [idx, patch] of variants.entries()) {
      await expect(
        compiler.compile({
          tenantId: 'tenant_a',
          revisionId: `rev_fuzz_ov_${idx}`,
          briefJson: {},
          planJson: { ...validPlan, ...patch },
        })
      ).rejects.toMatchObject({ code: 'CODEGEN_REJECTED' });
    }
  });

  it('fuzz: page path traversal / ambiguous segments rejected', async () => {
    const badPaths = ['/../admin', '//evil', '/about\\win', '/ok/../../x'];
    for (const [idx, pagePath] of badPaths.entries()) {
      await expect(
        compiler.compile({
          tenantId: 'tenant_a',
          revisionId: `rev_fuzz_path_${idx}`,
          briefJson: {},
          planJson: {
            ...validPlan,
            pages: [
              {
                path: pagePath,
                title: 'Bad',
                tree: { type: 'Page', children: [{ type: 'RichText', props: { body: 'x' } }] },
              },
            ],
          },
        })
      ).rejects.toMatchObject({ code: 'CODEGEN_REJECTED' });
    }
  });

  it('fuzz: __proto__ / constructor / empty / whitespace block types rejected', () => {
    for (const type of ['__proto__', 'constructor', '', ' ', '\t']) {
      expect(() =>
        parsePageTreeOrThrow({
          type: 'Page',
          children: [{ type, props: {} }],
        })
      ).toThrow(CodegenRejectedError);
    }
  });

  it('fuzz: deeply nested allowlisted tree with unknown leaf rejected', () => {
    let node: Record<string, unknown> = { type: 'EvilLeaf', props: { x: 1 } };
    for (let i = 0; i < 5; i++) {
      node = { type: 'Hero', props: { title: `L${i}` }, children: [node] };
    }
    expect(() =>
      parsePageTreeOrThrow({ type: 'Page', children: [node] })
    ).toThrow(CodegenRejectedError);
  });
});
