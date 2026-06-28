export function isExplainabilityLlmSummaryEnabled(): boolean {
  return process.env.EXPLAINABILITY_LLM_SUMMARY_ENABLED === 'true';
}

export function resolveExplainabilityNarrativeJobIntervalMs(): number {
  const raw = parseInt(process.env.EXPLAINABILITY_NARRATIVE_JOB_INTERVAL_MS ?? '60000', 10);
  return Number.isFinite(raw) && raw >= 10000 ? raw : 60000;
}
