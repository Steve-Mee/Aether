import type { MemoryScope } from './runMemoryConfig';
import {
  canListRunMemoryNamespace,
  canReadRunMemoryKey,
  canWriteRunMemoryKey,
} from './runMemoryConfig';
import { validateSharedMemoryValue } from './sharedMemorySchema';
import type { RunWorkingMemoryPort } from './RunWorkingMemoryPort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface RunMemoryToolsDeps {
  runMemory: RunWorkingMemoryPort;
}

export function readRunMemoryTool(deps: RunMemoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'readRunMemory',
      description: 'Read a value from run-scoped working memory (shared blackboard for this command run)',
      parameters: {
        namespace: {
          type: 'string',
          required: false,
          description: 'Memory namespace (default: shared). Also readable: your agent namespace and cross-read scopes.',
        },
        key: { type: 'string', required: true, description: 'Memory key' },
        scope: {
          type: 'string',
          required: false,
          description: 'Memory scope: run (default) or merchant (cross-session)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'multi-agent',
    },
    validate(input) {
      if (!String(input.key ?? '').trim()) return { ok: false, error: 'key is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const runId = ctx.parentRunId;
      if (!runId) {
        return { success: false, error: 'No run context — readRunMemory requires parentRunId' };
      }
      const namespace = String(input.namespace ?? 'shared').trim();
      const key = String(input.key).trim();
      const scope = (String(input.scope ?? 'run').trim() as MemoryScope) || 'run';
      const agentKey = ctx.agentKey ?? 'admin';
      if (!canReadRunMemoryKey(agentKey, namespace, key)) {
        return { success: false, error: `Cannot read namespace ${namespace}/${key}` };
      }
      const row = await deps.runMemory.getWithVersion(ctx.tenantId, runId, namespace, key, scope);
      return {
        success: true,
        namespace,
        key,
        scope,
        value: row?.value ?? null,
        version: row?.version ?? 0,
      };
    },
  };
}

export function listRunMemoryTool(deps: RunMemoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listRunMemory',
      description: 'List keys and values from run-scoped working memory for allowed namespaces',
      parameters: {
        namespace: {
          type: 'string',
          required: false,
          description: 'Filter by namespace (default: all readable namespaces)',
        },
        scope: {
          type: 'string',
          required: false,
          description: 'Memory scope: run (default) or merchant',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'multi-agent',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const runId = ctx.parentRunId;
      if (!runId) {
        return { success: false, error: 'No run context — listRunMemory requires parentRunId' };
      }
      const agentKey = ctx.agentKey ?? 'admin';
      const filterNs = input.namespace ? String(input.namespace).trim() : undefined;
      const scope = (String(input.scope ?? 'run').trim() as MemoryScope) || 'run';

      if (filterNs && !canListRunMemoryNamespace(agentKey, filterNs)) {
        return { success: false, error: `Cannot list namespace ${filterNs}` };
      }

      const all = await deps.runMemory.list(ctx.tenantId, runId, filterNs, scope);
      const entries = all.filter((e) => canReadRunMemoryKey(agentKey, e.namespace, e.key));
      return { success: true, entries };
    },
  };
}

export function writeRunMemoryTool(deps: RunMemoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'writeRunMemory',
      description: 'Write a value to run-scoped working memory for other agents in this run',
      parameters: {
        namespace: {
          type: 'string',
          required: false,
          description: 'Memory namespace (default: your agent key; use shared for cross-agent intel)',
        },
        key: { type: 'string', required: true, description: 'Memory key' },
        value: { type: 'object', required: true, description: 'JSON-serializable value' },
        expectedVersion: {
          type: 'number',
          required: false,
          description: 'Optional version for optimistic concurrency (from readRunMemory)',
        },
        scope: {
          type: 'string',
          required: false,
          description: 'Memory scope: run (default) or merchant',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'multi-agent',
    },
    validate(input) {
      if (!String(input.key ?? '').trim()) return { ok: false, error: 'key is required' };
      if (input.value === undefined) return { ok: false, error: 'value is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const runId = ctx.parentRunId;
      if (!runId) {
        return { success: false, error: 'No run context — writeRunMemory requires parentRunId' };
      }
      const agentKey = ctx.agentKey ?? 'admin';
      const namespace = String(input.namespace ?? agentKey).trim();
      const key = String(input.key).trim();
      const scope = (String(input.scope ?? 'run').trim() as MemoryScope) || 'run';
      if (!canWriteRunMemoryKey(agentKey, namespace, key, scope)) {
        return { success: false, error: `Agent ${agentKey} cannot write ${namespace}/${key}` };
      }
      if (namespace === 'shared') {
        const schemaCheck = validateSharedMemoryValue(key, input.value);
        if (!schemaCheck.ok) {
          return { success: false, error: schemaCheck.error };
        }
      }

      const expectedVersion =
        input.expectedVersion !== undefined ? Number(input.expectedVersion) : undefined;

      const writeBase = {
        tenantId: ctx.tenantId,
        runId,
        namespace,
        key,
        value: input.value,
        updatedByAgentKey: agentKey,
        scope,
      };

      let result: { ok: boolean; version: number; conflict?: unknown };

      if (expectedVersion !== undefined && !Number.isNaN(expectedVersion)) {
        result = await deps.runMemory.compareAndSet({ ...writeBase, expectedVersion });
      } else {
        await deps.runMemory.set(writeBase);
        result = { ok: true, version: 0 };
      }

      if (!result.ok) {
        const retry = await deps.runMemory.mergeWithVersion({
          ...writeBase,
          expectedVersion: result.version,
        });
        if (retry.ok) {
          return { success: true, namespace, key, scope, version: retry.version, retried: true };
        }
        return {
          success: false,
          error: 'Version conflict — re-read and retry',
          conflict: retry.conflict ?? result.conflict,
          version: retry.version,
        };
      }

      return { success: true, namespace, key, scope, version: result.version };
    },
  };
}

export function appendRunMemoryTool(deps: RunMemoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'appendRunMemory',
      description: 'Append a value to an array key in run-scoped working memory',
      parameters: {
        namespace: {
          type: 'string',
          required: false,
          description: 'Memory namespace (default: shared)',
        },
        key: { type: 'string', required: true, description: 'Memory key (array)' },
        value: { type: 'object', required: true, description: 'Item to append' },
        maxItems: { type: 'number', required: false, description: 'Max array length (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'multi-agent',
    },
    validate(input) {
      if (!String(input.key ?? '').trim()) return { ok: false, error: 'key is required' };
      if (input.value === undefined) return { ok: false, error: 'value is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const runId = ctx.parentRunId;
      if (!runId) {
        return { success: false, error: 'No run context — appendRunMemory requires parentRunId' };
      }
      const agentKey = ctx.agentKey ?? 'admin';
      const namespace = String(input.namespace ?? 'shared').trim();
      const key = String(input.key).trim();
      if (!canWriteRunMemoryKey(agentKey, namespace, key)) {
        return { success: false, error: `Agent ${agentKey} cannot write ${namespace}/${key}` };
      }
      await deps.runMemory.appendToArray({
        tenantId: ctx.tenantId,
        runId,
        namespace,
        key,
        value: input.value,
        updatedByAgentKey: agentKey,
        maxItems: input.maxItems !== undefined ? Number(input.maxItems) : undefined,
      });
      return { success: true, namespace, key };
    },
  };
}
