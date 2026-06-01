import { Router } from 'express';
import { AdminController } from './api/controllers/AdminController';

const router = Router();
const controller = new AdminController();

router.post('/command', ...controller.executeCommand);
router.post('/ui-event', ...controller.recordUiEvent);
router.get('/dashboard', ...controller.getDashboardSummary);
router.get('/commands', ...controller.getCommandHistory);
router.get('/workflows/:runId', ...controller.getWorkflowTrace);
router.get('/autonomy', ...controller.getAutonomyMetrics);
router.get('/autonomy/trace', ...controller.getAutonomyTrace);
router.get('/explain', ...controller.getExplainability);
router.get('/truth-status', ...controller.getTruthStatus);
router.get('/operating-metrics', ...controller.getOperatingMetrics);
router.get('/policies/approval', ...controller.getApprovalPolicy);
router.put('/policies/approval', ...controller.updateApprovalPolicy);
router.get('/events/stream', ...controller.streamEvents);
router.post('/truth-review', ...controller.completeTruthReview);

export default router;
