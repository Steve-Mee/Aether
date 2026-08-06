import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { apiRoutes } from '@/lib/api/routes';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { AgentStatus } from '@/components/command-center/AgentControlsSection';
import type { AutonomyAgentKey } from '@/lib/settings/autonomyTypes';
import { queryKeys } from '@/lib/query/keys';
import { env } from '@/lib/config/env';

const CATALOG_AGENTS: Array<{ agentKey: AutonomyAgentKey; displayName: string }> = [
  { agentKey: 'pricing', displayName: 'Pricing Agent' },
  { agentKey: 'inventory', displayName: 'Inventory Agent' },
  { agentKey: 'supplier', displayName: 'Supplier Intelligence' },
  { agentKey: 'mail', displayName: 'AETHER Mail' },
  { agentKey: 'promotion', displayName: 'Marketing & Promotion' },
  { agentKey: 'returns', displayName: 'Returns & Quality' },
];

interface AgentRosterRow {
  agentKey: string;
  displayName?: string;
  recentActionCount?: number;
  lastActiveAt?: string;
}

export function useAgentControls() {
  const { settings, updateSettings } = useMerchantSettings();

  const rosterQuery = useQuery({
    queryKey: queryKeys.agents(),
    queryFn: async () => {
      const res = await apiFetch<{ agents?: AgentRosterRow[] } | AgentRosterRow[]>(
        apiRoutes.admin.agents
      );
      if (Array.isArray(res)) return res;
      return res.agents ?? [];
    },
    enabled: env.isLiveMode,
    staleTime: 30_000,
  });

  const countByKey = useMemo(() => {
    const map = new Map<string, { count: number; lastActiveAt?: string }>();
    for (const row of rosterQuery.data ?? []) {
      map.set(row.agentKey, {
        count: Number(row.recentActionCount ?? 0),
        lastActiveAt: row.lastActiveAt,
      });
    }
    return map;
  }, [rosterQuery.data]);

  const agents = useMemo((): AgentStatus[] => {
    const overrides = settings.autonomyPrefs?.agentOverrides || {};
    return CATALOG_AGENTS.map((agent) => {
      const override = overrides[agent.agentKey];
      const enabled = override?.enabled !== false;
      const live = countByKey.get(agent.agentKey);
      return {
        agentKey: agent.agentKey,
        displayName: agent.displayName,
        isPaused: !enabled,
        priority: override?.priority ?? 5,
        activityCount24h: live?.count ?? 0,
        lastActiveAt: live?.lastActiveAt,
      };
    });
  }, [settings.autonomyPrefs, countByKey]);

  const mostActiveKey = useMemo(() => {
    const withActivity = agents.filter((a) => a.activityCount24h > 0);
    if (withActivity.length === 0) return null;
    return [...withActivity].sort((a, b) => b.activityCount24h - a.activityCount24h)[0]?.agentKey ?? null;
  }, [agents]);

  const togglePause = useCallback(
    async (agentKey: string) => {
      const key = agentKey as AutonomyAgentKey;
      const current = settings.autonomyPrefs?.agentOverrides?.[key];
      const currentlyEnabled = current?.enabled !== false;
      await updateSettings({
        autonomyPrefs: {
          ...settings.autonomyPrefs,
          agentOverrides: {
            ...settings.autonomyPrefs.agentOverrides,
            [key]: {
              enabled: !currentlyEnabled,
              priority: current?.priority ?? 5,
              allowLowRiskAutoExecute: current?.allowLowRiskAutoExecute ?? null,
              allowMediumRiskAutoExecute: current?.allowMediumRiskAutoExecute ?? null,
            },
          },
        },
      });
    },
    [settings.autonomyPrefs, updateSettings],
  );

  const setPriority = useCallback(
    async (agentKey: string, priority: number) => {
      const key = agentKey as AutonomyAgentKey;
      const current = settings.autonomyPrefs?.agentOverrides?.[key];
      await updateSettings({
        autonomyPrefs: {
          ...settings.autonomyPrefs,
          agentOverrides: {
            ...settings.autonomyPrefs.agentOverrides,
            [key]: {
              enabled: current?.enabled !== false,
              priority: Math.min(10, Math.max(1, priority)),
              allowLowRiskAutoExecute: current?.allowLowRiskAutoExecute ?? null,
              allowMediumRiskAutoExecute: current?.allowMediumRiskAutoExecute ?? null,
            },
          },
        },
      });
    },
    [settings.autonomyPrefs, updateSettings],
  );

  return {
    agents,
    mostActiveKey,
    togglePause,
    setPriority,
    loading: rosterQuery.isLoading,
  };
}
