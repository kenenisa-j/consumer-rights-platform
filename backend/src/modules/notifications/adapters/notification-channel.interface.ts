export interface NotificationPayload {
  recipientUserId: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  caseId?: string | null;
  type: string;
  title: string;
  messageBody: string;
}

export interface NotificationChannelAdapter {
  readonly channelName: string;
  send(payload: NotificationPayload): Promise<void>;
}

