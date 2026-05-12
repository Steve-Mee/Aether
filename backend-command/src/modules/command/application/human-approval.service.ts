// src/modules/command/application/human-approval.service.ts
import { prisma } from '../../../infrastructure/database/prisma';

export class HumanApprovalService {
  static async queueForApproval(params: any) {
    await prisma.humanApprovalQueue.create({ data: { actionId: params.actionId, merchantId: params.merchantId, actionType: params.proposedAction.type, payload: params.proposedAction.payload, confidence: params.originalDecision.confidence, riskLevel: params.originalDecision.riskLevel, status: 'PENDING' } });
  }

  static async approve(actionId: string, approvedBy: string) {
    await prisma.humanApprovalQueue.update({ where: { actionId }, data: { status: 'APPROVED', approvedBy, approvedAt: new Date() } });
    return { success: true };
  }

  static async reject(actionId: string, rejectedBy: string, reason?: string) {
    await prisma.humanApprovalQueue.update({ where: { actionId }, data: { status: 'REJECTED', approvedBy: rejectedBy, approvedAt: new Date(), rejectionReason: reason } });
    return { success: true };
  }
}