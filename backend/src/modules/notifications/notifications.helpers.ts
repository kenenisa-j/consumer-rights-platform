import { NotificationType, CaseLifecycleEvent } from './notifications.types';

export interface FormattedNotification {
  target: 'CONSUMER' | 'BUSINESS' | 'OFFICER' | 'OFFICE';
  type: NotificationType;
  title: string;
  message: string;
}

export function buildLifecycleNotifications(event: CaseLifecycleEvent): FormattedNotification[] {
  const ref = event.referenceNumber;
  const alias = event.complainantAlias || 'A consumer';
  const notifications: FormattedNotification[] = [];

  switch (event.type) {
    case NotificationType.COMPLAINT_SUBMITTED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Complaint Submitted Successfully',
        message: `Your complaint has been submitted under reference ${ref}. You will receive updates as it progresses.`,
      });
      break;

    case NotificationType.NEW_COMPLAINT_FILED:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'New Complaint Filed',
        message: `${alias} has filed complaint ${ref} regarding your business. Please review and respond.`,
      });
      break;

    case NotificationType.BUSINESS_RESPONSE:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Business Responded',
        message: `The merchant has posted a response to your complaint ${ref}.`,
      });
      break;

    case NotificationType.SETTLEMENT_OFFERED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Settlement Offer Proposed',
        message: `A settlement offer has been made for complaint ${ref}. Please review the terms.`,
      });
      break;

    case NotificationType.SETTLEMENT_ACCEPTED:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Settlement Offer Accepted',
        message: `${alias} accepted the settlement offer for complaint ${ref}.`,
      });
      break;

    case NotificationType.SETTLEMENT_REJECTED:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Settlement Offer Rejected',
        message: `${alias} declined the settlement offer for complaint ${ref}.`,
      });
      break;

    case NotificationType.CASE_ESCALATED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Complaint Escalated to Government',
        message: `Your complaint ${ref} was escalated to the Trade Bureau for official regulatory review.`,
      });
      notifications.push({
        target: 'OFFICE',
        type: event.type,
        title: 'New Escalated Complaint Received',
        message: `Case ${ref} has been escalated to your office for triage and review.`,
      });
      break;

    case NotificationType.OFFICER_ASSIGNED:
      notifications.push({
        target: 'OFFICER',
        type: event.type,
        title: 'Case Assigned to You',
        message: `You have been assigned as the lead officer for case ${ref}.`,
      });
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Officer Assigned',
        message: `A government trade officer has been assigned to investigate case ${ref}.`,
      });
      break;

    case NotificationType.INSPECTION_SCHEDULED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Inspection Scheduled',
        message: `A regulatory inspection has been scheduled for case ${ref}.`,
      });
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Regulatory Inspection Scheduled',
        message: `A Bureau inspection has been scheduled regarding complaint ${ref}.`,
      });
      break;

    case NotificationType.INSPECTION_COMPLETED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Investigation Inspection Completed',
        message: `The regulatory inspection for case ${ref} has been completed.`,
      });
      break;

    case NotificationType.DECISION_ISSUED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Government Decision Issued',
        message: `A formal government decision and remedy order has been issued for case ${ref}.`,
      });
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Bureau Resolution Order Issued',
        message: `A formal decision has been issued regarding complaint ${ref}. Corrective action may be required.`,
      });
      break;

    case NotificationType.RESOLUTION_UPDATED:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Resolution Order Updated',
        message: `The terms or deadline for case ${ref} have been updated.`,
      });
      break;

    case NotificationType.COMPLIANCE_VERIFIED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Remedy Compliance Verified',
        message: `Government officers have verified business compliance for case ${ref}.`,
      });
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Compliance Verification Completed',
        message: `Your corrective compliance for case ${ref} has been reviewed and verified.`,
      });
      break;

    case NotificationType.CASE_CLOSED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Case Closed',
        message: `Complaint ${ref} has been closed. Thank you for using the Consumer Protection Portal.`,
      });
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Complaint Closed',
        message: `Complaint ${ref} has been formally closed.`,
      });
      break;

    case NotificationType.CASE_REOPENED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Case Reopened',
        message: `Case ${ref} has been reopened upon administrative review.`,
      });
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Case Reopened',
        message: `Case ${ref} has been reopened for continued administrative handling.`,
      });
      break;

    case NotificationType.TRANSFER_INITIATED:
      notifications.push({
        target: 'OFFICE',
        type: event.type,
        title: 'Incoming Case Transfer Pending',
        message: `A transfer for case ${ref} has been dispatched to your office awaiting acceptance.`,
      });
      break;

    case NotificationType.TRANSFER_ACCEPTED:
      notifications.push({
        target: 'CONSUMER',
        type: event.type,
        title: 'Case Transferred',
        message: `Case ${ref} was transferred to a higher jurisdiction for further handling.`,
      });
      notifications.push({
        target: 'OFFICER',
        type: event.type,
        title: 'Transfer Accepted',
        message: `The transfer for case ${ref} was accepted by the destination office.`,
      });
      break;

    case NotificationType.TRANSFER_RETURNED:
      notifications.push({
        target: 'OFFICER',
        type: event.type,
        title: 'Transfer Returned',
        message: `Transfer for case ${ref} was returned by the receiving office. Case custody remains with your office.`,
      });
      break;

    case NotificationType.NEW_MESSAGE:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'New Message on Case',
        message: `${alias} sent a new message regarding complaint ${ref}.`,
      });
      break;

    case NotificationType.DEADLINE_APPROACHING:
      notifications.push({
        target: 'BUSINESS',
        type: event.type,
        title: 'Action Deadline Approaching',
        message: `Compliance or response deadline for case ${ref} is approaching.`,
      });
      notifications.push({
        target: 'OFFICER',
        type: event.type,
        title: 'Case SLA Deadline Approaching',
        message: `SLA or compliance deadline for case ${ref} requires officer attention.`,
      });
      break;
  }

  return notifications;
}

