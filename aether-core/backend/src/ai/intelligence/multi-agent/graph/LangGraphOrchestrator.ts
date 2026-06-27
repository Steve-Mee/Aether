import { getGraphOrchestrationBackend } from './graphOrchestrationConfig';
import { GraphLangGraphExecutor } from './GraphLangGraphExecutor';
import type {
  GraphExecutionRequest,
  GraphExecutionResult,
  GraphOrchestratorPort,
} from './GraphOrchestratorPort';
import type { NativeGraphOrchestrator } from './NativeGraphOrchestrator';
import type { GraphDefinition } from './types';

export class LangGraphOrchestrator implements GraphOrchestratorPort {
  private langGraphExecutor: GraphLangGraphExecutor;

  constructor(private nativeFallback: NativeGraphOrchestrator) {
    this.langGraphExecutor = new GraphLangGraphExecutor({ nativeOrchestrator: nativeFallback });
  }

  isEnabled(): boolean {
    return this.nativeFallback.isEnabled();
  }

  buildStateGraph(definition: GraphDefinition): ReturnType<GraphLangGraphExecutor['buildCompiledGraph']> {
    return this.langGraphExecutor.buildCompiledGraph(definition);
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const backend = getGraphOrchestrationBackend();
    if (backend === 'langgraph' && request.graphDefinition) {
      return this.langGraphExecutor.execute(request, request.graphDefinition);
    }
    return this.nativeFallback.executeGraph(request);
  }
}
