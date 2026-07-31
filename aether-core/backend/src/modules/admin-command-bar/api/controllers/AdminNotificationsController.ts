import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { getWebPushPublicKey } from '../../../../shared/notifications/WebPushNotificationDispatcher';
import {
  markAllNotificationsReadSchema,
  webPushSubscribeSchema,
  webPushUnsubscribeSchema,
} from '../schemas/adminSchemas';

export class AdminNotificationsController {
  getNotifications = [
    requireViewer,
    async (req: Request, res: Response) => {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const groupKey = req.query.groupKey ? String(req.query.groupKey) : undefined;
      const actorId = req.actorId ?? 'api-key-user';
      const { notificationInboxService } = getCompositionRoot();
      const inbox = await notificationInboxService.buildNotificationInbox(
        req.tenantId!,
        actorId,
        limit,
        cursor,
        groupKey,
      );
      res.json(inbox);
    },
  ];

  getWebPushVapidKey = [
    requireViewer,
    (_req: Request, res: Response) => {
      res.json({ publicKey: getWebPushPublicKey() });
    },
  ];

  subscribeWebPush = [
    requireViewer,
    validateBody(webPushSubscribeSchema),
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const body = req.body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
        userAgent?: string;
      };
      const { adminData } = getCompositionRoot();
      await adminData.upsertPushSubscription({
        tenantId: req.tenantId!,
        actorId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
      });
      res.status(204).send();
    },
  ];

  unsubscribeWebPush = [
    requireViewer,
    validateBody(webPushUnsubscribeSchema),
    async (req: Request, res: Response) => {
      const body = req.body as { endpoint: string };
      const { adminData } = getCompositionRoot();
      await adminData.deletePushSubscriptionByEndpoint(body.endpoint);
      res.status(204).send();
    },
  ];

  markNotificationRead = [
    requireViewer,
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const { notificationReadStateService } = getCompositionRoot();
      await notificationReadStateService.markNotificationRead(req.tenantId!, actorId, req.params.id);
      res.status(204).send();
    },
  ];

  markAllNotificationsRead = [
    requireViewer,
    validateBody(markAllNotificationsReadSchema),
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const body = req.body as { ids?: string[] };
      const { notificationInboxService, notificationReadStateService } = getCompositionRoot();
      const ids =
        body.ids ??
        (
          await notificationInboxService.buildNotificationInbox(req.tenantId!, actorId, 50)
        ).notifications.map((n) => n.id);
      if (ids.length > 0) {
        await notificationReadStateService.markAllNotificationsRead(req.tenantId!, actorId, ids);
      }
      res.status(204).send();
    },
  ];

  dismissNotification = [
    requireViewer,
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const { notificationReadStateService } = getCompositionRoot();
      await notificationReadStateService.dismissNotification(req.tenantId!, actorId, req.params.id);
      res.status(204).send();
    },
  ];
}
