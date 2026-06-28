import { getDataAdapter } from '../createDataAdapter';

export const adminRepository = {
  truthStatus: () => getDataAdapter().fetchTruthStatus(),
  explainTimeline: (entityType: string, entityId: string) =>
    getDataAdapter().fetchExplainTimeline(entityType, entityId),
  autonomyTrace: (limit?: number) => getDataAdapter().fetchAutonomyTrace(limit),
  submitTruthReview: () => getDataAdapter().submitTruthReview(),
  suggestions: (route: string, limit: number) => getDataAdapter().fetchSuggestions(route, limit),
  proactiveSuggestions: () => getDataAdapter().fetchProactiveSuggestions(),
  dismissProactiveSuggestion: (id: string) => getDataAdapter().dismissProactiveSuggestion(id),
  snoozeProactiveSuggestion: (id: string, hours?: number) =>
    getDataAdapter().snoozeProactiveSuggestion(id, hours),
  executeProactiveSuggestion: (id: string) => getDataAdapter().executeProactiveSuggestion(id),
  trackUiEvent: (event: { type: string; path: string }) => getDataAdapter().trackUiEvent(event),
};
