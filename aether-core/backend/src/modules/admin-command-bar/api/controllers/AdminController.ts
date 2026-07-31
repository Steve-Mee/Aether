import { AdminCommandController } from './AdminCommandController';
import { AdminOverviewController } from './AdminOverviewController';
import { AdminExplainabilityController } from './AdminExplainabilityController';
import { AdminNotificationsController } from './AdminNotificationsController';
import { AdminSettingsController } from './AdminSettingsController';

export class AdminController {
  private readonly command = new AdminCommandController();
  private readonly overview = new AdminOverviewController();
  private readonly explainability = new AdminExplainabilityController();
  private readonly notifications = new AdminNotificationsController();
  private readonly settings = new AdminSettingsController();

  executeCommand = this.command.executeCommand;
  resumeAgentRun = this.command.resumeAgentRun;
  cancelAgentRun = this.command.cancelAgentRun;
  getAgentRun = this.command.getAgentRun;
  undoCommand = this.command.undoCommand;
  executeBrainTool = this.command.executeBrainTool;
  rejectBrainTool = this.command.rejectBrainTool;
  getSuggestions = this.command.getSuggestions;
  getProactiveSuggestions = this.command.getProactiveSuggestions;
  dismissProactiveSuggestion = this.command.dismissProactiveSuggestion;
  snoozeProactiveSuggestion = this.command.snoozeProactiveSuggestion;
  executeProactiveSuggestion = this.command.executeProactiveSuggestion;
  getDashboardSummary = this.command.getDashboardSummary;
  recordUiEvent = this.command.recordUiEvent;
  getCommandHistory = this.command.getCommandHistory;
  getRunSharedMemory = this.command.getRunSharedMemory;

  getActivityFeed = this.overview.getActivityFeed;
  getAgentsRoster = this.overview.getAgentsRoster;
  getAgentMetrics = this.overview.getAgentMetrics;
  getOverviewFeed = this.overview.getOverviewFeed;
  getOverviewHandoffs = this.overview.getOverviewHandoffs;
  getAgentActivity = this.overview.getAgentActivity;
  getWorkflowTrace = this.overview.getWorkflowTrace;
  getAutonomyMetrics = this.overview.getAutonomyMetrics;
  getTruthStatus = this.overview.getTruthStatus;
  getOperatingMetrics = this.overview.getOperatingMetrics;
  getExplainability = this.explainability.getExplainability;
  getExplainabilityDiff = this.explainability.getExplainabilityDiff;
  exportExplainability = this.explainability.exportExplainability;
  auditExportExplainability = this.explainability.auditExportExplainability;
  getAutonomyTrace = this.explainability.getAutonomyTrace;
  completeTruthReview = this.overview.completeTruthReview;
  streamEvents = this.overview.streamEvents;

  getNotifications = this.notifications.getNotifications;
  getWebPushVapidKey = this.notifications.getWebPushVapidKey;
  subscribeWebPush = this.notifications.subscribeWebPush;
  unsubscribeWebPush = this.notifications.unsubscribeWebPush;
  markNotificationRead = this.notifications.markNotificationRead;
  markAllNotificationsRead = this.notifications.markAllNotificationsRead;
  dismissNotification = this.notifications.dismissNotification;

  getApprovalPolicy = this.settings.getApprovalPolicy;
  updateApprovalPolicy = this.settings.updateApprovalPolicy;
  simulateAutonomy = this.settings.simulateAutonomy;
  getSettings = this.settings.getSettings;
  updateSettings = this.settings.updateSettings;
  getConnectedServices = this.settings.getConnectedServices;
  listGoals = this.settings.listGoals;
  getGoal = this.settings.getGoal;
  createGoal = this.settings.createGoal;
  updateGoal = this.settings.updateGoal;
  deleteGoal = this.settings.deleteGoal;
  refreshGoal = this.settings.refreshGoal;
  getGoalSuggestions = this.settings.getGoalSuggestions;
  listAiGoalSuggestions = this.settings.listAiGoalSuggestions;
  acceptAiGoalSuggestion = this.settings.acceptAiGoalSuggestion;
  dismissAiGoalSuggestion = this.settings.dismissAiGoalSuggestion;
  getGoalConflicts = this.settings.getGoalConflicts;
  buildGoalPlan = this.settings.buildGoalPlan;
  getActiveGoalPlan = this.settings.getActiveGoalPlan;
}
