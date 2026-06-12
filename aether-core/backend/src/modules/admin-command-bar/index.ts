import { Router } from 'express';
import { AdminController } from './api/controllers/AdminController';
import { ObservabilityController } from './api/controllers/ObservabilityController';

const router = Router();
const controller = new AdminController();
const observability = new ObservabilityController();

router.post('/command', ...controller.executeCommand);
router.post('/command/:commandId/undo', ...controller.undoCommand);
router.get('/suggestions', ...controller.getSuggestions);
router.post('/ui-event', ...controller.recordUiEvent);
router.get('/dashboard', ...controller.getDashboardSummary);
router.get('/commands', ...controller.getCommandHistory);
router.get('/activity', ...controller.getActivityFeed);
router.get('/notifications', ...controller.getNotifications);
router.patch('/notifications/:id/read', ...controller.markNotificationRead);
router.post('/notifications/mark-all-read', ...controller.markAllNotificationsRead);
router.delete('/notifications/:id', ...controller.dismissNotification);
router.get('/workflows/:runId', ...controller.getWorkflowTrace);
router.get('/autonomy', ...controller.getAutonomyMetrics);
router.get('/autonomy/trace', ...controller.getAutonomyTrace);
router.get('/explain', ...controller.getExplainability);
router.get('/truth-status', ...controller.getTruthStatus);
router.get('/operating-metrics', ...controller.getOperatingMetrics);
router.get('/policies/approval', ...controller.getApprovalPolicy);
router.put('/policies/approval', ...controller.updateApprovalPolicy);
router.get('/settings', ...controller.getSettings);
router.put('/settings', ...controller.updateSettings);
router.get('/connected-services', ...controller.getConnectedServices);
router.get('/events/stream', ...controller.streamEvents);
router.post('/truth-review', ...controller.completeTruthReview);
router.get('/observability/status', ...observability.getStatus);
router.post('/observability/probe-error', ...observability.probeError);

export default router;
