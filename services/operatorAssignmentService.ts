import { Quote, User, UserRole, Message } from '../types';
import { agentService } from './agentService';
import { auditLogService } from './auditLogService';

class OperatorAssignmentService {
  
  // Get quotes assigned to a specific operator
  async getAssignedQuotes(operatorId: string): Promise<Quote[]> {
    return await agentService.getOperatorAssignments(operatorId);
  }

  // Accept an assignment
  acceptAssignment(quote: Quote): void {
    // 1. Create System Message for Chat (Notification)
    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: quote.operatorId || 'unknown',
        senderName: quote.operatorName || 'Operator',
        senderRole: UserRole.OPERATOR,
        content: "✅ Operator has ACCEPTED the assignment.",
        timestamp: new Date().toISOString(),
        isSystem: true
    };

    // 2. Update Quote Status
    const updatedQuote: Quote = {
      ...quote,
      operatorStatus: 'ACCEPTED',
      messages: [...quote.messages, msg]
    };
    agentService.updateQuote(updatedQuote);

    // 3. Audit Log
    const opUser: User = { id: quote.operatorId || 'unknown', name: quote.operatorName || 'Operator', role: UserRole.OPERATOR, email: '', isVerified: true };
    
    auditLogService.logAction({
      entityType: 'OPERATOR_ASSIGNMENT',
      entityId: quote.id,
      action: 'ASSIGNMENT_ACCEPTED',
      description: `Operator ${quote.operatorName} accepted the assignment.`,
      user: opUser,
      newValue: { operatorStatus: 'ACCEPTED' }
    });
  }

  // Decline an assignment
  declineAssignment(quote: Quote, reason: string): void {
    // 1. Create System Message for Chat (Notification)
    const msg: Message = {
        id: `sys_${Date.now()}`,
        senderId: quote.operatorId || 'unknown',
        senderName: quote.operatorName || 'Operator',
        senderRole: UserRole.OPERATOR,
        content: `❌ Operator DECLINED the assignment. Reason: "${reason}"`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };

    // 2. Update Quote Status
    const updatedQuote: Quote = {
      ...quote,
      operatorStatus: 'DECLINED',
      operatorDeclineReason: reason,
      messages: [...quote.messages, msg]
    };
    agentService.updateQuote(updatedQuote);

    // 3. Audit Log
    const opUser: User = { id: quote.operatorId || 'unknown', name: quote.operatorName || 'Operator', role: UserRole.OPERATOR, email: '', isVerified: true };

    auditLogService.logAction({
      entityType: 'OPERATOR_ASSIGNMENT',
      entityId: quote.id,
      action: 'ASSIGNMENT_DECLINED',
      description: `Operator ${quote.operatorName} declined the assignment. Reason: ${reason}`,
      user: opUser,
      newValue: { operatorStatus: 'DECLINED', reason }
    });
  }

  // Update workflow status (e.g. In Progress, Completed)
  updateWorkflowStatus(quote: Quote, status: 'IN_PROGRESS' | 'COMPLETED'): void {
      const updatedQuote: Quote = {
          ...quote,
          status: status as any
      };
      agentService.updateQuote(updatedQuote);
  }
}

export const operatorAssignmentService = new OperatorAssignmentService();