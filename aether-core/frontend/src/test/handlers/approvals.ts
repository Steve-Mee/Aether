import { http, HttpResponse } from 'msw';
import { getMswApprovals, mswResolveApproval } from './state';

export const approvalsHandlers = [
  http.get('*/api/approvals', () => HttpResponse.json(getMswApprovals())),
  http.post('*/api/approvals/:id/resolve', ({ params }) => {
    try {
      const id = String(params.id);
      mswResolveApproval(id);
      return HttpResponse.json({ success: true });
    } catch (e) {
      return HttpResponse.json(
        { error: e instanceof Error ? e.message : 'Resolve failed' },
        { status: 500 },
      );
    }
  }),
  http.post('*/api/approvals/auto-apply', () =>
    HttpResponse.json({ applied: 0, skipped: 0, skippedIds: [] }),
  ),
];
