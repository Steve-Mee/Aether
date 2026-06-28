import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface MailToolsDeps {
  adminData: AdminDataPort;
}

export function getEmailSummaryTool(deps: MailToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getEmailSummary',
      description: 'Get mail inbox summary: unread and auto-replied counts',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'aether-mail',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const unread = await deps.adminData.countEmailsByStatus(ctx.tenantId, [
        'received',
        'escalated',
      ]);
      const replied = await deps.adminData.countEmailsByStatus(ctx.tenantId, ['replied']);
      return {
        success: true,
        awaitingAction: unread,
        autoReplied: replied,
        message: `Mail: ${unread} awaiting action, ${replied} auto-replied`,
      };
    },
  };
}
