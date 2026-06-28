function payloadToSections(
  payload: {
    summary: string;
    agents: Array<{ label: string; contribution?: string }>;
    dataSources: Array<{ label: string; preview?: string }>;
    reasoningSteps: Array<{ label: string }>;
    reflections: Array<{ observation: string }>;
  },
  detailLevel: 'simple' | 'extended'
) {
  const sections: Array<{ id: string; title: string; items: Array<{ label: string; detail?: string }> }> =
    [];
  sections.push({
    id: 'summary',
    title: 'Samenvatting',
    items: [{ label: payload.summary }],
  });
  if (payload.agents.length > 0) {
    sections.push({
      id: 'agents',
      title: 'Betrokken agents',
      items: payload.agents.map((a) => ({ label: a.label, detail: a.contribution })),
    });
  }
  if (detailLevel === 'extended' && payload.reflections.length > 0) {
    sections.push({
      id: 'reflections',
      title: 'Reflecties',
      items: payload.reflections.map((r) => ({ label: r.observation })),
    });
  }
  return sections;
}

describe('explainability API response sections', () => {
  it('includes reflections only in extended UI level', () => {
    const payload = {
      summary: 'Test summary',
      agents: [{ label: 'Prijs-agent' }],
      dataSources: [],
      reasoningSteps: [],
      reflections: [{ observation: 'Margin low' }],
    };
    const simple = payloadToSections(payload, 'simple');
    const extended = payloadToSections(payload, 'extended');
    expect(simple.some((s) => s.id === 'reflections')).toBe(false);
    expect(extended.some((s) => s.id === 'reflections')).toBe(true);
  });
});
