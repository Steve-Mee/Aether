import {
  runStructuralBuildChecks,
  toStructuralQaReportJson,
} from '../application/services/structuralBuildQa';

describe('structuralBuildQa', () => {
  it('passes Appendix-H-shaped plan with artifacts and home /', () => {
    const result = runStructuralBuildChecks({
      planJson: {
        pages: [
          { path: '/', title: 'Home', tree: { type: 'Page', children: [{ type: 'Hero' }] } },
          { path: '/about', title: 'About', tree: { type: 'Page', children: [] } },
        ],
      },
      artifactsPath: '/tmp/rev',
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.9);
    expect(result.blockTypes).toEqual(expect.arrayContaining(['Page', 'Hero']));
    expect(toStructuralQaReportJson(result).status).toBe('passed');
    expect(toStructuralQaReportJson(result)).not.toHaveProperty('lighthouse');
    expect(String(toStructuralQaReportJson(result).note)).toMatch(/CWV not measured/);
  });

  it('fails without home path', () => {
    const result = runStructuralBuildChecks({
      planJson: { pages: [{ path: '/about', tree: { type: 'Page', children: [] } }] },
      artifactsPath: '/tmp/rev',
    });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.4);
    expect(result.checks.find((c) => c.id === 'home_page')?.ok).toBe(false);
  });

  it('fails without artifacts', () => {
    const result = runStructuralBuildChecks({
      planJson: { pages: [{ path: '/', tree: { type: 'Page', children: [] } }] },
      artifactsPath: null,
    });
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.id === 'has_artifacts')?.ok).toBe(false);
  });
});
