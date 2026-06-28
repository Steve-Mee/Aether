import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiRoutes } from '@/lib/api';
import { env } from '@/lib/config/env';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { AUTONOMY_AGENT_KEYS } from '@/lib/settings/autonomyTypes';
import { queryKeys } from '@/lib/query/keys';
import type { AgentActivityResponse, AgentRosterEntry, AgentsRosterResponse } from '@/types/agents';

function demoRoster(): AgentRosterEntry[] {
  return AUTONOMY_AGENT_KEYS.map((key) => ({
    agentKey: key,
    displayName: agentDisplayLabel(key),
    description: `${agentDisplayLabel(key)} — demo modus`,
    supportedIntents: [],
    canDelegateTo: [],
    status: 'idle',
    proactiveCount: key === 'inventory' ? 1 : 0,
    recentActionCount: 0,
  }));
}

export function useAgentsHub() {
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);

  const rosterQuery = useQuery({
    queryKey: queryKeys.agents(),
    queryFn: () => apiFetch<AgentsRosterResponse>(apiRoutes.admin.agents),
    enabled: env.isLiveMode,
    staleTime: 30_000,
  });

  const agents = useMemo(
    () => (env.isLiveMode ? (rosterQuery.data?.agents ?? []) : demoRoster()),
    [rosterQuery.data?.agents],
  );

  const effectiveSelected = selectedAgentKey ?? agents[0]?.agentKey ?? null;

  const activityQuery = useQuery({
    queryKey: queryKeys.agentActivity(effectiveSelected ?? '', 7),
    queryFn: () =>
      apiFetch<AgentActivityResponse>(apiRoutes.admin.agentActivity(effectiveSelected!, 7)),
    enabled: env.isLiveMode && Boolean(effectiveSelected),
    staleTime: 30_000,
  });

  const selectAgent = useCallback((agentKey: string) => {
    setSelectedAgentKey(agentKey);
  }, []);

  return {
    agents,
    selectedAgentKey: effectiveSelected,
    selectAgent,
    activity: activityQuery.data,
    loading: env.isLiveMode ? rosterQuery.isLoading : false,
    activityLoading: env.isLiveMode ? activityQuery.isLoading : false,
    error: rosterQuery.error,
    reload: () => {
      void rosterQuery.refetch();
      void activityQuery.refetch();
    },
  };
}
