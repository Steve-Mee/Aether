export function isGraphOrchestrationEnabled(): boolean {
  if (process.env.MULTI_AGENT_GRAPH_ORCHESTRATION === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_GRAPH_ORCHESTRATION !== 'true') {
    return false;
  }
  return process.env.MULTI_AGENT_GRAPH_ORCHESTRATION === 'true';
}

export function getGraphOrchestrationBackend(): 'native' | 'langgraph' {
  const raw = process.env.MULTI_AGENT_GRAPH_BACKEND ?? 'native';
  return raw === 'langgraph' ? 'langgraph' : 'native';
}
