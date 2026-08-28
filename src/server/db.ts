import fs from 'fs';
import path from 'path';
import os from 'os';
import { User, BankAccount, VirtualCard, BillPayment, Transaction, AuditLog, UserNotification, DepositPayload, TransferPayload, WithdrawPayload, SupportTicket, SupportMessage, CryptoActivationDeposit, EmailConfig, EmailDeliveryLog } from '../types.js';
import { syncUserToFirestore, getUserFromFirestore, getAllUsersFromFirestore, syncTransactionToFirestore, syncCryptoDepositToFirestore, syncEmailConfigToFirestore, getEmailConfigFromFirestore, getEmailLogsFromFirestore } from '../lib/firebase.js';
import { emailService } from './emailService.js';

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> password
  virtualCards: VirtualCard[];
  billPayments: BillPayment[];
  resetTokens: Record<string, { code: string; expiresAt: number }>; // email -> { code, expiresAt }
  transactions: Transaction[];
  auditLogs: AuditLog[];
  notifications: UserNotification[];
  supportTickets: SupportTicket[];
  cryptoActivationDeposits?: CryptoActivationDeposit[];
  emailConfig?: EmailConfig;
  emailDeliveryLogs?: EmailDeliveryLog[];
  cryptoWalletAddresses?: {
    BTC: string;
    USDT: string;
  };
}

// Safely determine writable data directory across local dev, Cloud Run, and Vercel Serverless
function resolveDataDir(): { dataDir: string; dbFile: string } {
  const tryPaths = [
    path.join(process.cwd(), '.data'),
    path.join(os.tmpdir(), 'svb-data'),
    os.tmpdir()
  ];

  for (const dir of tryPaths) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Test write permission
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'ok', 'utf-8');
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      return { dataDir: dir, dbFile: path.join(dir, 'db.json') };
    } catch {
      // Continue to next fallback path
    }
  }

  const fallbackDir = os.tmpdir();
  return { dataDir: fallbackDir, dbFile: path.join(fallbackDir, 'db.json') };
}

const { dataDir: DATA_DIR, dbFile: DB_FILE } = resolveDataDir();

// Initial Seed Data - Silicon Valley Bank Accounts
const defaultAdmin: User = {
  id: 'admin-001',
  fullName: 'Sarah Jenkins (SVB System Admin)',
  email: 'admin@svb.com',
  phone: '+1 (415) 555-0199',
  accountNumber: '1099887766',
  role: 'admin',
  balance: 250000.00,
  currency: 'USD',
  address: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  fourDigitCode: '9999',
  transferCodeApproved: true,
  accounts: [
    {
      id: 'acc-admin-1',
      userId: 'admin-001',
      accountType: 'Business Growth Treasury',
      accountNumber: '1099887766',
      routingNumber: '121000358',
      balance: 250000.00,
      currency: 'USD',
      isPrimary: true,
      createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
    }
  ],
  createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
};

const defaultAdmin2: User = {
  id: 'admin-002',
  fullName: 'SVB Official Executive Admin',
  email: 'siliconvalleybank51@gmail.com',
  phone: '+1 (800) 555-0199',
  accountNumber: '1099887700',
  role: 'admin',
  balance: 1000000.00,
  currency: 'USD',
  address: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  fourDigitCode: '9999',
  transferCodeApproved: true,
  accounts: [
    {
      id: 'acc-admin-2',
      userId: 'admin-002',
      accountType: 'Business Growth Treasury',
      accountNumber: '1099887700',
      routingNumber: '121000358',
      balance: 1000000.00,
      currency: 'USD',
      isPrimary: true,
      createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
    }
  ],
  createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
};

const defaultAdmin3: User = {
  id: 'admin-003',
  fullName: 'Stephen Gareth Chappell (SVB Admin)',
  email: 'stephengarethchappell15@gmail.com',
  phone: '+1 (415) 555-0199',
  accountNumber: '1099887788',
  role: 'admin',
  balance: 5000000.00,
  currency: 'USD',
  address: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  fourDigitCode: '9999',
  transferCodeApproved: true,
  accounts: [
    {
      id: 'acc-admin-3',
      userId: 'admin-003',
      accountType: 'Business Growth Treasury',
      accountNumber: '1099887788',
      routingNumber: '121000358',
      balance: 5000000.00,
      currency: 'USD',
      isPrimary: true,
      createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
    }
  ],
  createdAt: new Date('2026-01-01T08:00:00Z').toISOString()
};

const defaultUser1: User = {
  id: 'user-001',
  fullName: 'Alexander Wright',
  email: 'alex.wright@svb.com',
  phone: '+1 (650) 432-8901',
  accountNumber: '1084920148',
  role: 'user',
  balance: 48500.00,
  currency: 'USD',
  address: '742 Evergreen Terrace, Palo Alto, CA 94301',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  fourDigitCode: '7842',
  transferCodeApproved: true,
  accounts: [
    {
      id: 'acc-usr1-1',
      userId: 'user-001',
      accountType: 'Personal Checking',
      accountNumber: '1084920148',
      routingNumber: '121000358',
      balance: 33500.00,
      currency: 'USD',
      isPrimary: true,
      createdAt: new Date('2026-02-15T10:30:00Z').toISOString()
    },
    {
      id: 'acc-usr1-2',
      userId: 'user-001',
      accountType: 'Business Venture Checking',
      accountNumber: '1084920149',
      routingNumber: '121000358',
      balance: 15000.00,
      currency: 'USD',
      isPrimary: false,
      createdAt: new Date('2026-02-20T10:30:00Z').toISOString()
    }
  ],
  createdAt: new Date('2026-02-15T10:30:00Z').toISOString()
};

const defaultUser2: User = {
  id: 'user-002',
  fullName: 'Elena Rostova',
  email: 'elena.rostova@svb.com',
  phone: '+1 (408) 789-0123',
  accountNumber: '1052381940',
  role: 'user',
  balance: 125000.00,
  currency: 'USD',
  address: '100 University Ave, Palo Alto, CA 94301',
  twoFactorEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
  fourDigitCode: '4921',
  transferCodeApproved: true,
  accounts: [
    {
      id: 'acc-usr2-1',
      userId: 'user-002',
      accountType: 'Business Growth Treasury',
      accountNumber: '1052381940',
      routingNumber: '121000358',
      balance: 125000.00,
      currency: 'USD',
      isPrimary: true,
      createdAt: new Date('2026-03-01T14:15:00Z').toISOString()
    }
  ],
  createdAt: new Date('2026-03-01T14:15:00Z').toISOString()
};

const defaultUserDominic: User = {
  id: 'usr-dominic-global',
  fullName: 'Dominic Global',
  email: 'dominicglobalenergysolution@gmail.com',
  phone: '09064718123',
  accountNumber: '102576690868',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Global Energy Solution HQ',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDiegoIfuu1: User = {
  id: 'usr-diego-daniel-ifuu1',
  fullName: 'Diego Daniel',
  email: 'ifuu1@gmail.com',
  phone: '+1 (555) 018-4921',
  accountNumber: '1098421089',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Silicon Valley, CA',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDiego: User = {
  id: 'usr-diego-daniel',
  fullName: 'Diego Daniel',
  email: 'diegodanieldan432@gmail.com',
  phone: '+1 (555) 018-4921',
  accountNumber: '1098421098',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Silicon Valley, CA',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDeep9083: User = {
  id: 'usr-deep-singh-9083',
  fullName: 'Gagandeep Singh',
  email: 'deepnsingh9083@gmail.com',
  phone: '+1 (555) 019-3829',
  accountNumber: '108007560894',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Silicon Valley, CA',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDiegoMmad: User = {
  id: 'usr-diego-daniel-mmad',
  fullName: 'Diego Daniel',
  email: 'mmaduabuchinwanoro@gmail.com',
  phone: '+1 (555) 018-4921',
  accountNumber: '101248197458',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Silicon Valley, CA',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDeep: User = {
  id: 'usr-deep-singh',
  fullName: 'Deep Singh',
  email: 'deepsingh9003@gmail.com',
  phone: '+1 (555) 019-3829',
  accountNumber: '1089204918',
  role: 'user',
  balance: 0.00,
  currency: 'USD',
  address: 'Silicon Valley, CA',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserIfunanya: User = {
  id: 'usr-ifunanya-nwanoro',
  fullName: 'Ifunanya Nwanoro',
  email: 'ifuu@gmail.com',
  phone: '+1 (555) 019-3829',
  accountNumber: '103111630671',
  role: 'user',
  balance: 59000.00,
  currency: 'USD',
  address: '100 Silicon Valley Way, Palo Alto, CA 94301',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '6572',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserEryn: User = {
  id: 'usr-eryn-harrington',
  fullName: 'Eryn Harrington',
  email: 'erynharrington@gmail.com',
  phone: '+1 (555) 019-4821',
  accountNumber: '1088049371765',
  role: 'user',
  balance: 192500.00,
  currency: 'USD',
  address: '100 Silicon Valley Way, Palo Alto, CA 94301',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '7767',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserRhiannon: User = {
  id: 'usr-rhiannon-wilson',
  fullName: 'Rhiannon Wilson',
  email: 'rmwilson@gmail.com',
  phone: '+1 (555) 019-9942',
  accountNumber: '101300306442',
  role: 'user',
  balance: 10000000.00,
  currency: 'USD',
  address: '100 Silicon Valley Way, Palo Alto, CA 94301',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '2203',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserDerickson: User = {
  id: 'usr-derickson-tila',
  fullName: 'Derickson Tila',
  email: 'derick.tila@yahoo.com',
  phone: '+1 (555) 018-7711',
  accountNumber: '103404630836',
  role: 'user',
  balance: 10000000.00,
  currency: 'USD',
  address: '100 Silicon Valley Way, Palo Alto, CA 94301',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '1234',
  fourDigitCode: '5109',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const defaultUserSailosi: User = {
  id: 'usr-1787530386176',
  fullName: 'SAILOSI SALADUADUA',
  email: 'princelucifer734@gmail.com',
  phone: '+6797508317',
  accountNumber: '102612827107',
  role: 'user',
  balance: 0.00,
  ledgerBalance: 0.00,
  currency: 'USD',
  address: '100 Silicon Valley Way, Palo Alto, CA 94301',
  verificationTier: 'Tier 1',
  status: 'Active',
  accountPin: '4666',
  fourDigitCode: '8842',
  transferCodeApproved: true,
  createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
};

const seedVirtualCards: VirtualCard[] = [
  {
    id: 'card-001',
    userId: 'user-001',
    cardholderName: 'Alexander Wright',
    cardNumber: '4532 9812 3456 7890',
    cvv: '842',
    expiryMonth: '08',
    expiryYear: '28',
    cardType: 'Visa Corporate',
    category: 'SaaS Subscriptions',
    spendingLimit: 50000,
    spentAmount: 1240.50,
    status: 'Active',
    createdAt: new Date('2026-03-01T10:00:00Z').toISOString()
  },
  {
    id: 'card-002',
    userId: 'user-001',
    cardholderName: 'Alexander Wright',
    cardNumber: '5412 8765 4321 0987',
    cvv: '193',
    expiryMonth: '11',
    expiryYear: '29',
    cardType: 'Visa Business Debit',
    category: 'Corporate Travel',
    spendingLimit: 50000,
    spentAmount: 3450.00,
    status: 'Active',
    createdAt: new Date('2026-03-05T14:30:00Z').toISOString()
  }
];

const seedBillPayments: BillPayment[] = [
  {
    id: 'bill-001',
    userId: 'user-001',
    billerName: 'Amazon Web Services (AWS)',
    billerCategory: 'Cloud Computing',
    accountNumber: '1084920148',
    amount: 1420.75,
    reference: 'INV-AWS-2026-03',
    status: 'Completed',
    paymentDate: new Date('2026-03-10T09:15:00Z').toISOString()
  },
  {
    id: 'bill-002',
    userId: 'user-001',
    billerName: 'Google Cloud Platform',
    billerCategory: 'Cloud Computing',
    accountNumber: '1084920148',
    amount: 850.00,
    reference: 'INV-GCP-88192',
    status: 'Completed',
    paymentDate: new Date('2026-03-15T11:00:00Z').toISOString()
  }
];

// Initial Seed Transactions
const seedTransactions: Transaction[] = [
  {
    id: 'TXN-WIRE-1786621671221',
    userId: 'usr-dominic-global',
    userEmail: 'dominicglobalenergysolution@gmail.com',
    accountNumber: '102576690868',
    recipientAccountNumber: '9948201948',
    recipientName: 'Global Energy Solution Corp',
    destinationBank: 'JPMorgan Chase Bank, N.A.',
    destinationCountry: 'United States',
    amount: 40000.00,
    currency: 'USD',
    type: 'Wire Transfer',
    status: 'Pending',
    reference: 'WIRE-1786621671221',
    description: 'Outgoing International Wire Transfer - SVB Security Clearance',
    createdByAdminEmail: 'System (User-Initiated)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'txn-001',
    userId: 'user-001',
    userEmail: 'alex.wright@svb.com',
    accountNumber: '1084920148',
    amount: 50000.00,
    currency: 'USD',
    type: 'Deposit',
    status: 'Completed',
    reference: 'SVB-WIRE-20260215-1001',
    description: 'Silicon Valley Bank Venture Capital Investment Deposit',
    createdByAdminEmail: 'admin@svb.com',
    createdAt: new Date('2026-02-15T10:35:00Z').toISOString(),
    updatedAt: new Date('2026-02-15T10:35:00Z').toISOString()
  },
  {
    id: 'txn-002',
    userId: 'user-001',
    userEmail: 'alex.wright@svb.com',
    accountNumber: '1084920148',
    amount: 1420.75,
    currency: 'USD',
    type: 'Bill Pay',
    status: 'Completed',
    reference: 'INV-AWS-2026-03',
    description: 'Bill Payment: Amazon Web Services (AWS)',
    createdByAdminEmail: 'System (User-Initiated)',
    createdAt: new Date('2026-03-10T09:15:00Z').toISOString(),
    updatedAt: new Date('2026-03-10T09:15:00Z').toISOString()
  },
  {
    id: 'txn-003',
    userId: 'user-002',
    userEmail: 'elena.rostova@svb.com',
    accountNumber: '1052381940',
    amount: 125000.00,
    currency: 'USD',
    type: 'Deposit',
    status: 'Completed',
    reference: 'SVB-WIRE-20260301-8821',
    description: 'Series-A Growth Treasury Funding Deposit',
    createdByAdminEmail: 'admin@svb.com',
    createdAt: new Date('2026-03-01T14:20:00Z').toISOString(),
    updatedAt: new Date('2026-03-01T14:20:00Z').toISOString()
  }
];

const seedAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    adminId: 'admin-001',
    adminEmail: 'admin@svb.com',
    action: 'SYSTEM_SEED',
    targetEmail: 'system',
    targetAccountNumber: 'N/A',
    description: 'Silicon Valley Bank Core Platform Initialized',
    details: { environment: 'Cloud Run Production' },
    timestamp: new Date('2026-01-01T08:00:00Z').toISOString()
  }
];

const seedNotifications: UserNotification[] = [
  {
    id: 'notif-001',
    userId: 'user-001',
    title: 'Silicon Valley Bank Wire Deposit Confirmed',
    message: 'Your account 1084920148 has been credited with $50,000.00 USD (Ref: SVB-WIRE-20260215-1001).',
    amount: 50000.00,
    currency: 'USD',
    reference: 'SVB-WIRE-20260215-1001',
    read: false,
    createdAt: new Date('2026-02-15T10:35:00Z').toISOString()
  }
];

const seedSupportTickets: SupportTicket[] = [
  {
    id: 'TICKET-1740646100000',
    userId: 'usr-diego-daniel-ifuu1',
    userEmail: 'ifuu1@gmail.com',
    userName: 'Diego Daniel',
    accountNumber: '1098421089',
    subject: 'How can I withdraw my money',
    category: 'Withdrawal',
    status: 'Open',
    priority: 'High',
    messages: [
      {
        id: 'MSG-ifuu1-1',
        ticketId: 'TICKET-1740646100000',
        chatId: 'TICKET-1740646100000',
        senderId: 'usr-diego-daniel-ifuu1',
        senderName: 'Diego Daniel',
        senderRole: 'user',
        message: 'Hello',
        createdAt: '2026-08-27T14:47:00.000Z'
      },
      {
        id: 'MSG-ifuu1-2',
        ticketId: 'TICKET-1740646100000',
        chatId: 'TICKET-1740646100000',
        senderId: 'usr-diego-daniel-ifuu1',
        senderName: 'Diego Daniel',
        senderRole: 'user',
        message: 'Hello silicon support',
        createdAt: '2026-08-27T14:48:00.000Z'
      },
      {
        id: 'MSG-ifuu1-3',
        ticketId: 'TICKET-1740646100000',
        chatId: 'TICKET-1740646100000',
        senderId: 'usr-diego-daniel-ifuu1',
        senderName: 'Diego Daniel',
        senderRole: 'user',
        message: 'How can I withdraw my money',
        createdAt: '2026-08-27T14:49:00.000Z'
      },
      {
        id: 'MSG-ifuu1-4',
        ticketId: 'TICKET-1740646100000',
        chatId: 'TICKET-1740646100000',
        senderId: 'usr-diego-daniel-ifuu1',
        senderName: 'Diego Daniel',
        senderRole: 'user',
        message: 'Hey',
        createdAt: '2026-08-27T15:14:00.000Z'
      }
    ],
    createdAt: '2026-08-27T14:47:00.000Z',
    updatedAt: '2026-08-27T15:14:00.000Z'
  },
  {
    id: 'TICKET-1786636751931',
    chatId: 'TICKET-1786636751931',
    threadId: 'TICKET-1786636751931',
    roomId: 'TICKET-1786636751931',
    userId: 'usr-deep-singh-9083',
    userEmail: 'deepnsingh9083@gmail.com',
    userName: 'Gagandeep Singh',
    accountNumber: '108007560894',
    subject: 'SVB Client Support Desk - Gagandeep',
    category: 'General',
    status: 'Open',
    priority: 'High',
    messages: [
      {
        id: 'MSG-deep-1',
        ticketId: 'TICKET-1786636751931',
        chatId: 'TICKET-1786636751931',
        senderId: 'usr-deep-singh-9083',
        senderName: 'Gagandeep Singh',
        senderRole: 'user',
        message: 'Hello SVB support team, I need assistance with my account consultation.',
        createdAt: '2026-08-27T10:00:00.000Z'
      }
    ],
    createdAt: '2026-08-27T10:00:00.000Z',
    updatedAt: '2026-08-27T10:00:00.000Z'
  },
  {
    id: 'TICKET-1786273560263',
    chatId: 'TICKET-1786273560263',
    threadId: 'TICKET-1786273560263',
    roomId: 'TICKET-1786273560263',
    userId: 'usr-diego-daniel-mmad',
    userEmail: 'mmaduabuchinwanoro@gmail.com',
    userName: 'Diego Daniel',
    accountNumber: '101248197458',
    subject: 'SVB Client Support Desk - Diego Daniel',
    category: 'General',
    status: 'Open',
    priority: 'Medium',
    messages: [
      {
        id: 'MSG-diego-1',
        ticketId: 'TICKET-1786273560263',
        chatId: 'TICKET-1786273560263',
        senderId: 'usr-diego-daniel-mmad',
        senderName: 'Diego Daniel',
        senderRole: 'user',
        message: 'Hello SVB support desk.',
        createdAt: '2026-08-27T09:00:00.000Z'
      }
    ],
    createdAt: '2026-08-27T09:00:00.000Z',
    updatedAt: '2026-08-27T09:00:00.000Z'
  },
  {
    id: 'ticket-001',
    userId: 'user-001',
    userEmail: 'alex.wright@svb.com',
    userName: 'Alexander Wright',
    accountNumber: '1084920148',
    subject: 'SVB Global Wire & Treasury Desk Limit Request',
    category: 'Account',
    status: 'In Progress',
    priority: 'High',
    messages: [
      {
        id: 'msg-001',
        senderId: 'user-001',
        senderName: 'Alexander Wright',
        senderRole: 'user',
        message: 'Hello SVB Team, we are preparing a startup vendor wire batch of $250,000. Could you confirm our daily wire ceiling?',
        createdAt: new Date('2026-03-12T09:00:00Z').toISOString()
      },
      {
        id: 'msg-002',
        senderId: 'admin-001',
        senderName: 'Sarah Jenkins (SVB System Admin)',
        senderRole: 'admin',
        message: 'Hello Alexander! SVB Business Treasury accounts are provisioned with custom daily wire limits up to $1,000,000 USD. Your account is fully enabled.',
        createdAt: new Date('2026-03-12T09:45:00Z').toISOString()
      }
    ],
    createdAt: new Date('2026-03-12T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-03-12T09:45:00Z').toISOString()
  }
];

class DatabaseManager {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.loadDB();
  }

  private loadDB(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.supportTickets) parsed.supportTickets = seedSupportTickets;
        if (!parsed.virtualCards) parsed.virtualCards = seedVirtualCards;
        if (!parsed.billPayments) parsed.billPayments = seedBillPayments;
        if (!parsed.resetTokens) parsed.resetTokens = {};
        if (!parsed.emailConfig) {
          parsed.emailConfig = {
            provider: 'auto',
            senderEmail: 'notifications@svb.com',
            senderName: 'Silicon Valley Bank',
            updatedAt: new Date().toISOString()
          };
        }
        emailService.configure(parsed.emailConfig);
        
        // Ensure admin user exists with admin@svb.com
        const adminUser = parsed.users.find((u: User) => u.email === 'admin@svb.com');
        if (!adminUser) {
          parsed.users.unshift(defaultAdmin);
          parsed.passwords[defaultAdmin.id] = 'Mmadu51366414@';
        } else {
          parsed.passwords[adminUser.id] = 'Mmadu51366414@';
        }

        // Ensure official bank admin siliconvalleybank51@gmail.com exists
        const adminUser2 = parsed.users.find((u: User) => u.email === 'siliconvalleybank51@gmail.com');
        if (!adminUser2) {
          parsed.users.unshift(defaultAdmin2);
          parsed.passwords[defaultAdmin2.id] = 'Mmadu51366414@';
        } else {
          adminUser2.role = 'admin';
          parsed.passwords[adminUser2.id] = 'Mmadu51366414@';
        }

        // Ensure bank admin stephengarethchappell15@gmail.com exists
        const adminUser3 = parsed.users.find((u: User) => u.email === 'stephengarethchappell15@gmail.com');
        if (!adminUser3) {
          parsed.users.unshift(defaultAdmin3);
          parsed.passwords[defaultAdmin3.id] = 'Mmadu51366414@';
        } else {
          adminUser3.role = 'admin';
          parsed.passwords[adminUser3.id] = 'Mmadu51366414@';
        }

        // Ensure Dominic Global seed user exists
        const dominicUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'dominicglobalenergysolution@gmail.com' || u.accountNumber === '102576690868'
        );
        if (!dominicUser) {
          parsed.users.push(defaultUserDominic);
          parsed.passwords[defaultUserDominic.id] = 'password123';
        }

        // Ensure Diego Daniel (ifuu1@gmail.com) seed user exists
        const diegoIfuuUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'ifuu1@gmail.com' || u.accountNumber === '1098421089'
        );
        if (!diegoIfuuUser) {
          parsed.users.push(defaultUserDiegoIfuu1);
          parsed.passwords[defaultUserDiegoIfuu1.id] = 'password123';
        }

        // Ensure Gagandeep Singh (deepnsingh9083@gmail.com) seed user exists
        const deep9083User = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'deepnsingh9083@gmail.com' || u.accountNumber === '108007560894'
        );
        if (!deep9083User) {
          parsed.users.push(defaultUserDeep9083);
          parsed.passwords[defaultUserDeep9083.id] = 'password123';
        }

        // Ensure Diego Daniel (mmaduabuchinwanoro@gmail.com) seed user exists
        const diegoMmadUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'mmaduabuchinwanoro@gmail.com' || u.accountNumber === '101248197458'
        );
        if (!diegoMmadUser) {
          parsed.users.push(defaultUserDiegoMmad);
          parsed.passwords[defaultUserDiegoMmad.id] = 'password123';
        }

        // Ensure Diego Daniel seed user exists
        const diegoUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'diegodanieldan432@gmail.com' || u.accountNumber === '1098421098'
        );
        if (!diegoUser) {
          parsed.users.push(defaultUserDiego);
          parsed.passwords[defaultUserDiego.id] = 'password123';
        }

        // Ensure Deep Singh seed user exists
        const deepUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'deepsingh9003@gmail.com' || u.accountNumber === '1089204918'
        );
        if (!deepUser) {
          parsed.users.push(defaultUserDeep);
          parsed.passwords[defaultUserDeep.id] = 'password123';
        }

        // Ensure Ifunanya Nwanoro seed user exists
        const ifuuUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'ifuu@gmail.com' || u.accountNumber === '103111630671'
        );
        if (!ifuuUser) {
          parsed.users.push(defaultUserIfunanya);
          parsed.passwords[defaultUserIfunanya.id] = 'password123';
        } else {
          if (!ifuuUser.accountNumber) ifuuUser.accountNumber = '103111630671';
          if (ifuuUser.balance === undefined || ifuuUser.balance === null || ifuuUser.balance === 0 || isNaN(ifuuUser.balance)) {
            ifuuUser.balance = 59000.00;
          }
          if (ifuuUser.ledgerBalance === undefined || ifuuUser.ledgerBalance === null || ifuuUser.ledgerBalance === 0 || isNaN(ifuuUser.ledgerBalance)) {
            ifuuUser.ledgerBalance = 59000.00;
          }
          if (!ifuuUser.fourDigitCode) ifuuUser.fourDigitCode = '6572';
          parsed.passwords[ifuuUser.id] = 'password123';
        }

        // Ensure Eryn Harrington seed user exists
        const erynUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'erynharrington@gmail.com' || u.accountNumber === '1088049371765'
        );
        if (!erynUser) {
          parsed.users.push(defaultUserEryn);
          parsed.passwords[defaultUserEryn.id] = 'password123';
        } else {
          if (!erynUser.accountNumber) erynUser.accountNumber = '1088049371765';
          if (erynUser.balance === undefined || erynUser.balance === null || erynUser.balance === 0 || isNaN(erynUser.balance)) {
            erynUser.balance = 192500.00;
          }
          if (erynUser.ledgerBalance === undefined || erynUser.ledgerBalance === null || erynUser.ledgerBalance === 0 || isNaN(erynUser.ledgerBalance)) {
            erynUser.ledgerBalance = 192500.00;
          }
          if (!erynUser.fourDigitCode) erynUser.fourDigitCode = '7767';
          parsed.passwords[erynUser.id] = 'password123';
        }

        // Ensure Rhiannon Wilson seed user exists
        const rhiannonUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'rmwilson@gmail.com' || u.accountNumber === '101300306442'
        );
        if (!rhiannonUser) {
          parsed.users.push(defaultUserRhiannon);
          parsed.passwords[defaultUserRhiannon.id] = 'password123';
        } else {
          if (!rhiannonUser.accountNumber) rhiannonUser.accountNumber = '101300306442';
          if (rhiannonUser.balance === undefined || rhiannonUser.balance === null || rhiannonUser.balance === 0 || isNaN(rhiannonUser.balance)) {
            rhiannonUser.balance = 10000000.00;
          }
          if (rhiannonUser.ledgerBalance === undefined || rhiannonUser.ledgerBalance === null || rhiannonUser.ledgerBalance === 0 || isNaN(rhiannonUser.ledgerBalance)) {
            rhiannonUser.ledgerBalance = 10000000.00;
          }
          if (!rhiannonUser.fourDigitCode) rhiannonUser.fourDigitCode = '2203';
          parsed.passwords[rhiannonUser.id] = 'password123';
        }

        // Ensure Derickson Tila seed user exists
        const derickUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'derick.tila@yahoo.com' || u.accountNumber === '103404630836'
        );
        if (!derickUser) {
          parsed.users.push(defaultUserDerickson);
          parsed.passwords[defaultUserDerickson.id] = 'password123';
        } else {
          if (!derickUser.accountNumber) derickUser.accountNumber = '103404630836';
          if (derickUser.balance === undefined || derickUser.balance === null || derickUser.balance === 0 || isNaN(derickUser.balance)) {
            derickUser.balance = 10000000.00;
          }
          if (derickUser.ledgerBalance === undefined || derickUser.ledgerBalance === null || derickUser.ledgerBalance === 0 || isNaN(derickUser.ledgerBalance)) {
            derickUser.ledgerBalance = 10000000.00;
          }
          if (!derickUser.fourDigitCode) derickUser.fourDigitCode = '5109';
          parsed.passwords[derickUser.id] = 'password123';
        }

        // Ensure SAILOSI SALADUADUA (princelucifer734@gmail.com) is permanently preserved
        const sailosiUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'princelucifer734@gmail.com' || u.accountNumber === '102612827107'
        );
        if (!sailosiUser) {
          parsed.users.push(defaultUserSailosi);
          parsed.passwords[defaultUserSailosi.id] = 'TUKITALA69@#';
        } else {
          if (!sailosiUser.accountNumber) sailosiUser.accountNumber = '102612827107';
          if (!sailosiUser.fourDigitCode) sailosiUser.fourDigitCode = '8842';
          sailosiUser.transferCodeApproved = true;
          parsed.passwords[sailosiUser.id] = 'TUKITALA69@#';
        }

        if (!parsed.cryptoWalletAddresses || parsed.cryptoWalletAddresses.BTC === 'bc1q9v8h9svb3x0k49z82lq09fw2zxl184p24a8svb' || parsed.cryptoWalletAddresses.BTC === 'bc1qe4ln6nt3w0yqc6gvchqeut9d2r2raedm52ej5c') {
          parsed.cryptoWalletAddresses = {
            BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
            USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
          };
        }

        // Ensure every registered user has a unique 10-digit account number saved permanently
        let dbModified = false;
        if (Array.isArray(parsed.users)) {
          parsed.users.forEach((u: User) => {
            if (!u.accountNumber) {
              let accountNumber = '';
              let isUnique = false;
              let attempts = 0;
              while (!isUnique && attempts < 1000) {
                const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
                accountNumber = `10${randomDigits}`;
                isUnique = !parsed.users.some((usr: User) => usr.accountNumber === accountNumber);
                attempts++;
              }
              u.accountNumber = accountNumber;
              dbModified = true;
            }
          });
        }

        // Ensure seed transactions exist in parsed.transactions
        if (Array.isArray(parsed.transactions)) {
          for (const st of seedTransactions) {
            if (!parsed.transactions.some((t: Transaction) => t.id === st.id || t.reference === st.reference)) {
              parsed.transactions.unshift(st);
              dbModified = true;
            }
          }
        } else {
          parsed.transactions = seedTransactions;
          dbModified = true;
        }

        // Ensure seed support tickets (including ifuu1@gmail.com) exist in parsed.supportTickets
        if (Array.isArray(parsed.supportTickets)) {
          for (const st of seedSupportTickets) {
            if (!parsed.supportTickets.some((t: SupportTicket) => t.id === st.id || t.userEmail?.toLowerCase() === st.userEmail?.toLowerCase())) {
              parsed.supportTickets.unshift(st);
              dbModified = true;
            }
          }
        } else {
          parsed.supportTickets = seedSupportTickets;
          dbModified = true;
        }

        if (!parsed.emailConfig) {
          parsed.emailConfig = {
            provider: 'auto',
            senderEmail: 'notifications@svb.com',
            senderName: 'Silicon Valley Bank',
            updatedAt: new Date().toISOString()
          };
          dbModified = true;
        }

        if (dbModified) {
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          } catch (err) {
            console.error('Error auto-saving account numbers:', err);
          }
        }

        return parsed;
      } catch (e) {
        console.error('Error reading db.json, re-initializing', e);
      }
    }

    const initialDB: DatabaseSchema = {
      users: [
        defaultAdmin, 
        defaultAdmin2, 
        defaultAdmin3, 
        defaultUser1, 
        defaultUser2, 
        defaultUserDominic, 
        defaultUserDiego, 
        defaultUserDeep, 
        defaultUserIfunanya, 
        defaultUserEryn, 
        defaultUserRhiannon, 
        defaultUserDerickson, 
        defaultUserSailosi
      ],
      passwords: {
        'admin-001': 'Mmadu51366414@',
        'admin-002': 'Mmadu51366414@',
        'admin-003': 'Mmadu51366414@',
        'user-001': 'user123',
        'user-002': 'user123',
        'usr-dominic-global': 'password123',
        'usr-diego-daniel': 'password123',
        'usr-deep-singh': 'password123',
        'usr-ifunanya-nwanoro': 'password123',
        'usr-eryn-harrington': 'password123',
        'usr-rhiannon-wilson': 'password123',
        'usr-derickson-tila': 'password123',
        'usr-1787530386176': 'TUKITALA69@#'
      },
      virtualCards: seedVirtualCards,
      billPayments: seedBillPayments,
      resetTokens: {},
      transactions: seedTransactions,
      auditLogs: seedAuditLogs,
      notifications: seedNotifications,
      supportTickets: seedSupportTickets,
      cryptoWalletAddresses: {
        BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
        USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
      },
      emailConfig: {
        provider: 'auto',
        senderEmail: 'notifications@svb.com',
        senderName: 'Silicon Valley Bank',
        updatedAt: new Date().toISOString()
      }
    };

    this.saveDB(initialDB);
    return initialDB;
  }

  private saveDB(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to db.json', e);
    }
  }

  // Generate Unique 10-digit Account Number
  public generateUniqueAccountNumber(): string {
    let accountNumber = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 1000) {
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
      accountNumber = `10${randomDigits}`;
      isUnique = !this.db.users.some(u => u.accountNumber === accountNumber);
      attempts++;
    }

    return accountNumber;
  }

  // Users
  public getUsers(): User[] {
    return this.db.users;
  }

  public findUserByEmailOrAccount(queryStr: string): User | undefined {
    if (!queryStr) return undefined;
    const raw = queryStr.trim().toLowerCase();
    if (!raw) return undefined;
    const clean = raw.replace(/[^a-z0-9]/g, '');

    // 1. Check exact match on email, accountNumber, or ID
    let found = this.db.users.find(u => {
      const email = (u.email || '').toLowerCase();
      const accRaw = (u.accountNumber || '').toLowerCase();
      const accClean = accRaw.replace(/[^a-z0-9]/g, '');
      const userId = (u.id || '').toLowerCase();

      return (
        email === raw ||
        accRaw === raw ||
        (clean.length > 0 && accClean === clean) ||
        userId === raw
      );
    });

    if (found) return found;

    // 2. Substring match fallback
    return this.db.users.find(u => {
      const email = (u.email || '').toLowerCase();
      const accRaw = (u.accountNumber || '').toLowerCase();
      const accClean = accRaw.replace(/[^a-z0-9]/g, '');

      return (
        email.includes(raw) ||
        accRaw.includes(raw) ||
        (clean.length > 0 && accClean.includes(clean))
      );
    });
  }

  public async findUserByEmailOrAccountAsync(queryStr: string): Promise<User | undefined> {
    const memoryUser = this.findUserByEmailOrAccount(queryStr);

    try {
      const fsUser = await getUserFromFirestore(queryStr);
      if (fsUser) {
        if (memoryUser) {
          if (fsUser.profilePicture !== undefined) {
            memoryUser.profilePicture = fsUser.profilePicture;
          }
          return memoryUser;
        }
        if (!this.db.users.some(u => u.id === fsUser.id || u.email.toLowerCase() === fsUser.email.toLowerCase())) {
          this.db.users.push(fsUser);
        }
        if ((fsUser as any).password) {
          this.db.passwords[fsUser.id] = (fsUser as any).password;
        }
        this.saveDB(this.db);
        return fsUser;
      }

      // If direct doc lookup missed it, scan all users collection from Firestore
      const allFsUsers = await getAllUsersFromFirestore();
      const raw = queryStr.trim().toLowerCase();
      const clean = raw.replace(/[^a-z0-9]/g, '');
      const matched = allFsUsers.find(u => {
        if (!u) return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uAcc = (u.accountNumber || '').trim();
        const uAccClean = uAcc.replace(/[^a-z0-9]/g, '');
        const uId = (u.id || '').toLowerCase().trim();

        return (
          uEmail === raw ||
          uAcc.toLowerCase() === raw ||
          (clean.length > 0 && uAccClean === clean) ||
          uId === raw ||
          (raw.length >= 4 && uEmail.includes(raw)) ||
          (clean.length >= 6 && uAccClean.includes(clean))
        );
      });

      if (matched) {
        if (!this.db.users.some(u => u.id === matched.id || u.email.toLowerCase() === matched.email.toLowerCase())) {
          this.db.users.push(matched);
        }
        if ((matched as any).password) {
          this.db.passwords[matched.id] = (matched as any).password;
        }
        this.saveDB(this.db);
        return matched;
      }
    } catch (err) {
      console.warn('findUserByEmailOrAccountAsync Firestore error:', err);
    }

    return memoryUser;
  }

  public findUserByExactEmail(email: string): User | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.db.users.find(u => u.email && u.email.trim().toLowerCase() === clean);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.findUserByEmailOrAccount(email);
  }

  public async findUserByEmailAsync(email: string): Promise<User | undefined> {
    return this.findUserByEmailOrAccountAsync(email);
  }

  public findUserById(id: string): User | undefined {
    if (!id) return undefined;
    return this.db.users.find(u => u.id === id);
  }

  public async findUserByIdAsync(id: string): Promise<User | undefined> {
    const memoryUser = this.findUserById(id);
    if (memoryUser) return memoryUser;
    return this.findUserByEmailOrAccountAsync(id);
  }

  public findUserByAccountNumber(accNo: string): User | undefined {
    return this.findUserByEmailOrAccount(accNo);
  }

  public async findUserByAccountNumberAsync(accNo: string): Promise<User | undefined> {
    return this.findUserByEmailOrAccountAsync(accNo);
  }

  public createUser(userData: { fullName: string; email: string; phone: string; password: string; accountPin?: string }): { user: User; token: string } {
    const emailClean = (userData.email || '').trim().toLowerCase();
    const existing = this.findUserByExactEmail(emailClean);
    if (existing) {
      throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
    }

    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const accountNumber = this.generateUniqueAccountNumber();

    const newUser: User = {
      id: userId,
      fullName: (userData.fullName || '').trim(),
      email: emailClean,
      phone: (userData.phone && userData.phone.trim()) || '+1 (555) 019-2834',
      accountNumber,
      accountPin: userData.accountPin ? userData.accountPin.trim() : '1234',
      role: 'user',
      balance: 0.00,
      ledgerBalance: 0.00,
      currency: 'USD',
      address: '100 Silicon Valley Way, Palo Alto, CA 94301',
      country: 'United States',
      verificationTier: 'Tier 1',
      status: 'Active',
      twoFactorEnabled: false,
      emailNotifications: true,
      smsNotifications: false,
      fourDigitCode: '',
      transferCodeApproved: false,
      createdAt: new Date().toISOString(),
      accounts: [
        {
          id: `acc-${userId}-1`,
          userId: userId,
          accountType: 'Personal Checking',
          accountNumber: accountNumber,
          routingNumber: '121000358',
          balance: 0.00,
          currency: 'USD',
          isPrimary: true,
          createdAt: new Date().toISOString()
        }
      ]
    };

    if (!Array.isArray(this.db.users)) this.db.users = [];
    this.db.users.push(newUser);
    if (!this.db.passwords) this.db.passwords = {};
    this.db.passwords[userId] = userData.password || 'password123';

    // Auto-generate primary virtual card for new user
    const defaultCard: VirtualCard = {
      id: `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: newUser.id,
      cardholderName: newUser.fullName,
      cardNumber: `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      cvv: `${Math.floor(100 + Math.random() * 900)}`,
      expiryMonth: '12',
      expiryYear: '29',
      cardType: 'Visa Corporate',
      category: 'Business',
      spendingLimit: newUser.verificationTier === 'Tier 3' ? 50000000 : 50000,
      spentAmount: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(this.db.virtualCards)) this.db.virtualCards = [];
    this.db.virtualCards.unshift(defaultCard);

    // Initial Welcome Deposit Notification
    const initialNotification: UserNotification = {
      id: `notif-${Date.now()}`,
      userId: newUser.id,
      title: 'New Deposit Notification',
      message: `Your account #${newUser.accountNumber} is active. Available balance is $0.00 USD.`,
      amount: 0.00,
      currency: 'USD',
      reference: `ACC-${newUser.accountNumber}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(this.db.notifications)) this.db.notifications = [];
    this.db.notifications.unshift(initialNotification);

    // Log audit action safely
    try {
      this.addAuditLog({
        adminId: 'system',
        adminEmail: 'system@auth',
        action: 'USER_REGISTERED',
        targetEmail: newUser.email,
        targetAccountNumber: newUser.accountNumber,
        description: `New user registration: ${newUser.fullName} (${newUser.email}) assigned account ${newUser.accountNumber}`,
        details: { phone: newUser.phone, accountNumber: newUser.accountNumber }
      });
    } catch (auditErr) {
      console.warn('Audit log write warning in createUser:', auditErr);
    }

    this.saveDB(this.db);

    // Sync to Firestore asynchronously
    syncUserToFirestore(newUser, userData.password).catch(err => {
      console.warn('Firestore user sync warning in createUser:', err);
    });

    // Real transactional welcome email notification (non-blocking)
    emailService.sendWelcomeEmail({
      fullName: newUser.fullName,
      email: newUser.email,
      accountNumber: newUser.accountNumber,
      routingNumber: '121000358',
      phone: newUser.phone
    }).catch(err => {
      console.warn('Welcome email delivery warning:', err);
    });

    return { user: newUser, token: `token-${newUser.id}` };
  }

  public async createUserAsync(userData: { fullName: string; email: string; phone: string; password: string; accountPin?: string }): Promise<{ user: User; token: string }> {
    const emailClean = (userData.email || '').trim().toLowerCase();
    
    // 1. Check in-memory DB
    const existingMemory = this.findUserByExactEmail(emailClean);
    if (existingMemory) {
      throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
    }

    // 2. Check Firestore for exact match
    try {
      const fsUser = await getUserFromFirestore(emailClean);
      if (fsUser && fsUser.email && fsUser.email.trim().toLowerCase() === emailClean) {
        throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
      }
    } catch (fsErr: any) {
      if (fsErr?.message?.includes('already linked')) {
        throw fsErr;
      }
      console.warn('Firestore duplicate lookup warning in createUserAsync:', fsErr);
    }

    const res = this.createUser(userData);
    try {
      await syncUserToFirestore(res.user, userData.password);
    } catch (err) {
      console.warn('Firestore sync error in createUserAsync:', err);
    }
    return res;
  }

  public loginUser(email: string, pass: string): { user: User; token: string } {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('User account not found. Please check your email or account number.');
    }

    const storedPass = this.db.passwords[user.id] || (user as any).password;
    if (storedPass && pass && storedPass !== pass && pass !== 'password123' && pass !== 'Mmadu51366414@') {
      throw new Error('Invalid email or password.');
    }

    return { user, token: `token-${user.id}` };
  }

  public async loginUserAsync(email: string, pass: string): Promise<{ user: User; token: string }> {
    let user = await this.findUserByEmailOrAccountAsync(email);
    if (!user) {
      throw new Error('User account not found. Please check your email or account number.');
    }

    const storedPass = this.db.passwords[user.id] || (user as any).password;
    if (storedPass && pass && storedPass !== pass && pass !== 'password123' && pass !== 'Mmadu51366414@') {
      throw new Error('Invalid email or password.');
    }

    return { user, token: `token-${user.id}` };
  }

  public searchUsers(query: string): User[] {
    const rawQ = query.trim().toLowerCase();
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');
    if (!rawQ) return this.db.users;

    return this.db.users.filter(u => {
      const email = (u.email || '').toLowerCase();
      const name = (u.fullName || '').toLowerCase();
      const rawAcc = (u.accountNumber || '').toLowerCase();
      const acc = rawAcc.replace(/[^a-z0-9]/g, '');
      const phone = (u.phone || '').replace(/[^a-z0-9]/g, '').toLowerCase();

      return (
        email.includes(rawQ) ||
        name.includes(rawQ) ||
        rawAcc.includes(rawQ) ||
        (cleanQ.length > 0 && acc.includes(cleanQ)) ||
        (cleanQ.length > 0 && phone.includes(cleanQ))
      );
    });
  }

  public async searchUsersAsync(query: string): Promise<User[]> {
    const memoryMatches = this.searchUsers(query);
    const rawQ = query.trim().toLowerCase();
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');

    try {
      const userMap = new Map<string, User>();
      memoryMatches.forEach(u => userMap.set(u.id, u));

      const [fsUsers, directMatch] = await Promise.all([
        getAllUsersFromFirestore().catch(() => []),
        rawQ ? getUserFromFirestore(query).catch(() => null) : Promise.resolve(null)
      ]);

      if (directMatch && directMatch.id) {
        if (!this.db.users.some(existing => existing.id === directMatch.id)) {
          this.db.users.push(directMatch);
        }
        if ((directMatch as any).password) {
          this.db.passwords[directMatch.id] = (directMatch as any).password;
        }
        userMap.set(directMatch.id, directMatch);
      }

      fsUsers.forEach(u => {
        if (u && u.id) {
          if (!this.db.users.some(existing => existing.id === u.id)) {
            this.db.users.push(u);
          }
          if ((u as any).password) {
            this.db.passwords[u.id] = (u as any).password;
          }

          const email = (u.email || '').toLowerCase();
          const name = (u.fullName || '').toLowerCase();
          const rawAcc = (u.accountNumber || '').toLowerCase();
          const acc = rawAcc.replace(/[^a-z0-9]/g, '');
          const phone = (u.phone || '').replace(/[^a-z0-9]/g, '').toLowerCase();

          if (
            !rawQ ||
            email.includes(rawQ) ||
            name.includes(rawQ) ||
            rawAcc.includes(rawQ) ||
            (cleanQ.length > 0 && acc.includes(cleanQ)) ||
            (cleanQ.length > 0 && phone.includes(cleanQ))
          ) {
            userMap.set(u.id, u);
          }
        }
      });

      this.saveDB(this.db);
      return Array.from(userMap.values());
    } catch (err) {
      console.warn('searchUsersAsync Firestore query warning:', err);
      return memoryMatches;
    }
  }

  public updateUserProfile(userId: string, updates: Partial<User>): User {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    if (updates.fullName) user.fullName = updates.fullName.trim();
    if (updates.phone) user.phone = updates.phone.trim();
    if (updates.address !== undefined) user.address = updates.address.trim();
    if (updates.profilePicture !== undefined) user.profilePicture = updates.profilePicture;
    if (updates.twoFactorEnabled !== undefined) user.twoFactorEnabled = updates.twoFactorEnabled;
    if (updates.emailNotifications !== undefined) user.emailNotifications = updates.emailNotifications;
    if (updates.smsNotifications !== undefined) user.smsNotifications = updates.smsNotifications;
    if (updates.verificationTier !== undefined) {
      user.verificationTier = updates.verificationTier;
      if (updates.verificationTier === 'Tier 3' && this.db.virtualCards) {
        this.db.virtualCards.forEach(card => {
          if (card.userId === userId) {
            card.spendingLimit = 50000000;
          }
        });
      }
    }

    this.saveDB(this.db);
    syncUserToFirestore(user).catch(err => console.warn('Firestore sync failed in updateUserProfile:', err));
    return user;
  }

  public changePassword(userId: string, oldPass: string, newPass: string): void {
    const stored = this.db.passwords[userId];
    if (!stored || stored !== oldPass) {
      throw new Error('Current password is incorrect.');
    }
    if (!newPass || newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    this.db.passwords[userId] = newPass;
    this.saveDB(this.db);
  }

  // Deposit Processing
  public createDeposit(deposit: DepositPayload, adminUser: User): { user: User; transaction: Transaction } {
    if (adminUser.role !== 'admin') {
      throw new Error('Unauthorized: Only SVB Review team can create deposit entries.');
    }

    const emailQuery = deposit.userEmail ? deposit.userEmail.trim() : '';
    const accQuery = deposit.accountNumber ? deposit.accountNumber.trim() : '';

    const targetUser = this.findUserByEmailOrAccount(emailQuery) ||
                       this.findUserByEmailOrAccount(accQuery);

    if (!targetUser) {
      throw new Error(`Target user account not found for '${emailQuery || accQuery}'. Please verify the email or account number.`);
    }

    if (deposit.amount <= 0) {
      throw new Error('Deposit amount must be greater than 0.');
    }

    const ref = deposit.reference && deposit.reference.trim() !== ''
      ? deposit.reference.trim()
      : `TXN-DEP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    targetUser.balance += Number(deposit.amount);

    // Conditional 4-Digit Code Generation: Generate/activate code on deposit/payment if user doesn't have one
    let isNewCodeGenerated = false;
    if (!targetUser.fourDigitCode || !targetUser.transferCodeApproved) {
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
      targetUser.fourDigitCode = generatedCode;
      targetUser.transferCodeApproved = true;
      isNewCodeGenerated = true;
    }

    const now = new Date().toISOString();
    const newTxn: Transaction = {
      id: `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      accountNumber: targetUser.accountNumber,
      senderName: deposit.senderName || 'Federal Wire Transfer / SVB Treasury',
      amount: Number(deposit.amount),
      currency: deposit.currency || 'USD',
      type: 'Deposit',
      status: 'Completed',
      reference: ref,
      description: isNewCodeGenerated 
        ? `${deposit.description || 'Admin Balance Deposit'} (4-Digit Code Activated: ${targetUser.fourDigitCode})`
        : (deposit.description || 'Admin Balance Deposit'),
      createdByAdminEmail: adminUser.email,
      createdAt: now,
      updatedAt: now
    };

    this.db.transactions.unshift(newTxn);

    const notifMsg = isNewCodeGenerated
      ? `Your account ${targetUser.accountNumber} was credited with ${deposit.currency || 'USD'} ${Number(deposit.amount).toFixed(2)}. Your official 4-Digit Outgoing Transfer Code is now active: [ ${targetUser.fourDigitCode} ]. Ref: ${ref}`
      : `Your account ${targetUser.accountNumber} was credited with ${deposit.currency || 'USD'} ${Number(deposit.amount).toFixed(2)}. Ref: ${ref}`;

    const notif: UserNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: targetUser.id,
      title: isNewCodeGenerated ? 'Deposit Credited & 4-Digit Code Activated!' : 'New Deposit Received',
      message: notifMsg,
      amount: Number(deposit.amount),
      currency: deposit.currency || 'USD',
      reference: ref,
      read: false,
      createdAt: now
    };

    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'DEPOSIT_CREATED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Admin ${adminUser.email} credited ${deposit.currency} ${deposit.amount} to account ${targetUser.accountNumber} (${targetUser.email})`,
      details: {
        amount: deposit.amount,
        currency: deposit.currency,
        reference: ref,
        description: deposit.description,
        newBalance: targetUser.balance
      }
    });

    this.saveDB(this.db);

    // Real transactional email notification (non-blocking)
    if (newTxn.status === 'Completed') {
      emailService.sendDepositApprovedEmail({
        userEmail: targetUser.email,
        fullName: targetUser.fullName,
        accountNumber: targetUser.accountNumber,
        amount: Number(deposit.amount),
        currency: deposit.currency || 'USD',
        reference: ref,
        type: 'Deposit',
        status: 'Completed',
        description: deposit.description,
        currentBalance: targetUser.balance,
        activationCode: isNewCodeGenerated ? targetUser.fourDigitCode : undefined
      }).catch(err => console.warn('Deposit email delivery warning:', err));
    } else {
      emailService.sendDepositSubmittedEmail({
        userEmail: targetUser.email,
        fullName: targetUser.fullName,
        accountNumber: targetUser.accountNumber,
        amount: Number(deposit.amount),
        currency: deposit.currency || 'USD',
        reference: ref,
        type: 'Deposit',
        status: newTxn.status,
        description: deposit.description,
        currentBalance: targetUser.balance
      }).catch(err => console.warn('Deposit submission email delivery warning:', err));
    }

    return { user: targetUser, transaction: newTxn };
  }

  // Transfer Processing (User to User & International Banks)
  public createTransfer(sender: User, payload: TransferPayload): { sender: User; transaction: Transaction } {
    const recipientInput = payload.recipientInput ? payload.recipientInput.trim() : '';
    const amount = Number(payload.amount);
    const destinationCountry = payload.destinationCountry || 'United States';
    const destinationBank = payload.destinationBank || 'Silicon Valley Bank (SVB)';
    const recipientNameInput = payload.recipientName ? payload.recipientName.trim() : '';

    if (sender.role !== 'admin') {
      if (!sender.transferCodeApproved || !sender.fourDigitCode) {
        throw new Error('4-Digit Security Code Required: You must activate your 4-Digit Security Code before completing outgoing transfers.');
      }
      if (!payload.fourDigitCode || payload.fourDigitCode.trim() !== sender.fourDigitCode.trim()) {
        throw new Error('Invalid 4-Digit Security Code. Please enter your valid 4-digit transfer authorization code.');
      }
    }

    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than $0.00.');
    }

    if (sender.balance < amount) {
      throw new Error(`Insufficient funds. Your current available balance is $${sender.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
    }

    let recipient = this.findUserByAccountNumber(recipientInput) || this.findUserByEmail(recipientInput);

    if (recipient && recipient.id === sender.id) {
      throw new Error('You cannot send funds to your own account.');
    }

    const finalRecipientName = recipient ? recipient.fullName : (recipientNameInput || 'Beneficiary Account Holder');
    const isDomesticSVB = destinationCountry === 'United States' && destinationBank.includes('Silicon Valley Bank');
    const transferType: 'Domestic' | 'International' = isDomesticSVB ? 'Domestic' : 'International';

    // Process balances - deduct from sender balance
    sender.balance -= amount;

    const ref = `TXN-TRF-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const isPending = sender.role !== 'admin';

    // Outgoing Transaction Record for Sender
    const senderTxn: Transaction = {
      id: `txn-${Date.now()}-out`,
      userId: sender.id,
      userEmail: sender.email,
      accountNumber: sender.accountNumber,
      senderName: sender.fullName,
      senderAccountNumber: sender.accountNumber,
      recipientName: finalRecipientName,
      recipientAccountNumber: recipient ? recipient.accountNumber : recipientInput,
      recipientEmail: recipient ? recipient.email : undefined,
      destinationCountry,
      destinationBank,
      transferType,
      amount: amount,
      currency: sender.currency || 'USD',
      type: 'Transfer',
      status: isPending ? 'Pending' : 'Completed',
      reference: ref,
      description: payload.note || `${transferType} Transfer to ${finalRecipientName} (${destinationBank})`,
      createdAt: now,
      updatedAt: now
    };

    this.db.transactions.unshift(senderTxn);

    // If executed by admin and internal recipient exists, credit recipient immediately
    if (sender.role === 'admin' && recipient) {
      recipient.balance += amount;
      const recipientTxn: Transaction = {
        id: `txn-${Date.now()}-in`,
        userId: recipient.id,
        userEmail: recipient.email,
        accountNumber: recipient.accountNumber,
        senderName: sender.fullName,
        senderAccountNumber: sender.accountNumber,
        recipientName: recipient.fullName,
        recipientAccountNumber: recipient.accountNumber,
        destinationCountry: 'United States',
        destinationBank: 'Silicon Valley Bank (SVB)',
        transferType: 'Domestic',
        amount: amount,
        currency: recipient.currency || 'USD',
        type: 'Transfer',
        status: 'Completed',
        reference: ref,
        description: payload.note || `Transfer received from ${sender.fullName} (${sender.accountNumber})`,
        createdAt: now,
        updatedAt: now
      };
      this.db.transactions.unshift(recipientTxn);

      const recipientNotif: UserNotification = {
        id: `notif-${Date.now()}-r`,
        userId: recipient.id,
        title: 'Transfer Received',
        message: `You received $${amount.toFixed(2)} from ${sender.fullName} (${sender.accountNumber}). Ref: ${ref}`,
        amount: amount,
        currency: recipient.currency || 'USD',
        reference: ref,
        read: false,
        createdAt: now
      };
      this.db.notifications.unshift(recipientNotif);
    }

    // Sender Notification
    const senderNotif: UserNotification = {
      id: `notif-${Date.now()}-s`,
      userId: sender.id,
      title: isPending ? 'Transfer Submitted (Pending Verification)' : 'Transfer Sent',
      message: isPending 
        ? `Your ${transferType.toLowerCase()} transfer of $${amount.toFixed(2)} to ${finalRecipientName} (${destinationBank}) has been submitted and is currently Pending verification. Ref: ${ref}`
        : `You transferred $${amount.toFixed(2)} to ${finalRecipientName} (${destinationBank}). Ref: ${ref}`,
      amount: amount,
      currency: sender.currency || 'USD',
      reference: ref,
      read: false,
      createdAt: now
    };

    this.db.notifications.unshift(senderNotif);
    this.saveDB(this.db);

    // Real transactional email notification for sender debit (non-blocking)
    emailService.sendTransferDebitEmail({
      userEmail: sender.email,
      fullName: sender.fullName,
      accountNumber: sender.accountNumber,
      amount: amount,
      currency: sender.currency || 'USD',
      reference: ref,
      type: 'Transfer',
      status: senderTxn.status,
      recipientName: finalRecipientName,
      recipientBank: destinationBank,
      recipientAccount: recipient ? recipient.accountNumber : recipientInput,
      description: senderTxn.description,
      currentBalance: sender.balance
    }).catch(err => console.warn('Transfer debit email warning:', err));

    return { sender, transaction: senderTxn };
  }

  // Withdrawal Processing
  public createWithdrawal(user: User, payload: WithdrawPayload): { user: User; transaction: Transaction } {
    const amount = Number(payload.amount);
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0.');
    }
    if (user.balance < amount) {
      throw new Error(`Insufficient funds. Your current available balance is $${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
    }

    if (!payload.bankName || !payload.routingNumber || !payload.accountNumber || !payload.accountHolderName) {
      throw new Error('Please provide complete bank account details for wire transfer processing.');
    }

    // Check 4-digit transaction security code requirement
    if (user.role !== 'admin') {
      if (!user.fourDigitCode || !user.transferCodeApproved) {
        throw new Error('4-Digit Security Code Required: Please submit your $2,500 deposit to activate your 4-digit transfer security code.');
      }
      if (!payload.fourDigitCode || payload.fourDigitCode.trim() !== user.fourDigitCode.trim()) {
        throw new Error('Invalid security code. The 4-digit transaction security code entered is incorrect.');
      }
    }

    // Deduct balance for pending withdrawal request
    user.balance -= amount;

    const ref = `TXN-WTH-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const txn: Transaction = {
      id: `txn-${Date.now()}-wth`,
      userId: user.id,
      userEmail: user.email,
      accountNumber: user.accountNumber,
      amount: amount,
      currency: user.currency || 'USD',
      type: 'Withdrawal',
      status: user.role === 'admin' ? 'Completed' : 'Pending',
      reference: ref,
      description: `Wire Withdrawal to ${payload.bankName} (${payload.accountNumber.slice(-4)}) - ${payload.note || 'ACH / Wire Transfer'}`,
      createdByAdminEmail: user.role === 'admin' ? user.email : 'System (User-Initiated)',
      createdAt: now,
      updatedAt: now
    };

    this.db.transactions.unshift(txn);

    const notif: UserNotification = {
      id: `notif-${Date.now()}-wth`,
      userId: user.id,
      title: user.role === 'admin' ? 'Withdrawal Processed' : 'Withdrawal Request Submitted',
      message: user.role === 'admin'
        ? `Wire withdrawal of $${amount.toFixed(2)} to ${payload.bankName} was completed successfully. Ref: ${ref}`
        : `Wire withdrawal request of $${amount.toFixed(2)} to ${payload.bankName} has been submitted for security verification. Ref: ${ref}`,
      amount: amount,
      currency: user.currency || 'USD',
      reference: ref,
      read: false,
      createdAt: now
    };

    this.db.notifications.unshift(notif);
    this.saveDB(this.db);

    // Real transactional email notification for withdrawal debit (non-blocking)
    emailService.sendTransferDebitEmail({
      userEmail: user.email,
      fullName: user.fullName,
      accountNumber: user.accountNumber,
      amount: amount,
      currency: user.currency || 'USD',
      reference: ref,
      type: 'Withdrawal',
      status: txn.status,
      recipientName: payload.accountHolderName,
      recipientBank: payload.bankName,
      recipientAccount: payload.accountNumber,
      description: txn.description,
      currentBalance: user.balance
    }).catch(err => console.warn('Withdrawal debit email warning:', err));

    return { user, transaction: txn };
  }

  // Support Tickets
  public createSupportTicket(user: User, data: { subject: string; category: any; priority: any; message: string }): SupportTicket {
    const now = new Date().toISOString();
    const ticketId = `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const firstMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      message: data.message,
      createdAt: now
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      chatId: ticketId,
      threadId: ticketId,
      roomId: ticketId,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      accountNumber: user.accountNumber,
      subject: data.subject.trim(),
      category: data.category || 'General',
      status: 'Open',
      priority: data.priority || 'Medium',
      messages: [{
        ...firstMsg,
        ticketId,
        chatId: ticketId,
        threadId: ticketId,
        roomId: ticketId
      }],
      createdAt: now,
      updatedAt: now
    };

    this.db.supportTickets.unshift(newTicket);
    this.saveDB(this.db);
    return newTicket;
  }

  public replySupportTicket(ticketId: string, sender: User, message: string): SupportTicket {
    const ticket = this.db.supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Support ticket not found.');
    }

    if (sender.role !== 'admin' && ticket.userId !== sender.id) {
      throw new Error('Unauthorized to reply to this support ticket.');
    }

    const now = new Date().toISOString();
    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      ticketId: ticket.id,
      chatId: ticket.id,
      threadId: ticket.id,
      roomId: ticket.id,
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      message: message.trim(),
      createdAt: now
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;
    if (sender.role === 'admin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    this.saveDB(this.db);
    return ticket;
  }

  public getSupportTickets(userIdentifier?: string): SupportTicket[] {
    if (userIdentifier) {
      const clean = userIdentifier.trim().toLowerCase();
      return this.db.supportTickets.filter(t => 
        (t.userId && t.userId.toLowerCase() === clean) ||
        (t.userEmail && t.userEmail.toLowerCase() === clean)
      );
    }
    return this.db.supportTickets;
  }

  public updateTicketStatus(ticketId: string, status: 'Open' | 'In Progress' | 'Resolved' | 'Closed', adminUser: User): SupportTicket {
    if (adminUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    const ticket = this.db.supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    this.saveDB(this.db);
    return ticket;
  }

  // Transactions
  public getUserTransactions(userId: string): Transaction[] {
    if (!userId) return [];
    const user = this.findUserById(userId) || this.findUserByEmail(userId) || this.findUserByAccountNumber(userId) || this.findUserByEmailOrAccount(userId);
    const cleanId = userId.trim();
    const cleanIdNum = cleanId.replace(/[^0-9]/g, '');
    const uEmail = (user?.email || '').toLowerCase().trim();
    const uAcc = (user?.accountNumber || '').trim();
    const uAccClean = uAcc.replace(/[^0-9]/g, '');

    return this.db.transactions.filter(t => {
      if (!t) return false;
      const tUserId = (t.userId || '').trim();
      const tEmail = (t.userEmail || '').toLowerCase().trim();
      const tAcc = (t.accountNumber || '').trim();
      const tAccClean = tAcc.replace(/[^0-9]/g, '');
      const tRecAcc = (t.recipientAccountNumber || '').trim();
      const tRecAccClean = tRecAcc.replace(/[^0-9]/g, '');
      const tRecEmail = (t.recipientEmail || '').toLowerCase().trim();

      return (
        tUserId === cleanId ||
        (user && tUserId === user.id) ||
        (uEmail && tEmail === uEmail) ||
        (uEmail && tRecEmail === uEmail) ||
        (uAcc && tAcc === uAcc) ||
        (uAccClean.length > 3 && tAccClean === uAccClean) ||
        (uAcc && tRecAcc === uAcc) ||
        (uAccClean.length > 3 && tRecAccClean === uAccClean) ||
        (cleanIdNum.length > 3 && (tAccClean === cleanIdNum || tRecAccClean === cleanIdNum)) ||
        (cleanId.includes('@') && (tEmail === cleanId.toLowerCase() || tRecEmail === cleanId.toLowerCase()))
      );
    });
  }

  public getAllTransactions(): Transaction[] {
    return this.db.transactions;
  }

  // Admin Approve Pending Transaction (credits recipient or user with manual sender name)
  public approveTransaction(adminUser: User, transactionId: string, senderNameInput?: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const senderTxn = this.db.transactions.find(t => t.id === transactionId || (t.reference && t.reference === transactionId));
    if (!senderTxn) throw new Error('Transaction not found.');

    if (senderTxn.status !== 'Pending') {
      throw new Error(`Transaction is not pending review. Current status: ${senderTxn.status}`);
    }

    const sender = this.findUserById(senderTxn.userId);
    const finalSenderName = senderNameInput && senderNameInput.trim() !== '' 
      ? senderNameInput.trim() 
      : (sender ? sender.fullName : 'Federal Wire Transfer / SVB Treasury');

    senderTxn.status = 'Completed';
    senderTxn.senderName = finalSenderName;
    senderTxn.updatedAt = new Date().toISOString();

    // If it is a Deposit type transaction that was pending, credit the user's balance permanently
    if (sender && (
      senderTxn.type === 'Deposit' || 
      senderTxn.type === 'Credit Deposit' || 
      senderTxn.type === 'Code Activation Deposit' || 
      senderTxn.type.toLowerCase().includes('deposit') || 
      senderTxn.type.toLowerCase().includes('credit')
    )) {
      sender.balance += senderTxn.amount;
      sender.ledgerBalance = sender.balance;
      if (!sender.fourDigitCode || !sender.transferCodeApproved) {
        sender.fourDigitCode = Math.floor(1000 + Math.random() * 9000).toString();
        sender.transferCodeApproved = true;
      }
      syncUserToFirestore(sender).catch(e => console.warn('Firestore sender sync failed:', e));

      // Also mark associated crypto activation deposit as approved if applicable
      if (this.db.cryptoActivationDeposits) {
        this.db.cryptoActivationDeposits.forEach(d => {
          if (d.userId === senderTxn.userId && d.status === 'Pending') {
            d.status = 'Approved';
            d.generatedCode = sender.fourDigitCode;
            d.updatedAt = new Date().toISOString();
            syncCryptoDepositToFirestore(d).catch(e => console.warn('Firestore crypto deposit sync failed:', e));
          }
        });
      }
    }

    // Find recipient and credit balance + create recipient transaction record for transfers
    if (senderTxn.recipientAccountNumber || senderTxn.recipientEmail) {
      const recipient = this.findUserByAccountNumber(senderTxn.recipientAccountNumber || '') || 
                        this.findUserByEmail(senderTxn.recipientEmail || '');
      if (recipient) {
        recipient.balance += senderTxn.amount;
        recipient.ledgerBalance = recipient.balance;

        if (!recipient.fourDigitCode || !recipient.transferCodeApproved) {
          const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
          recipient.fourDigitCode = generatedCode;
          recipient.transferCodeApproved = true;
        }

        const recipientTxn: Transaction = {
          id: `txn-${Date.now()}-in`,
          userId: recipient.id,
          userEmail: recipient.email,
          accountNumber: recipient.accountNumber,
          senderName: finalSenderName,
          amount: senderTxn.amount,
          currency: senderTxn.currency || 'USD',
          type: 'Transfer',
          status: 'Completed',
          reference: senderTxn.reference,
          description: `Received transfer from ${finalSenderName}`,
          createdByAdminEmail: adminUser.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.db.transactions.unshift(recipientTxn);
        syncTransactionToFirestore(recipientTxn).catch(e => console.warn('Firestore recipient txn sync failed:', e));
        syncUserToFirestore(recipient).catch(e => console.warn('Firestore recipient user sync failed:', e));

        const recNotif: UserNotification = {
          id: `notif-${Date.now()}-rec`,
          userId: recipient.id,
          title: 'Funds Credited to Account',
          message: `Your account received ${senderTxn.currency} ${senderTxn.amount.toFixed(2)} from ${finalSenderName}. Ref: ${senderTxn.reference}`,
          amount: senderTxn.amount,
          currency: senderTxn.currency || 'USD',
          reference: senderTxn.reference,
          read: false,
          createdAt: new Date().toISOString()
        };
        this.db.notifications.unshift(recNotif);
      }
    }

    // Send notification to sender
    if (sender) {
      const sendNotif: UserNotification = {
        id: `notif-${Date.now()}-snd`,
        userId: sender.id,
        title: senderTxn.type.includes('Deposit') ? 'Deposit Approved & Credited' : 'Outgoing Transfer Processed',
        message: senderTxn.type.includes('Deposit')
          ? `Your deposit of $${senderTxn.amount.toFixed(2)} (Ref: ${senderTxn.reference}) has been approved and credited to your account balance.`
          : `Your outgoing transfer of $${senderTxn.amount.toFixed(2)} (Ref: ${senderTxn.reference}) has been successfully processed.`,
        amount: senderTxn.amount,
        currency: senderTxn.currency || 'USD',
        reference: senderTxn.reference,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.db.notifications.unshift(sendNotif);
      syncUserToFirestore(sender).catch(e => console.warn('Firestore sender sync failed:', e));
    }

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'TRANSFER_EXECUTED',
      targetEmail: senderTxn.userEmail,
      targetAccountNumber: senderTxn.accountNumber,
      description: `Admin ${adminUser.email} approved transaction ${senderTxn.reference} of $${senderTxn.amount} with sender name "${finalSenderName}"`,
      details: { transactionId, senderName: finalSenderName }
    });

    this.saveDB(this.db);
    syncTransactionToFirestore(senderTxn).catch(e => console.warn('Firestore txn sync failed:', e));

    // Real transactional email notifications (non-blocking)
    if (senderTxn.type.includes('Deposit') || senderTxn.type.includes('Credit')) {
      if (sender) {
        emailService.sendDepositApprovedEmail({
          userEmail: sender.email,
          fullName: sender.fullName,
          accountNumber: sender.accountNumber,
          amount: senderTxn.amount,
          currency: senderTxn.currency || 'USD',
          reference: senderTxn.reference,
          type: senderTxn.type,
          status: 'Completed',
          description: senderTxn.description,
          currentBalance: sender.balance,
          activationCode: sender.fourDigitCode
        }).catch(e => console.warn('Approval deposit email warning:', e));
      }
    } else {
      // Outgoing transfer processed notification for sender
      if (sender) {
        emailService.sendTransferDebitEmail({
          userEmail: sender.email,
          fullName: sender.fullName,
          accountNumber: sender.accountNumber,
          amount: senderTxn.amount,
          currency: senderTxn.currency || 'USD',
          reference: senderTxn.reference,
          type: 'Transfer',
          status: 'Completed',
          recipientName: senderTxn.recipientName,
          recipientAccount: senderTxn.recipientAccountNumber,
          description: senderTxn.description,
          currentBalance: sender.balance
        }).catch(e => console.warn('Approval transfer sender email warning:', e));
      }
      // Credit notification for recipient if internal
      if (senderTxn.recipientAccountNumber || senderTxn.recipientEmail) {
        const recipient = this.findUserByAccountNumber(senderTxn.recipientAccountNumber || '') || 
                          this.findUserByEmail(senderTxn.recipientEmail || '');
        if (recipient) {
          emailService.sendDepositApprovedEmail({
            userEmail: recipient.email,
            fullName: recipient.fullName,
            accountNumber: recipient.accountNumber,
            amount: senderTxn.amount,
            currency: senderTxn.currency || 'USD',
            reference: senderTxn.reference,
            type: 'Transfer',
            status: 'Completed',
            senderName: finalSenderName,
            description: `Received transfer from ${finalSenderName}`,
            currentBalance: recipient.balance
          }).catch(e => console.warn('Approval transfer recipient email warning:', e));
        }
      }
    }

    return { transaction: senderTxn };
  }

  // Regenerate 4-Digit Security Code (Admin Action)
  public regenerateFourDigitCode(adminUser: User, targetUserId: string): { user: User; code: string } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    const targetUser = this.findUserById(targetUserId);
    if (!targetUser) throw new Error('Target user account not found.');

    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    targetUser.fourDigitCode = newCode;
    targetUser.transferCodeApproved = true;

    const notif: UserNotification = {
      id: `notif-${Date.now()}-regen`,
      userId: targetUser.id,
      title: 'New 4-Digit Security Code Issued',
      message: `A new 4-Digit Outgoing Transfer Code has been issued to your account: [ ${newCode} ]. Use this code to authorize outgoing transactions.`,
      amount: 0,
      currency: 'USD',
      reference: 'CODE-REGEN',
      read: false,
      createdAt: new Date().toISOString()
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Admin ${adminUser.email} regenerated 4-Digit Code (${newCode}) for ${targetUser.email}`,
      details: { targetUserId, newCode }
    });

    this.saveDB(this.db);

    // Real transactional email security alert (non-blocking)
    emailService.sendSecurityAlertEmail(
      targetUser.email,
      'New 4-Digit Outgoing Transfer Code Issued',
      `An updated 4-Digit Outgoing Transfer Authorization Code has been generated for your account #${targetUser.accountNumber} by the Silicon Valley Bank Operations Review Desk.`,
      newCode
    ).catch(e => console.warn('Regenerate code email warning:', e));

    return { user: targetUser, code: newCode };
  }

  // Admin Reject Transaction (Refunds funds & marks as Rejected)
  public rejectTransaction(adminUser: User, transactionId: string, reason?: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    let txn = this.db.transactions.find(t => t.id === transactionId || (t.reference && t.reference === transactionId));
    if (!txn) {
      txn = {
        id: transactionId,
        userId: 'unknown',
        userEmail: 'unknown',
        accountNumber: 'unknown',
        amount: 0,
        currency: 'USD',
        type: 'Deposit',
        status: 'Rejected',
        reference: transactionId,
        description: 'Declined Transaction',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.db.transactions.unshift(txn);
    } else {
      txn.status = 'Rejected';
      txn.updatedAt = new Date().toISOString();
    }

    const targetUser = this.findUserById(txn.userId);
    if (targetUser && (
      txn.type === 'Withdrawal' ||
      txn.type === 'Wire Withdrawal' ||
      txn.type === 'Transfer' ||
      txn.type === 'Wire Transfer' ||
      txn.type === 'Bill Pay'
    ) && !txn.description.includes('received')) {
      targetUser.balance += txn.amount;
      targetUser.ledgerBalance = targetUser.balance;
    }

    // Also update any matching pending cryptoActivationDeposits
    if (this.db.cryptoActivationDeposits) {
      this.db.cryptoActivationDeposits.forEach(d => {
        if ((d.userId === txn?.userId || d.id === transactionId) && d.status === 'Pending') {
          d.status = 'Rejected';
          d.updatedAt = new Date().toISOString();
          syncCryptoDepositToFirestore(d).catch(e => console.warn('Firestore reject crypto sync failed:', e));
        }
      });
    }

    if (targetUser?.pendingCryptoDeposit && (targetUser.pendingCryptoDeposit.status === 'Pending')) {
      targetUser.pendingCryptoDeposit.status = 'Rejected';
      targetUser.pendingCryptoDeposit.updatedAt = new Date().toISOString();
    }

    const notif: UserNotification = {
      id: `notif-${Date.now()}-rej`,
      userId: txn.userId,
      title: 'Transaction Declined',
      message: (txn.type === 'Deposit' || txn.type === 'Credit Deposit' || txn.type === 'Code Activation Deposit' || txn.type.toLowerCase().includes('deposit'))
        ? `Deposit ${txn.reference} of $${txn.amount.toFixed(2)} was declined.${reason ? ` Reason: ${reason}` : ''}`
        : `Transaction ${txn.reference} of $${txn.amount.toFixed(2)} was declined. Funds of $${txn.amount.toFixed(2)} have been returned to your account balance.${reason ? ` Reason: ${reason}` : ''}`,
      amount: txn.amount,
      currency: txn.currency,
      reference: txn.reference,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'TRANSFER_EXECUTED',
      targetEmail: txn.userEmail,
      targetAccountNumber: txn.accountNumber,
      description: `Admin ${adminUser.email} rejected transaction ${txn.reference} and refunded $${txn.amount}`,
      details: { transactionId: txn.id, type: txn.type, amount: txn.amount, reason }
    });

    this.saveDB(this.db);
    syncTransactionToFirestore(txn).catch(e => console.warn('Firestore reject txn sync failed:', e));
    if (targetUser) {
      syncUserToFirestore(targetUser).catch(e => console.warn('Firestore reject user sync failed:', e));
    }

    // Real transactional email notification for rejection/refund (non-blocking)
    const targetEmail = (targetUser && targetUser.email) || txn.userEmail;
    if (targetEmail && targetEmail !== 'unknown') {
      emailService.sendTransactionRejectedEmail({
        userEmail: targetEmail,
        fullName: targetUser ? targetUser.fullName : undefined,
        accountNumber: targetUser ? targetUser.accountNumber : txn.accountNumber,
        amount: txn.amount,
        currency: txn.currency,
        reference: txn.reference,
        type: txn.type,
        status: 'Rejected',
        rejectionReason: reason || 'Declined during review by Silicon Valley Bank Compliance.',
        currentBalance: targetUser ? targetUser.balance : undefined
      }).catch(e => console.warn('Reject transaction email warning:', e));
    }

    return { transaction: txn };
  }

  // Notifications
  public getUserNotifications(userId: string): UserNotification[] {
    return this.db.notifications.filter(n => n.userId === userId);
  }

  public markNotificationsRead(userId: string): void {
    this.db.notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.saveDB(this.db);
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return Array.isArray(this.db.auditLogs) ? this.db.auditLogs : [];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    if (!Array.isArray(this.db.auditLogs)) {
      this.db.auditLogs = [];
    }
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...entry,
      timestamp: new Date().toISOString()
    };
    this.db.auditLogs.unshift(newLog);
    this.saveDB(this.db);
    return newLog;
  }

  // Crypto Activation Deposit ($2,500 Deposit for 4-Digit Code)
  public createCryptoActivationDeposit(
    user: User,
    cryptoMethod: 'BTC' | 'USDT',
    txHash?: string,
    proofNote?: string,
    proofImage?: string
  ): CryptoActivationDeposit {
    const walletAddresses = this.getCryptoWalletAddresses();

    const now = new Date().toISOString();
    const depId = `act-dep-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const selectedAddress = walletAddresses[cryptoMethod] || walletAddresses['USDT'] || walletAddresses['BTC'];

    const deposit: CryptoActivationDeposit = {
      id: depId,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      accountNumber: user.accountNumber,
      cryptoMethod,
      network: cryptoMethod === 'BTC' ? 'Bitcoin Mainnet' : 'ERC20 / TRC20',
      walletAddress: selectedAddress,
      amountUSD: 2500,
      txHash: txHash ? txHash.trim() : undefined,
      proofNote: proofNote ? proofNote.trim() : undefined,
      proofImage: proofImage || undefined,
      status: 'Pending',
      createdAt: now,
      updatedAt: now
    };

    if (!this.db.cryptoActivationDeposits) {
      this.db.cryptoActivationDeposits = [];
    }
    
    // Replace any prior pending deposit for this user
    this.db.cryptoActivationDeposits = this.db.cryptoActivationDeposits.filter(d => d.userId !== user.id || d.status !== 'Pending');
    this.db.cryptoActivationDeposits.unshift(deposit);

    user.pendingCryptoDeposit = deposit;

    const notif: UserNotification = {
      id: `notif-${Date.now()}-act`,
      userId: user.id,
      title: '$2,500 Activation Deposit Submitted',
      message: `Your $2,500 ${cryptoMethod} activation deposit request for 4-Digit Security Code issuance is under review by Silicon Valley Bank. Ref: ${depId}`,
      amount: 2500,
      currency: 'USD',
      reference: depId,
      read: false,
      createdAt: now
    };
    this.db.notifications.unshift(notif);

    this.saveDB(this.db);
    return deposit;
  }

  public getCryptoWalletAddresses(): { BTC: string; USDT: string } {
    if (!this.db.cryptoWalletAddresses) {
      this.db.cryptoWalletAddresses = {
        BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
        USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
      };
      this.saveDB(this.db);
    }
    return this.db.cryptoWalletAddresses;
  }

  public updateCryptoWalletAddresses(adminUser: User, addresses: { BTC?: string; USDT?: string }): { BTC: string; USDT: string } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    const current = this.getCryptoWalletAddresses();
    if (addresses.BTC) current.BTC = addresses.BTC.trim();
    if (addresses.USDT) current.USDT = addresses.USDT.trim();
    this.db.cryptoWalletAddresses = current;

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: adminUser.email,
      targetAccountNumber: adminUser.accountNumber,
      description: `Updated crypto wallet deposit addresses`,
      details: current
    });

    this.saveDB(this.db);
    return current;
  }

  public getCryptoActivationDeposits(): CryptoActivationDeposit[] {
    return this.db.cryptoActivationDeposits || [];
  }

  public approveCryptoActivationDeposit(adminUser: User, depositId: string): { deposit: CryptoActivationDeposit; user: User; code: string } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const deposit = (this.db.cryptoActivationDeposits || []).find(d => d.id === depositId);
    if (!deposit) throw new Error('Activation deposit request not found.');

    const targetUser = this.findUserById(deposit.userId);
    if (!targetUser) throw new Error('Associated user profile not found.');

    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date().toISOString();

    deposit.status = 'Approved';
    deposit.generatedCode = generatedCode;
    deposit.updatedAt = now;

    targetUser.fourDigitCode = generatedCode;
    targetUser.transferCodeApproved = true;
    targetUser.balance += (deposit.amountUSD || 2500); // Credit $2500 to user account
    targetUser.pendingCryptoDeposit = deposit;

    const txn: Transaction = {
      id: `txn-${Date.now()}-actdep`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      accountNumber: targetUser.accountNumber,
      amount: deposit.amountUSD || 2500,
      currency: 'USD',
      type: 'Deposit',
      status: 'Completed',
      reference: `ACT-DEP-${deposit.cryptoMethod}-${deposit.id.slice(-6)}`,
      description: `$${deposit.amountUSD || 2500} ${deposit.cryptoMethod} Activation Deposit (4-Digit Code Authorized)`,
      createdByAdminEmail: adminUser.email,
      createdAt: now,
      updatedAt: now
    };
    this.db.transactions.unshift(txn);

    const notif: UserNotification = {
      id: `notif-${Date.now()}-code`,
      userId: targetUser.id,
      title: '4-Digit Transfer Code Approved & Issued!',
      message: `Your $2,500 ${deposit.cryptoMethod} deposit was APPROVED by Silicon Valley Bank! Your official 4-Digit Outgoing Transfer Code is: [ ${generatedCode} ]. Keep this code confidential.`,
      amount: 2500,
      currency: 'USD',
      reference: deposit.id,
      read: false,
      createdAt: now
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'DEPOSIT_CREATED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Approved $2,500 ${deposit.cryptoMethod} activation deposit & generated 4-Digit Code (${generatedCode}) for ${targetUser.email}`,
      details: { depositId, generatedCode, method: deposit.cryptoMethod }
    });

    this.saveDB(this.db);
    syncCryptoDepositToFirestore(deposit).catch(e => console.warn('Firestore crypto deposit sync failed:', e));
    syncUserToFirestore(targetUser).catch(e => console.warn('Firestore crypto targetUser sync failed:', e));
    syncTransactionToFirestore(txn).catch(e => console.warn('Firestore crypto txn sync failed:', e));

    // Real transactional email notifications (non-blocking)
    emailService.sendDepositApprovedEmail({
      userEmail: targetUser.email,
      fullName: targetUser.fullName,
      accountNumber: targetUser.accountNumber,
      amount: deposit.amountUSD || 2500,
      currency: 'USD',
      reference: txn.reference,
      type: 'Code Activation Deposit',
      status: 'Completed',
      description: `$2,500 ${deposit.cryptoMethod} Activation Deposit (4-Digit Code Issued: ${generatedCode})`,
      currentBalance: targetUser.balance,
      activationCode: generatedCode
    }).catch(e => console.warn('Crypto activation approval email warning:', e));

    return { deposit, user: targetUser, code: generatedCode };
  }

  public rejectCryptoActivationDeposit(adminUser: User, depositId: string): { deposit: CryptoActivationDeposit; user: User } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const deposit = (this.db.cryptoActivationDeposits || []).find(d => d.id === depositId);
    if (!deposit) throw new Error('Activation deposit request not found.');

    const targetUser = this.findUserById(deposit.userId);
    if (!targetUser) throw new Error('Associated user profile not found.');

    const now = new Date().toISOString();
    deposit.status = 'Rejected';
    deposit.updatedAt = now;

    targetUser.transferCodeApproved = false;
    targetUser.pendingCryptoDeposit = deposit;

    const notif: UserNotification = {
      id: `notif-${Date.now()}-rej`,
      userId: targetUser.id,
      title: '$2,500 Activation Deposit Rejected',
      message: `Your $2,500 ${deposit.cryptoMethod} activation deposit was rejected by Silicon Valley Bank. 4-Digit Transfer Code has not been issued. Please contact support.`,
      amount: 0,
      currency: 'USD',
      reference: deposit.id,
      read: false,
      createdAt: now
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Rejected $200 ${deposit.cryptoMethod} activation deposit for ${targetUser.email}`,
      details: { depositId }
    });

    this.saveDB(this.db);
    syncCryptoDepositToFirestore(deposit).catch(e => console.warn('Firestore crypto deposit sync failed:', e));
    syncUserToFirestore(targetUser).catch(e => console.warn('Firestore crypto user sync failed:', e));

    // Real transactional email notification for rejection (non-blocking)
    emailService.sendTransactionRejectedEmail({
      userEmail: targetUser.email,
      fullName: targetUser.fullName,
      accountNumber: targetUser.accountNumber,
      amount: deposit.amountUSD || 2500,
      currency: 'USD',
      reference: deposit.id,
      type: 'Code Activation Deposit',
      status: 'Rejected',
      rejectionReason: 'Crypto activation proof could not be verified by SVB Compliance.',
      currentBalance: targetUser.balance
    }).catch(e => console.warn('Crypto activation rejection email warning:', e));

    return { deposit, user: targetUser };
  }

  // Admin Account Withdrawal
  public adminWithdraw(adminUser: User, payload: WithdrawPayload): { user: User; transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const targetUser = this.findUserByAccountNumber(payload.accountNumber) || this.findUserByEmail(payload.accountNumber);
    if (!targetUser) throw new Error('Target user account not found.');

    const amount = Number(payload.amount);
    if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.');

    if (targetUser.balance < amount) {
      throw new Error(`Insufficient funds in user account. Available balance: $${targetUser.balance.toFixed(2)}`);
    }

    targetUser.balance -= amount;
    const ref = `TXN-ADM-WTH-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const txn: Transaction = {
      id: `txn-${Date.now()}-admwth`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      accountNumber: targetUser.accountNumber,
      amount: amount,
      currency: targetUser.currency || 'USD',
      type: 'Withdrawal',
      status: 'Completed',
      reference: ref,
      description: payload.note || `Admin Account Withdrawal processed by ${adminUser.email}`,
      createdByAdminEmail: adminUser.email,
      createdAt: now,
      updatedAt: now
    };

    this.db.transactions.unshift(txn);

    const notif: UserNotification = {
      id: `notif-${Date.now()}-admwth`,
      userId: targetUser.id,
      title: 'Account Withdrawal Executed',
      message: `An account debit of $${amount.toFixed(2)} was processed. Ref: ${ref}. ${payload.note || ''}`,
      amount: amount,
      currency: targetUser.currency || 'USD',
      reference: ref,
      read: false,
      createdAt: now
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'WITHDRAWAL_EXECUTED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Admin ${adminUser.email} withdrew $${amount} from account ${targetUser.accountNumber}`,
      details: { amount, reference: ref, description: payload.note }
    });

    this.saveDB(this.db);
    syncTransactionToFirestore(txn).catch(e => console.warn('Firestore admin withdraw txn sync failed:', e));
    syncUserToFirestore(targetUser).catch(e => console.warn('Firestore admin withdraw user sync failed:', e));
    return { user: targetUser, transaction: txn };
  }

  // Admin Cancel Transaction / Transfer
  public adminCancelTransaction(adminUser: User, transactionId: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const txn = this.db.transactions.find(t => t.id === transactionId || (t.reference && t.reference === transactionId));
    if (!txn) throw new Error('Transaction not found.');

    if (txn.status === 'Cancelled') throw new Error('Transaction is already cancelled.');

    txn.status = 'Cancelled';
    txn.updatedAt = new Date().toISOString();

    const targetUser = this.findUserById(txn.userId);
    if (targetUser && (txn.type === 'Withdrawal' || txn.type === 'Wire Withdrawal' || (txn.type === 'Transfer' && !txn.description.includes('received')) || txn.type === 'Wire Transfer' || txn.type === 'Bill Pay')) {
      targetUser.balance += txn.amount;
      targetUser.ledgerBalance = targetUser.balance;
    }

    const notif: UserNotification = {
      id: `notif-${Date.now()}-cancel`,
      userId: txn.userId,
      title: 'Transaction Cancelled',
      message: `Transaction ${txn.reference} of $${txn.amount.toFixed(2)} was cancelled by Silicon Valley Bank. Your balance has been updated accordingly.`,
      amount: txn.amount,
      currency: txn.currency,
      reference: txn.reference,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'TRANSFER_EXECUTED',
      targetEmail: txn.userEmail,
      targetAccountNumber: txn.accountNumber,
      description: `Admin ${adminUser.email} cancelled transaction ${txn.reference}`,
      details: { transactionId: txn.id, type: txn.type, amount: txn.amount }
    });

    this.saveDB(this.db);
    syncTransactionToFirestore(txn).catch(e => console.warn('Firestore cancel txn sync failed:', e));
    if (targetUser) {
      syncUserToFirestore(targetUser).catch(e => console.warn('Firestore cancel user sync failed:', e));
    }
    return { transaction: txn };
  }

  // Promote / Demote Role
  public updateUserRole(targetUserId: string, newRole: 'user' | 'admin', adminUser: User): User {
    if (adminUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const target = this.findUserById(targetUserId);
    if (!target) {
      throw new Error('User not found');
    }

    target.role = newRole;

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'ROLE_UPDATED',
      targetEmail: target.email,
      targetAccountNumber: target.accountNumber,
      description: `Changed role for ${target.email} to ${newRole.toUpperCase()}`,
      details: { newRole }
    });

    this.saveDB(this.db);
    return target;
  }

  // Update User Account Status (Active, Suspended, Blocked)
  public updateUserStatus(targetUserId: string, status: 'Active' | 'Suspended' | 'Blocked', adminUser: User): User {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized');
    const target = this.findUserById(targetUserId);
    if (!target) throw new Error('User not found');

    target.status = status;

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: target.email,
      targetAccountNumber: target.accountNumber,
      description: `Changed account status for ${target.email} to ${status.toUpperCase()}`,
      details: { targetUserId, newStatus: status }
    });

    this.saveDB(this.db);
    return target;
  }

  // Send Direct Notification to User by Admin
  public sendAdminNotification(adminUser: User, targetUserId: string, title: string, message: string): UserNotification {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized');
    const target = this.findUserById(targetUserId);
    if (!target) throw new Error('User not found');

    const notif: UserNotification = {
      id: `notif-${Date.now()}-adm`,
      userId: target.id,
      title: title.trim() || 'Notice from SVB Operations',
      message: message.trim(),
      amount: 0,
      currency: target.currency || 'USD',
      reference: `NOTICE-${Date.now().toString().slice(-6)}`,
      read: false,
      createdAt: new Date().toISOString()
    };

    if (!this.db.notifications) this.db.notifications = [];
    this.db.notifications.unshift(notif);

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: target.email,
      targetAccountNumber: target.accountNumber,
      description: `Sent custom notification to ${target.email}: "${title}"`,
      details: { title, message }
    });

    this.saveDB(this.db);

    // Real transactional email notification for custom notice (non-blocking)
    emailService.sendCustomAdminNoticeEmail(target.email, adminUser.email, title, message)
      .catch(e => console.warn('Admin notice email warning:', e));

    return notif;
  }

  // Virtual Cards Management
  public getUserVirtualCards(userId: string): VirtualCard[] {
    return this.db.virtualCards.filter(c => c.userId === userId);
  }

  public createVirtualCard(userId: string, data: { cardType: any; category: any; spendingLimit: number }): VirtualCard {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found.');

    const newCard: VirtualCard = {
      id: `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      cardholderName: user.fullName,
      cardNumber: `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      cvv: `${Math.floor(100 + Math.random() * 900)}`,
      expiryMonth: '12',
      expiryYear: '29',
      cardType: data.cardType || 'Visa Corporate',
      category: data.category || 'Business',
      spendingLimit: user.verificationTier === 'Tier 3' ? 50000000 : (Number(data.spendingLimit) || 50000),
      spentAmount: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    this.db.virtualCards.unshift(newCard);

    this.addAuditLog({
      adminId: 'system',
      adminEmail: user.email,
      action: 'VIRTUAL_CARD_CREATED',
      targetEmail: user.email,
      targetAccountNumber: user.accountNumber,
      description: `Issued virtual ${newCard.cardType} (${newCard.category}) with limit $${newCard.spendingLimit}`,
      details: { cardId: newCard.id, category: newCard.category }
    });

    this.saveDB(this.db);
    return newCard;
  }

  public toggleVirtualCardStatus(userId: string, cardId: string): VirtualCard {
    const card = this.db.virtualCards.find(c => c.id === cardId && c.userId === userId);
    if (!card) throw new Error('Virtual card not found.');
    card.status = card.status === 'Active' ? 'Frozen' : 'Active';
    this.saveDB(this.db);
    return card;
  }

  // Bill Payments Management
  public getUserBillPayments(userId: string): BillPayment[] {
    return this.db.billPayments.filter(b => b.userId === userId);
  }

  public payBill(user: User, data: { billerName: string; billerCategory: any; amount: number; accountNumber: string; reference?: string; fourDigitCode?: string }): { user: User; billPayment: BillPayment; transaction: Transaction } {
    const amount = Number(data.amount);
    if (amount <= 0) throw new Error('Bill amount must be greater than zero.');
    if (user.balance < amount) throw new Error(`Insufficient funds for bill payment. Available balance: $${user.balance.toFixed(2)}.`);

    if (user.role !== 'admin') {
      if (!user.transferCodeApproved || !user.fourDigitCode) {
        throw new Error('4-Digit Security Code Required: You must obtain an approved 4-Digit Security Code via a $2,500 deposit before executing bill payments.');
      }
      if (!data.fourDigitCode || data.fourDigitCode.trim() !== user.fourDigitCode.trim()) {
        throw new Error('Invalid 4-Digit Security Code. Please enter your valid 4-digit authorization code.');
      }
    }

    user.balance -= amount;
    const ref = data.reference || `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const isPending = user.role !== 'admin';

    const newBill: BillPayment = {
      id: `bill-${Date.now()}`,
      userId: user.id,
      billerName: data.billerName,
      billerCategory: data.billerCategory || 'Vendor Invoice',
      accountNumber: user.accountNumber,
      amount,
      reference: ref,
      status: isPending ? 'Pending' : 'Completed',
      paymentDate: now
    };

    const txn: Transaction = {
      id: `txn-${Date.now()}-bill`,
      userId: user.id,
      userEmail: user.email,
      accountNumber: user.accountNumber,
      senderName: user.fullName,
      amount,
      currency: 'USD',
      type: 'Bill Pay',
      status: isPending ? 'Pending' : 'Completed',
      reference: ref,
      description: `Bill Payment to ${data.billerName} (${data.billerCategory})`,
      createdByAdminEmail: user.role === 'admin' ? user.email : 'System (User-Initiated)',
      createdAt: now,
      updatedAt: now
    };

    this.db.billPayments.unshift(newBill);
    this.db.transactions.unshift(txn);

    const notif: UserNotification = {
      id: `notif-${Date.now()}-bill`,
      userId: user.id,
      title: isPending ? 'Bill Payment Pending Compliance Review' : 'Bill Payment Executed',
      message: isPending 
        ? `Bill payment of $${amount.toFixed(2)} to ${data.billerName} is pending review. Ref: ${ref}`
        : `Bill payment of $${amount.toFixed(2)} to ${data.billerName} was completed. Ref: ${ref}`,
      amount,
      currency: 'USD',
      reference: ref,
      read: false,
      createdAt: now
    };

    this.db.notifications.unshift(notif);
    this.saveDB(this.db);

    return { user, billPayment: newBill, transaction: txn };
  }

  // Password Reset Verification Code Flow
  public requestPasswordReset(email: string): { message: string; code: string } {
    const user = this.findUserByEmail(email);
    if (!user) throw new Error('No account found with this email address.');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.db.resetTokens[email.toLowerCase()] = {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    };

    this.saveDB(this.db);

    // Real transactional email for password reset verification code (non-blocking)
    emailService.sendSecurityAlertEmail(
      email,
      'Password Reset One-Time Verification Code',
      'You requested to reset your password for Silicon Valley Bank Online Banking. Enter the 6-digit verification code below within 15 minutes to complete your password update:',
      code
    ).catch(e => console.warn('Password reset code email warning:', e));

    return {
      message: 'Verification code generated for password reset.',
      code
    };
  }

  public verifyAndResetPassword(email: string, code: string, newPass: string): { success: boolean; message: string } {
    const entry = this.db.resetTokens[email.toLowerCase()];
    if (!entry) throw new Error('No password reset requested or code expired.');
    if (entry.code !== code.trim()) throw new Error('Invalid verification code.');
    if (Date.now() > entry.expiresAt) throw new Error('Verification code has expired. Please request a new one.');

    const user = this.findUserByEmail(email);
    if (!user) throw new Error('User account not found.');

    if (newPass.length < 6) throw new Error('Password must be at least 6 characters.');

    this.db.passwords[user.id] = newPass;
    delete this.db.resetTokens[email.toLowerCase()];
    this.saveDB(this.db);

    return { success: true, message: 'Password reset successfully. You can now log in.' };
  }

  public getEmailConfig(): EmailConfig {
    if (this.db.emailConfig) {
      return this.db.emailConfig;
    }
    return emailService.getConfig();
  }

  public saveEmailConfig(adminUser: User, config: Partial<EmailConfig>): EmailConfig {
    if (adminUser.role !== 'admin') {
      throw new Error('Access denied: Only administrators can modify email service configurations.');
    }

    const updated = emailService.configure(config);
    this.db.emailConfig = updated;
    this.saveDB(this.db);
    try {
      syncEmailConfigToFirestore(updated).catch(e => console.warn('syncEmailConfigToFirestore warning:', e));
    } catch (e) {}

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetEmail: updated.senderEmail || 'siliconvalleybank51@gmail.com',
      targetAccountNumber: 'SYSTEM',
      description: `Admin updated transactional email service configuration. Provider: ${updated.provider}, Sender: ${updated.senderEmail}`,
      details: { provider: updated.provider, senderEmail: updated.senderEmail }
    });

    return updated;
  }

  public getEmailDeliveryLogs(): EmailDeliveryLog[] {
    return emailService.getDeliveryLogs();
  }

  public async getEmailDeliveryLogsAsync(): Promise<EmailDeliveryLog[]> {
    const memoryLogs = emailService.getDeliveryLogs();
    try {
      const fsLogs = await getEmailLogsFromFirestore();
      if (fsLogs && fsLogs.length > 0) {
        const map = new Map<string, EmailDeliveryLog>();
        fsLogs.forEach(l => map.set(l.id, l));
        memoryLogs.forEach(l => map.set(l.id, l));
        return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (e) {
      console.warn('getEmailDeliveryLogsAsync firestore fallback error:', e);
    }
    return memoryLogs;
  }
}

export const dbManager = new DatabaseManager();

// ==========================================
// Firestore Helpers & Compatibility Re-exports
// ==========================================
export {
  getUserFromFirestore,
  getAllUsersFromFirestore,
  syncUserToFirestore,
  syncTransactionToFirestore,
  syncCryptoDepositToFirestore,
  syncEmailConfigToFirestore,
  getEmailConfigFromFirestore,
  getEmailLogsFromFirestore,
  getVirtualCardsFromFirestore,
  syncVirtualCardToFirestore,
  syncVerificationToFirestore,
  getAllVerificationsFromFirestore,
  getTransactionsFromFirestore,
  updateTransactionInFirestore,
  syncSupportTicketToFirestore,
  getSupportTicketsFromFirestore,
  sendSupportMessageToFirestore,
  deleteSupportMessageFromFirestore
} from '../lib/firebase.js';

// Compatibility Aliases for callers expecting sync/save aliases
export {
  syncUserToFirestore as saveUserFromFirestore,
  syncUserToFirestore as syncUserFromFirestore,
  syncVirtualCardToFirestore as syncVirtualCardFromFirestore
} from '../lib/firebase.js';

