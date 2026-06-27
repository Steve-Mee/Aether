import type { ExecutionPlan, PlanNode } from '../types';
import { isNestedPlansEnabled } from '../parallelConfig';
import type { GraphDefinition, GraphEdge, GraphNode } from './types';

export class CollaborationGraphBuilder {
  buildFromPlan(plan: ExecutionPlan, command: string): GraphDefinition | null {
    if (plan.root && isNestedPlansEnabled()) {
      return this.buildFromPlanNode(plan.root, command);
    }
    if (plan.agents.length === 0) return null;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const entryId = 'router';
    nodes.push({ id: entryId, kind: 'router' });

    if (plan.mode === 'parallel') {
      const forkId = 'parallel_fork';
      const joinId = 'parallel_join';
      nodes.push({ id: forkId, kind: 'parallel_fork' });
      nodes.push({ id: joinId, kind: 'parallel_join' });
      edges.push({ from: entryId, to: forkId });

      for (let i = 0; i < plan.agents.length; i++) {
        const agent = plan.agents[i]!;
        const nodeId = `agent_${agent.agentKey}_${i}`;
        nodes.push({
          id: nodeId,
          kind: 'agent',
          agentKey: agent.agentKey,
          intent: agent.intent,
        });
        edges.push({ from: forkId, to: nodeId });
        edges.push({ from: nodeId, to: joinId });
      }

      const mergeId = 'merge';
      nodes.push({ id: mergeId, kind: 'merge' });
      edges.push({ from: joinId, to: mergeId });
      return { nodes, edges, entryNodeId: entryId };
    }

    let prevId = entryId;
    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i]!;
      const agentNodeId = `agent_${agent.agentKey}_${i}`;
      nodes.push({
        id: agentNodeId,
        kind: 'agent',
        agentKey: agent.agentKey,
        intent: agent.intent,
      });
      edges.push({ from: prevId, to: agentNodeId });

      const chainStep = plan.collaborationChain?.steps[i];
      const nextAgent = plan.agents[i + 1];
      if (chainStep && nextAgent && chainStep.agentKey !== agent.agentKey) {
        const peerId = `peer_${chainStep.agentKey}_${i}`;
        nodes.push({
          id: peerId,
          kind: 'peer',
          peerMode: 'sync',
          targetAgentKey: chainStep.agentKey,
          intent: chainStep.intent,
        });
        edges.push({ from: agentNodeId, to: peerId, condition: 'needsPeerDelegation' });
        edges.push({ from: peerId, to: `agent_${nextAgent.agentKey}_${i + 1}` });
      }

      prevId = agentNodeId;
    }

    const mergeId = 'merge';
    nodes.push({ id: mergeId, kind: 'merge' });
    edges.push({ from: prevId, to: mergeId });

    return { nodes, edges, entryNodeId: entryId };
  }

  private buildFromPlanNode(node: PlanNode, command: string, idPrefix = 'root'): GraphDefinition {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const entryId = `${idPrefix}_router`;
    nodes.push({ id: entryId, kind: 'router' });

    const appendNode = (planNode: PlanNode, prefix: string, fromId: string): string => {
      if (planNode.kind === 'agent') {
        const nodeId = `${prefix}_agent_${planNode.agentKey}`;
        nodes.push({
          id: nodeId,
          kind: 'agent',
          agentKey: planNode.agentKey,
          intent: planNode.intent,
          command: planNode.command ?? command,
        });
        edges.push({ from: fromId, to: nodeId });
        return nodeId;
      }

      if (planNode.kind === 'supervisor') {
        const supId = `${prefix}_supervisor_${planNode.agentKey}`;
        nodes.push({
          id: supId,
          kind: 'supervisor',
          agentKey: planNode.agentKey,
          intent: planNode.intent,
          command: planNode.command ?? command,
        });
        edges.push({ from: fromId, to: supId });
        if (planNode.subPlan) {
          const subGraph = this.buildFromPlanNode(planNode.subPlan, command, `${prefix}_sub`);
          nodes.push({
            id: `${prefix}_subgraph`,
            kind: 'subgraph',
            subgraph: subGraph,
          });
          edges.push({ from: supId, to: `${prefix}_subgraph` });
          return `${prefix}_subgraph`;
        }
        return supId;
      }

      if (planNode.kind === 'group') {
        if (planNode.mode === 'parallel' && planNode.children.length > 1) {
          const forkId = `${prefix}_fork`;
          const joinId = `${prefix}_join`;
          nodes.push({ id: forkId, kind: 'parallel_fork' });
          nodes.push({ id: joinId, kind: 'parallel_join' });
          edges.push({ from: fromId, to: forkId });
          for (let i = 0; i < planNode.children.length; i++) {
            const childPrefix = `${prefix}_p${i}`;
            const childEntry = `${childPrefix}_router`;
            const childLast = appendNode(planNode.children[i]!, childPrefix, forkId);
            edges.push({ from: childLast, to: joinId });
          }
          return joinId;
        }

        let prev = fromId;
        for (let i = 0; i < planNode.children.length; i++) {
          prev = appendNode(planNode.children[i]!, `${prefix}_s${i}`, prev);
        }
        return prev;
      }

      return fromId;
    };

    const lastId = appendNode(node, idPrefix, entryId);
    const mergeId = `${idPrefix}_merge`;
    nodes.push({ id: mergeId, kind: 'merge' });
    edges.push({ from: lastId, to: mergeId });
    return { nodes, edges, entryNodeId: entryId };
  }
}
