import type { AgentPlan } from './types/AgentPlan';

export type AgentMessageRole =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool'
  | 'proposal'
  | 'plan'
  | 'reflection';

export interface AgentTextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentToolMessage {
  role: 'tool';
  toolCallId: string;
  tool: string;
  output: string;
  status?: 'ok' | 'error' | 'proposed';
}

export interface AgentProposalMessage {
  role: 'proposal';
  proposalId: string;
  tool: string;
  summary: string;
  risk: string;
}

export interface AgentPlanMessage {
  role: 'plan';
  goal: string;
  steps: AgentPlan['steps'];
  reasoning?: string;
  revision?: number;
  supersedes?: string;
}

export interface AgentReflectionMessage {
  role: 'reflection';
  observation: string;
  nextAction: string;
  planStep?: number;
}

export type AgentMessage =
  | AgentTextMessage
  | AgentToolMessage
  | AgentProposalMessage
  | AgentPlanMessage
  | AgentReflectionMessage;

export class AgentTranscript {
  private messages: AgentMessage[] = [];

  constructor(initial?: AgentMessage[]) {
    if (initial) this.messages = [...initial];
  }

  getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  add(message: AgentMessage): void {
    this.messages.push(message);
  }

  addSystem(content: string): void {
    this.add({ role: 'system', content });
  }

  addUser(content: string): void {
    this.add({ role: 'user', content });
  }

  addAssistant(content: string): void {
    this.add({ role: 'assistant', content });
  }

  addPlan(plan: AgentPlan): void {
    this.add({
      role: 'plan',
      goal: plan.goal,
      steps: plan.steps,
      reasoning: plan.reasoning,
      revision: plan.revision,
      supersedes: plan.supersedes,
    });
  }

  addReflection(params: { observation: string; nextAction: string; planStep?: number }): void {
    this.add({
      role: 'reflection',
      observation: params.observation,
      nextAction: params.nextAction,
      planStep: params.planStep,
    });
  }

  getPlan(): AgentPlan | null {
    const msg = this.getLatestPlanMessage();
    if (!msg) return null;
    return {
      goal: msg.goal,
      steps: msg.steps,
      reasoning: msg.reasoning,
      revision: msg.revision,
      supersedes: msg.supersedes,
    };
  }

  getLatestPlanMessage(): AgentPlanMessage | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m?.role === 'plan') return m;
    }
    return null;
  }

  addToolResult(params: {
    toolCallId: string;
    tool: string;
    output: string;
    status?: 'ok' | 'error' | 'proposed';
  }): void {
    this.add({
      role: 'tool',
      toolCallId: params.toolCallId,
      tool: params.tool,
      output: params.output,
      status: params.status,
    });
  }

  addProposal(params: {
    proposalId: string;
    tool: string;
    summary: string;
    risk: string;
  }): void {
    this.add({
      role: 'proposal',
      proposalId: params.proposalId,
      tool: params.tool,
      summary: params.summary,
      risk: params.risk,
    });
  }

  /** Flat prompt for legacy generate() path */
  toPromptBlock(): string {
    return this.messages
      .map((m) => {
        if (m.role === 'tool') {
          return `[tool:${m.tool}] ${m.output}`;
        }
        if (m.role === 'proposal') {
          return `[proposal:${m.tool}] ${m.summary} (${m.proposalId})`;
        }
        if (m.role === 'plan') {
          const rev = m.revision ? ` (rev ${m.revision})` : '';
          const steps = m.steps.map((s) => `${s.index}. ${s.label}`).join('; ');
          return `[plan${rev}] Doel: ${m.goal}. Stappen: ${steps}${m.reasoning ? `. Reden: ${m.reasoning}` : ''}`;
        }
        if (m.role === 'reflection') {
          return `[reflection] ${m.observation} (actie: ${m.nextAction})`;
        }
        return `[${m.role}] ${m.content}`;
      })
      .join('\n\n');
  }

  toJSON(): AgentMessage[] {
    return this.getMessages();
  }

  static fromJSON(data: unknown): AgentTranscript {
    if (!Array.isArray(data)) return new AgentTranscript();
    return new AgentTranscript(data as AgentMessage[]);
  }
}
