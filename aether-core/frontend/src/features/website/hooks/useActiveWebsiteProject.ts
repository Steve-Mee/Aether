import { useAetherQuery, aetherErrorMessage } from '@/lib/query/hooks';
import { websiteApi } from '../api';

/**
 * Loads tenant website projects and hydrates the primary project detail (first in list).
 */
export function useActiveWebsiteProject() {
  const projectsQuery = useAetherQuery(websiteApi.queryKeys.projects(), () =>
    websiteApi.listProjects(),
  );

  const primaryId = projectsQuery.data?.[0]?.id;
  const projectQuery = useAetherQuery(
    websiteApi.queryKeys.project(primaryId ?? ''),
    () => websiteApi.getProject(primaryId!),
    { enabled: Boolean(primaryId) },
  );

  const loading =
    projectsQuery.isLoading || (Boolean(primaryId) && projectQuery.isLoading && !projectQuery.data);
  const error =
    aetherErrorMessage(projectsQuery.error) ?? aetherErrorMessage(projectQuery.error) ?? null;

  const reload = () => {
    void projectsQuery.refetch();
    if (primaryId) void projectQuery.refetch();
  };

  return {
    projects: projectsQuery.data ?? [],
    project: projectQuery.data ?? null,
    isEmpty: !projectsQuery.isLoading && (projectsQuery.data?.length ?? 0) === 0,
    loading,
    error,
    reload,
  };
}
