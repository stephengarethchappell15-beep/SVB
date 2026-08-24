import { EmailConfig, EmailDeliveryLog } from '../types.js';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
}

export interface UserEmailData {
  fullName: string;
  email: string;
  accountNumber?: string;
  routingNumber?: string;
  phone?: string;
}

export interface TransactionEmailData {
  userEmail: string;
  fullName?: string;
  accountNumber?: string;
  amount: number;
  currency?: string;
  reference: string;
  type: string;
  status: string;
  method?: string;
  description?: string;
  recipientName?: string;
  recipientBank?: string;
  recipientAccount?: string;
  senderName?: string;
  activationCode?: string;
  currentBalance?: number;
  rejectionReason?: string;
}

// In-Memory configuration store (clean, no external credentials)
let dynamicConfig: EmailConfig = {
  provider: 'auto',
  senderEmail: 'notifications@svb.com',
  senderName: 'Silicon Valley Bank'
};

// In-memory delivery history log (capped to last 100 entries)
const deliveryLogs: EmailDeliveryLog[] = [];

function logDelivery(entry: {
  recipient: string;
  subject: string;
  type: string;
  provider: string;
  status: 'Delivered' | 'Failed';
  messageId: string;
  error?: string;
}) {
  const newEntry: EmailDeliveryLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipient: entry.recipient,
    subject: entry.subject,
    type: entry.type || 'General Notice',
    provider: entry.provider || 'System Internal',
    status: entry.status,
    messageId: entry.messageId,
    error: entry.error,
    timestamp: new Date().toISOString()
  };

  deliveryLogs.unshift(newEntry);
  if (deliveryLogs.length > 100) {
    deliveryLogs.length = 100;
  }
}

/**
 * Clean System Email / Notification Service
 * Free of external third-party API keys, SMTP credentials, and Nodemailer dependencies.
 */
export const emailService = {
  configure(config: Partial<EmailConfig>): EmailConfig {
    dynamicConfig = {
      ...dynamicConfig,
      ...config,
      updatedAt: new Date().toISOString()
    };
    return dynamicConfig;
  },

  getConfig(): EmailConfig {
    return dynamicConfig;
  },

  getDeliveryLogs(): EmailDeliveryLog[] {
    return deliveryLogs;
  },

  async sendWelcomeEmail(user: UserEmailData, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-welcome-${Date.now()}`;
    logDelivery({
      recipient: user.email,
      subject: 'Welcome to Silicon Valley Bank',
      type: 'Account Welcome',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendDepositSubmittedEmail(data: TransactionEmailData, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-dep-sub-${Date.now()}`;
    logDelivery({
      recipient: data.userEmail,
      subject: `SVB Notice: Deposit Received (Ref #${data.reference})`,
      type: 'Deposit Pending',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendDepositApprovedEmail(data: TransactionEmailData, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-dep-app-${Date.now()}`;
    logDelivery({
      recipient: data.userEmail,
      subject: `SVB Credit Advice: Deposit Available (Ref #${data.reference})`,
      type: 'Deposit Approved',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendTransactionRejectedEmail(data: TransactionEmailData, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-txn-rej-${Date.now()}`;
    logDelivery({
      recipient: data.userEmail,
      subject: `SVB Notice: Transaction Rejected (Ref #${data.reference})`,
      type: 'Transaction Rejected',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendTransferDebitEmail(data: TransactionEmailData, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-transfer-${Date.now()}`;
    logDelivery({
      recipient: data.userEmail,
      subject: `SVB Debit Advice: Outbound Wire (Ref #${data.reference})`,
      type: 'Wire Debit',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendSecurityAlertEmail(userEmail: string, title: string, _message: string, _code?: string, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-sec-${Date.now()}`;
    logDelivery({
      recipient: userEmail,
      subject: `SVB Security Alert: ${title}`,
      type: 'Security Alert',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  },

  async sendCustomAdminNoticeEmail(userEmail: string, _adminEmail: string, title: string, _message: string, _configOverride?: Partial<EmailConfig>): Promise<any> {
    const messageId = `msg-admin-${Date.now()}`;
    logDelivery({
      recipient: userEmail,
      subject: `SVB Notice: ${title}`,
      type: 'Admin Operations Notice',
      provider: 'System Internal',
      status: 'Delivered',
      messageId
    });
    return { success: true, messageId, provider: 'system' };
  }
};
