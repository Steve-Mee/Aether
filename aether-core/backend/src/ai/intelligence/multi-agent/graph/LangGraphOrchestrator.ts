import { getGraphOrchestrationBackend } from './graphOrchestrationConfig';
import type {
  GraphExecutionRequest,
  GraphExecutionResult,
  GraphOrchestratorPort,
} from './GraphOrchestratorPort';
import type { NativeGraphOrchestrator } from './NativeGraphOrchestrator';

/**
 * LangGraph adapter v1: delegates to native graph executor with identical node semantics.
 * Full @langchain/langgraph StateGraph wiring can replace the delegate when backend=langgraph matures.
 */
export class LangGraphOrchestrator implements GraphOrchestratorPort {
  constructor(private nativeFallback: NativeGraphOrchestrator) {}

  isEnabled(): boolean {
    return this.nativeFallback.isEnabled();
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const backend = getGraphOrchestrationBackend();
    if (backend === 'langgraph') {
      // v1: same in-process graph nodes (Router → Specialist → Merge) via native executor
      return this.nativeFallback.executeGraph(request);
    }
    return this.nativeFallback.executeGraph(request);
  }
}
