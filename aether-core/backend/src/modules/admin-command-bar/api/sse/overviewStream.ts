import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { proactiveSuggestionEmitter } from '../../../../ai/intelligence/proactive/ProactiveSuggestionEmitter';
import { isProactiveSseEnabled } from '../../../../ai/intelligence/proactive/proactiveConfig';
import { decodeOverviewCursor } from '../../application/services/OverviewFeedService';
import {
  overviewFeedEmitter,
  isOverviewSseEnabled,
} from '../../application/services/OverviewFeedEmitter';
import {
  notificationEmitter,
  isNotificationSseEnabled,
  type NotificationPushEvent,
  type NotificationStateChangedEvent,
} from '../../application/services/notifications/NotificationEmitter';
import { buildDashboardPayload } from '../../application/services/DashboardPayloadService';
import { emailAnalyticsAdapter } from '../../../aether-mail/infrastructure/adapters/PrismaEmailAnalyticsAdapter';

export async function handleOverviewStream(req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const tenantId = req.tenantId!;
  let closed = false;

  const push = async () => {
    if (closed) return;
    try {
      const { proactiveSuggestionService } = getCompositionRoot();
      const [payload, proactiveCount] = await Promise.all([
        buildDashboardPayload(tenantId, emailAnalyticsAdapter),
        proactiveSuggestionService.countActive(tenantId),
      ]);
      res.write(`data: ${JSON.stringify({ ...payload, proactiveCount })}\n\n`);
    } catch {
      if (!closed) res.write(`event: error\ndata: {"message":"stream tick failed"}\n\n`);
    }
  };

  const pushProactive = (event: {
    type: string;
    ids: string[];
    count: number;
    ts: number;
  }) => {
    if (closed) return;
    res.write(
      `data: ${JSON.stringify({
        type: 'proactive_updated',
        proactiveCount: event.count,
        suggestionIds: event.ids,
        eventType: event.type,
        ts: event.ts,
      })}\n\n`
    );
  };

  await push();
  const interval = setInterval(push, 5000);

  let unsubscribe: (() => void) | undefined;
  let unsubscribeOverview: (() => void) | undefined;
  let unsubscribeNotification: (() => void) | undefined;
  if (isProactiveSseEnabled()) {
    unsubscribe = proactiveSuggestionEmitter.subscribe(tenantId, pushProactive);
  }

  const pushNotification = (event: NotificationPushEvent | NotificationStateChangedEvent) => {
    if (closed) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (isNotificationSseEnabled()) {
    unsubscribeNotification = notificationEmitter.subscribe(tenantId, pushNotification);
  }

  const pushOverviewItem = (event: {
    type: string;
    item: { kind: string; at: string; id: string; cursor: string; payload: Record<string, unknown> };
    ts: number;
  }) => {
    if (closed) return;
    res.write(
      `data: ${JSON.stringify({
        type: 'overview_item',
        event: event.type,
        item: event.item,
        ts: event.ts,
      })}\n\n`,
    );
  };

  if (isOverviewSseEnabled()) {
    unsubscribeOverview = overviewFeedEmitter.subscribe(tenantId, pushOverviewItem);
  }

  const sinceCursorRaw = req.query.sinceCursor ? String(req.query.sinceCursor) : undefined;
  const sinceCursor = decodeOverviewCursor(sinceCursorRaw);
  if (sinceCursor || sinceCursorRaw === '') {
    try {
      const { overviewFeedService } = getCompositionRoot();
      const missed = await overviewFeedService.listOverviewFeedEventsSince(tenantId, sinceCursor, 50);
      for (const item of missed.reverse()) {
        pushOverviewItem({
          type: 'created',
          item,
          ts: Date.now(),
        });
      }
    } catch {
      /* replay best-effort */
    }
  }

  req.on('close', () => {
    closed = true;
    clearInterval(interval);
    unsubscribe?.();
    unsubscribeOverview?.();
    unsubscribeNotification?.();
  });
}
