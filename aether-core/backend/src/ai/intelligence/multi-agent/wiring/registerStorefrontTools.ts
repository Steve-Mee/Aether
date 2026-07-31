import {
  createSiteProjectTool,
  createRevisionFromBriefTool,
  runBuildTool,
  proposePublishTool,
  getStoreStatusTool,
  proposeLayoutTool,
  proposeTokensTool,
  proposePageTreeTool,
  proposeCopyTool,
  proposeMetaTool,
  localizeTool,
  runBuildChecksTool,
  runLighthouseTool,
  diffRevisionsTool,
} from '../agents';
import type { StoreBuilderToolsDeps } from '../agents/storeBuilderTools';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';

export interface RegisterStorefrontToolsInput {
  toolRegistry: PersonalBrainToolRegistry;
  personalBrainRegistry: PersonalBrainRegistry;
}

function createLazyStoreBuilderDeps(personalBrainRegistry: PersonalBrainRegistry): StoreBuilderToolsDeps {
  const lazyStoreBuilderDeps = (): StoreBuilderToolsDeps => {
    const root = getCompositionRoot();
    return {
      createSiteProject: root.createSiteProject,
      createSiteRevision: root.createSiteRevision,
      startSiteBuild: root.startSiteBuild,
      proposeSitePublish: root.proposeSitePublish,
      listSiteProjects: root.listSiteProjects,
      getSiteProject: root.getSiteProject,
      listSiteRevisions: root.listSiteRevisions,
      personalBrains: personalBrainRegistry,
    };
  };

  return {
    createSiteProject: { execute: (t, d) => lazyStoreBuilderDeps().createSiteProject.execute(t, d) },
    createSiteRevision: {
      execute: (t, id, d) => lazyStoreBuilderDeps().createSiteRevision.execute(t, id, d),
    },
    startSiteBuild: { execute: (t, id) => lazyStoreBuilderDeps().startSiteBuild.execute(t, id) },
    proposeSitePublish: {
      execute: (t, id, o) => lazyStoreBuilderDeps().proposeSitePublish.execute(t, id, o),
    },
    listSiteProjects: { execute: (t) => lazyStoreBuilderDeps().listSiteProjects.execute(t) },
    getSiteProject: { execute: (t, id) => lazyStoreBuilderDeps().getSiteProject.execute(t, id) },
    listSiteRevisions: {
      execute: (t, id) => lazyStoreBuilderDeps().listSiteRevisions.execute(t, id),
    },
    personalBrains: personalBrainRegistry,
  };
}

export function registerStorefrontTools(input: RegisterStorefrontToolsInput): void {
  const { toolRegistry, personalBrainRegistry } = input;
  const storeBuilderProxy = createLazyStoreBuilderDeps(personalBrainRegistry);

  toolRegistry.register(createSiteProjectTool(storeBuilderProxy));
  toolRegistry.register(createRevisionFromBriefTool(storeBuilderProxy));
  toolRegistry.register(runBuildTool(storeBuilderProxy));
  toolRegistry.register(proposePublishTool(storeBuilderProxy));
  toolRegistry.register(getStoreStatusTool(storeBuilderProxy));
  toolRegistry.register(proposeLayoutTool({ llm: defaultOllamaInference }));
  toolRegistry.register(proposeTokensTool({ llm: defaultOllamaInference }));
  toolRegistry.register(proposePageTreeTool({ llm: defaultOllamaInference }));
  toolRegistry.register(proposeCopyTool({ llm: defaultOllamaInference }));
  toolRegistry.register(proposeMetaTool({ llm: defaultOllamaInference }));
  toolRegistry.register(localizeTool({ llm: defaultOllamaInference }));

  const storeQaRevisions = {
    findRevisionById: async (tenantId: string, revisionId: string) =>
      getCompositionRoot().getSiteRevision.execute(tenantId, revisionId),
  };
  toolRegistry.register(runBuildChecksTool({ revisions: storeQaRevisions }));
  toolRegistry.register(runLighthouseTool({ revisions: storeQaRevisions }));
  toolRegistry.register(diffRevisionsTool({ revisions: storeQaRevisions }));
}
