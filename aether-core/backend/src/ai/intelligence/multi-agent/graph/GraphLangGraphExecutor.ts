import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { NativeGraphOrchestrator } from './NativeGraphOrchestrator';
import type { GraphDefinition, GraphNode } from './types';
import type { GraphExecutionRequest, GraphExecutionResult } from './GraphOrchestratorPort';

export interface LangGraphExecutorDeps {
  nativeOrchestrator: NativeGraphOrchestrator;
}

const GraphStateAnnotation = Annotation.Root({
  command: Annotation<string>(),
  tenantId: Annotation<string>(),
  narratives: Annotation<string[]>({
    reducer: (left, right) => [...(left ?? []), ...(right ?? [])],
    default: () => [],
  }),
  request: Annotation<GraphExecutionRequest | undefined>(),
  result: Annotation<GraphExecutionResult | undefined>(),
});

type GraphState = typeof GraphStateAnnotation.State;

export class GraphLangGraphExecutor {
  constructor(private deps: LangGraphExecutorDeps) {}

  buildCompiledGraph(definition: GraphDefinition) {
    const graph = new StateGraph(GraphStateAnnotation);

    for (const node of definition.nodes) {
      if (node.kind === 'router' || node.kind === 'merge' || node.kind === 'parallel_join') {
        graph.addNode(node.id, async (state: GraphState) => state);
      } else if (node.kind === 'parallel_fork') {
        graph.addNode(node.id, async (state: GraphState) => state);
      } else {
        graph.addNode(node.id, async (state: GraphState) => this.executeNode(node, state));
      }
    }

    for (const edge of definition.edges) {
      if (edge.condition) {
        graph.addConditionalEdges(
          edge.from as typeof START,
          () => edge.to,
          [edge.to as typeof END]
        );
      } else {
        graph.addEdge(edge.from as typeof START, edge.to as typeof END);
      }
    }

    if (!definition.edges.some((e) => e.from === START)) {
      const entry =
        definition.entryNodeId === 'router'
          ? definition.nodes.find((n) => n.kind === 'agent')?.id ?? END
          : definition.entryNodeId;
      graph.addEdge(START, entry as typeof END);
    }

    const mergeNode = definition.nodes.find((n) => n.kind === 'merge');
    if (mergeNode) {
      graph.addEdge(mergeNode.id as typeof START, END);
    }

    return graph.compile();
  }

  async execute(request: GraphExecutionRequest, definition: GraphDefinition): Promise<GraphExecutionResult> {
    const compiled = this.buildCompiledGraph(definition);
    const finalState = await compiled.invoke({
      command: request.command,
      tenantId: request.tenantId,
      narratives: [],
      request,
      result: undefined,
    });

    if (finalState.result) {
      return finalState.result as GraphExecutionResult;
    }

    const narratives = (finalState.narratives as string[]) ?? [];
    return {
      mode: definition.nodes.some((n) => n.kind === 'parallel_fork') ? 'parallel' : 'sequential',
      mergedNarrative: narratives.filter(Boolean).join('\n\n'),
    };
  }

  private async executeNode(node: GraphNode, state: GraphState): Promise<Partial<GraphState>> {
    const request = state.request;
    if (!request) return {};

    if (node.kind === 'agent' || node.kind === 'peer') {
      const subResult = await this.deps.nativeOrchestrator.executeGraph({
        ...request,
        graphDefinition: {
          nodes: [node],
          edges: [],
          entryNodeId: node.id,
        },
      });
      return {
        narratives: [subResult.mergedNarrative].filter(Boolean),
        result: subResult,
      };
    }

    return {};
  }
}
