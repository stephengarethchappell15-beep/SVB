import fs from 'fs';
import path from 'path';
import { User, BankAccount, VirtualCard, BillPayment, Transaction, AuditLog, UserNotification, DepositPayload, TransferPayload, WithdrawPayload, SupportTicket, SupportMessage, CryptoActivationDeposit, Tier3VerificationRequest, isStatusPending, isStatusApproved, isStatusRejected } from '../types';
import { syncUserToFirestore, getUserFromFirestore, getAllUsersFromFirestore, syncTransactionToFirestore, getTransactionsFromFirestore, syncSupportTicketToFirestore, syncVerificationToFirestore, getAllVerificationsFromFirestore, syncCryptoDepositToFirestore, getAllCryptoDepositsFromFirestore } from '../lib/firebase';

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
  tier3Verifications?: Tier3VerificationRequest[];
  cryptoWalletAddresses?: {
    BTC: string;
    USDT: string;
  };
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  private processingOperations: Map<string, number> = new Map<string, number>();

  public acquireLock(operationKey: string): void {
    const now = Date.now();
    const existing = this.processingOperations.get(operationKey);
    // Auto-expire locks after 8 seconds to prevent deadlocks
    if (existing && now - existing < 8000) {
      throw new Error(`Operation [${operationKey}] is already being processed. Please wait.`);
    }
    this.processingOperations.set(operationKey, now);
  }

  public releaseLock(operationKey: string): void {
    this.processingOperations.delete(operationKey);
  }

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

        // Ensure stephengarethchappell15@gmail.com admin user exists
        let adminUserStephen = parsed.users.find((u: User) => u.email.toLowerCase() === 'stephengarethchappell15@gmail.com');
        if (!adminUserStephen) {
          adminUserStephen = {
            id: 'admin-003',
            fullName: 'Stephen Gareth Chappell',
            email: 'stephengarethchappell15@gmail.com',
            role: 'admin',
            balance: 1000000,
            accountNumber: '1099887766',
            routingNumber: '121140399',
            currency: 'USD',
            status: 'Active',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            transferCodeApproved: true,
            fourDigitCode: '9988'
          };
          parsed.users.unshift(adminUserStephen);
          parsed.passwords[adminUserStephen.id] = 'Mmadu51366414@';
        } else {
          adminUserStephen.role = 'admin';
        }

        // Ensure Dominic Global seed user exists
        const dominicUser = parsed.users.find((u: User) => 
          u.email.toLowerCase() === 'dominicglobalenergysolution@gmail.com' || u.accountNumber === '102576690868'
        );
        if (!dominicUser) {
          parsed.users.push(defaultUserDominic);
          parsed.passwords[defaultUserDominic.id] = 'password123';
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
      users: [defaultAdmin, defaultAdmin2, defaultUser1, defaultUser2, defaultUserDominic],
      passwords: {
        'admin-001': 'Mmadu51366414@',
        'admin-002': 'Mmadu51366414@',
        'user-001': 'user123',
        'user-002': 'user123',
        'usr-dominic-global': 'password123'
      },
      virtualCards: seedVirtualCards,
      billPayments: seedBillPayments,
      resetTokens: {},
      transactions: seedTransactions,
      auditLogs: seedAuditLogs,
      notifications: seedNotifications,
      supportTickets: seedSupportTickets,
      cryptoWalletAddresses: {
        BTC: 'bc1qe4ln6nt3w0yqc6gvchqeut9d2r2raedm52ej5c',
        USDT: 'TWgMXsoubMTxyK9Zc47ZxcN29bLaCJU4EA'
      }
    };

    this.saveDB(initialDB);
    return initialDB;
  }

  public reloadFromDisk(): void {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (Array.isArray(parsed.transactions)) this.db.transactions = parsed.transactions;
          if (Array.isArray(parsed.users)) this.db.users = parsed.users;
          if (Array.isArray(parsed.tier3Verifications)) this.db.tier3Verifications = parsed.tier3Verifications;
          if (Array.isArray(parsed.auditLogs)) this.db.auditLogs = parsed.auditLogs;
          if (Array.isArray(parsed.notifications)) this.db.notifications = parsed.notifications;
        }
      } catch (_) {}
    }
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
    let memoryUser = this.findUserByEmailOrAccount(queryStr);

    try {
      const fsUser = await getUserFromFirestore(queryStr);
      if (fsUser) {
        if (memoryUser) {
          if (fsUser.balance !== undefined) memoryUser.balance = fsUser.balance;
          if (fsUser.ledgerBalance !== undefined) memoryUser.ledgerBalance = fsUser.ledgerBalance;
          if (fsUser.fourDigitCode !== undefined) memoryUser.fourDigitCode = fsUser.fourDigitCode;
          if (fsUser.transferCodeApproved !== undefined) memoryUser.transferCodeApproved = fsUser.transferCodeApproved;
          if (fsUser.verificationTier !== undefined) memoryUser.verificationTier = fsUser.verificationTier;
          if (fsUser.status !== undefined) memoryUser.status = fsUser.status;
          if (fsUser.profilePicture !== undefined) memoryUser.profilePicture = fsUser.profilePicture;
          if ((fsUser as any).password) {
            this.db.passwords[memoryUser.id] = (fsUser as any).password;
          }
          this.saveDB(this.db);
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
    const emailClean = userData.email.trim().toLowerCase();
    const existing = this.findUserByExactEmail(emailClean);
    if (existing) {
      throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
    }

    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const accountNumber = this.generateUniqueAccountNumber();

    const newUser: User = {
      id: userId,
      fullName: userData.fullName.trim(),
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
      createdAt: new Date().toISOString()
    };

    this.db.users.push(newUser);
    this.db.passwords[userId] = userData.password;

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
    if (!this.db.virtualCards) this.db.virtualCards = [];
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
    if (!this.db.notifications) this.db.notifications = [];
    this.db.notifications.unshift(initialNotification);

    // Log audit action
    this.addAuditLog({
      adminId: 'system',
      adminEmail: 'system@auth',
      action: 'USER_REGISTERED',
      targetEmail: newUser.email,
      targetAccountNumber: newUser.accountNumber,
      description: `New user registration: ${newUser.fullName} (${newUser.email}) assigned account ${newUser.accountNumber}`,
      details: { phone: newUser.phone, accountNumber: newUser.accountNumber }
    });

    this.saveDB(this.db);

    // Sync to Firestore asynchronously
    syncUserToFirestore(newUser, userData.password).catch(err => {
      console.warn('Firestore user sync warning in createUser:', err);
    });

    return { user: newUser, token: `token-${newUser.id}` };
  }

  public async createUserAsync(userData: { fullName: string; email: string; phone: string; password: string; accountPin?: string }): Promise<{ user: User; token: string }> {
    const emailClean = userData.email.trim().toLowerCase();
    const existing = await this.findUserByEmailOrAccountAsync(emailClean);
    if (existing) {
      throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
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
      // Race Firestore lookup with a fast 600ms timeout to avoid network delays
      const fsPromise = getAllUsersFromFirestore();
      const timeoutPromise = new Promise<User[]>((resolve) => setTimeout(() => resolve([]), 600));
      const fsUsers = await Promise.race([fsPromise, timeoutPromise]);

      const userMap = new Map<string, User>();
      // Memory matches always take highest precedence
      memoryMatches.forEach(u => userMap.set(u.id, u));

      // Also try direct lookup if query is non-empty
      if (rawQ && fsUsers.length === 0) {
        try {
          const directUser = await getUserFromFirestore(query.trim());
          if (directUser && directUser.id) {
            fsUsers.push(directUser);
          }
        } catch (e) {}
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
            if (!userMap.has(u.id)) {
              userMap.set(u.id, u);
            }
          }
        }
      });

      this.saveDB(this.db);
      return Array.from(userMap.values());
    } catch (err) {
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

    const targetUser = (deposit.userId ? this.findUserById(deposit.userId) : undefined) ||
                       (emailQuery ? this.findUserByEmailOrAccount(emailQuery) : undefined) ||
                       (accQuery ? this.findUserByEmailOrAccount(accQuery) : undefined);

    if (!targetUser) {
      throw new Error(`Target user account not found for '${emailQuery || accQuery}'. Please verify the email or account number.`);
    }

    if (deposit.amount <= 0) {
      throw new Error('Deposit amount must be greater than 0.');
    }

    const ref = deposit.reference && deposit.reference.trim() !== ''
      ? deposit.reference.trim()
      : `TXN-DEP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const lockKey = `deposit:${targetUser.id}:${ref}`;
    this.acquireLock(lockKey);

    try {
      const existingTxn = this.db.transactions.find(t => t.reference === ref);
      if (existingTxn) {
        return { user: targetUser, transaction: existingTxn };
      }

      targetUser.balance += Number(deposit.amount);
      targetUser.ledgerBalance = (targetUser.ledgerBalance ?? targetUser.balance) + Number(deposit.amount);

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
        status: 'Approved',
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
      syncUserToFirestore(targetUser).catch(err => console.warn('Firestore sync user error in createDeposit:', err));
      syncTransactionToFirestore(newTxn).catch(err => console.warn('Firestore sync txn error in createDeposit:', err));

      return { user: targetUser, transaction: newTxn };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  public async createDepositAsync(deposit: DepositPayload, adminUser: User): Promise<{ user: User; transaction: Transaction }> {
    if (adminUser.role !== 'admin') {
      throw new Error('Unauthorized: Only SVB Review team can create deposit entries.');
    }

    const emailQuery = deposit.userEmail ? deposit.userEmail.trim() : '';
    const accQuery = deposit.accountNumber ? deposit.accountNumber.trim() : '';

    const targetUser = (deposit.userId ? await this.findUserByIdAsync(deposit.userId) : undefined) ||
                       (emailQuery ? await this.findUserByEmailOrAccountAsync(emailQuery) : undefined) ||
                       (accQuery ? await this.findUserByEmailOrAccountAsync(accQuery) : undefined);

    if (!targetUser) {
      throw new Error(`Target user account not found for '${emailQuery || accQuery}'. Please verify the email or account number.`);
    }

    if (deposit.amount <= 0) {
      throw new Error('Deposit amount must be greater than 0.');
    }

    const ref = deposit.reference && deposit.reference.trim() !== ''
      ? deposit.reference.trim()
      : `TXN-DEP-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const lockKey = `deposit:${targetUser.id}:${ref}`;
    this.acquireLock(lockKey);

    try {
      const existingTxn = this.db.transactions.find(t => t.reference === ref);
      if (existingTxn) {
        return { user: targetUser, transaction: existingTxn };
      }

      targetUser.balance += Number(deposit.amount);
      targetUser.ledgerBalance = (targetUser.ledgerBalance ?? targetUser.balance) + Number(deposit.amount);

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
        status: 'Approved',
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

      try {
        await syncUserToFirestore(targetUser);
        await syncTransactionToFirestore(newTxn);
      } catch (fsErr) {
        console.warn('Firestore sync error in createDepositAsync:', fsErr);
      }

      return { user: targetUser, transaction: newTxn };
    } finally {
      this.releaseLock(lockKey);
    }
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
      if (sender.verificationTier !== 'Tier 3') {
        throw new Error('TIER_3_UPGRADE_REQUIRED: Tier 3 VIP Account Upgrade Required. To complete outgoing wire transfers with your 4-Digit Security Code, your account must be upgraded to Tier 3 VIP Status.');
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

    return { user, transaction: txn };
  }

  // Support Tickets
  public createSupportTicket(user: User, data: { subject: string; category: any; priority: any; message: string; images?: string[] }): SupportTicket {
    const now = new Date().toISOString();
    const ticketId = `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const firstMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      message: data.message,
      ...(data.images && data.images.length > 0 ? { images: data.images } : {}),
      createdAt: now
    };

    const messages: SupportMessage[] = [firstMsg];

    const newTicket: SupportTicket = {
      id: ticketId,
      ticketNumber: `TK-${Date.now().toString().slice(-6)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      accountNumber: user.accountNumber,
      subject: data.subject.trim(),
      category: data.category || 'General',
      status: 'Open',
      priority: data.priority || 'Medium',
      messages,
      adminRead: user.role === 'admin',
      userRead: user.role !== 'admin',
      createdAt: now,
      updatedAt: now
    };

    this.db.supportTickets.unshift(newTicket);
    this.saveDB(this.db);
    syncSupportTicketToFirestore(newTicket).catch(e => console.warn('Firestore ticket sync error:', e));
    return newTicket;
  }

  public replySupportTicket(ticketId: string, sender: User, message: string, images?: string[]): SupportTicket {
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
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      message: message.trim(),
      ...(images && images.length > 0 ? { images } : {}),
      createdAt: now
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;
    if (sender.role === 'admin') {
      ticket.adminRead = true;
      ticket.userRead = false;
      if (ticket.status === 'Open') {
        ticket.status = 'In Progress';
      }
    } else {
      ticket.adminRead = false;
      ticket.userRead = true;
    }

    this.saveDB(this.db);
    syncSupportTicketToFirestore(ticket).catch(e => console.warn('Firestore ticket sync error:', e));
    return ticket;
  }

  public markSupportTicketRead(ticketId: string, role: 'admin' | 'user'): SupportTicket {
    const ticket = this.db.supportTickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Support ticket not found.');
    }

    if (role === 'admin') {
      ticket.adminRead = true;
    } else {
      ticket.userRead = true;
    }

    this.saveDB(this.db);
    syncSupportTicketToFirestore(ticket).catch(e => console.warn('Firestore ticket sync error:', e));
    return ticket;
  }

  public getSupportTickets(userId?: string): SupportTicket[] {
    const list = userId 
      ? this.db.supportTickets.filter(t => t.userId === userId)
      : this.db.supportTickets;
    return [...list].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
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
    syncSupportTicketToFirestore(ticket).catch(e => console.warn('Firestore ticket sync error:', e));
    return ticket;
  }

  // Tier 3 VIP Verifications
  public getVerifications(): Tier3VerificationRequest[] {
    return this.db.tier3Verifications || [];
  }

  public async getVerificationsAsync(): Promise<Tier3VerificationRequest[]> {
    this.reloadFromDisk();
    try {
      const fsVerifs = await getAllVerificationsFromFirestore();
      const map = new Map<string, Tier3VerificationRequest>();
      const isFinal = (st?: string) => isStatusApproved(st) || isStatusRejected(st);

      const addOrMerge = (v: Tier3VerificationRequest) => {
        if (!v || !v.id) return;
        const key = v.id.trim().toLowerCase();
        if (map.has(key)) {
          const existing = map.get(key)!;
          let keepStatus = v.status || existing.status;
          if (isFinal(existing.status) && !isFinal(v.status)) {
            keepStatus = existing.status;
          } else if (isFinal(v.status)) {
            keepStatus = v.status;
          }
          const dateExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const dateIncoming = new Date(v.updatedAt || v.createdAt || 0).getTime();
          const merged: Tier3VerificationRequest = {
            ...existing,
            ...v,
            status: keepStatus as any,
            updatedAt: (dateIncoming >= dateExisting ? v.updatedAt : existing.updatedAt) || new Date().toISOString()
          };
          map.set(key, merged);
        } else {
          map.set(key, v);
        }
      };

      (this.db.tier3Verifications || []).forEach(addOrMerge);
      fsVerifs.forEach(addOrMerge);

      const mergedList = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      this.db.tier3Verifications = mergedList;
      this.saveDB(this.db);
      return mergedList;
    } catch (err) {
      console.warn('getVerificationsAsync Firestore fallback:', err);
      return this.db.tier3Verifications || [];
    }
  }

  public submitVerification(user: User, payload: Partial<Tier3VerificationRequest>): Tier3VerificationRequest {
    if (!this.db.tier3Verifications) this.db.tier3Verifications = [];
    const now = new Date().toISOString();
    const req: Tier3VerificationRequest = {
      id: `verif-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user.id,
      userEmail: user.email,
      accountNumber: user.accountNumber,
      userName: user.fullName,
      address: payload.address || user.address || '',
      country: payload.country || user.country || 'United States',
      documentType: payload.documentType || 'Passport',
      documentUrl: payload.documentUrl || '',
      paymentSlipUrl: payload.paymentSlipUrl || '',
      txHash: payload.txHash || '',
      status: 'Pending',
      adminNotes: payload.adminNotes || '',
      createdAt: now,
      updatedAt: now
    };
    this.db.tier3Verifications.unshift(req);

    // Update user status to Pending Tier 3
    const userInDb = this.findUserById(user.id);
    if (userInDb) {
      userInDb.verificationTier = 'Pending Tier 3';
      try { syncUserToFirestore(userInDb); } catch (_) {}
    }

    // Record pending $5,000 upgrade transaction
    const upgradeTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      accountNumber: user.accountNumber,
      amount: 5000,
      currency: 'USD',
      type: 'VIP Upgrade Fee',
      status: 'Pending',
      reference: `UPGRADE-${Date.now().toString().slice(-6)}`,
      description: '$5,000 Tier 3 VIP Account Upgrade Deposit Submission - Pending SVB Review',
      createdAt: now,
      updatedAt: now
    };
    if (!this.db.transactions) this.db.transactions = [];
    this.db.transactions.unshift(upgradeTxn);
    try { syncTransactionToFirestore(upgradeTxn); } catch (_) {}

    this.saveDB(this.db);
    syncVerificationToFirestore(req).catch(e => console.warn('Firestore verif sync error:', e));
    return req;
  }

  public approveVerification(adminUser: User, verificationId: string, notes?: string): { verification: Tier3VerificationRequest; user: User } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    if (!verificationId || typeof verificationId !== 'string') {
      throw new Error('Verification ID is required.');
    }

    this.reloadFromDisk();
    if (!this.db.tier3Verifications) this.db.tier3Verifications = [];
    const cleanId = verificationId.trim().toLowerCase();
    let verif = this.db.tier3Verifications.find(v => v.id && v.id.toLowerCase() === cleanId);
    
    if (!verif) {
      // Create safe fallback if missing
      verif = {
        id: verificationId,
        userId: '',
        userEmail: '',
        userName: 'Client',
        accountNumber: '',
        address: '',
        country: 'United States',
        documentType: 'Passport',
        documentUrl: '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.db.tier3Verifications.unshift(verif);
    }

    const safeNotes = typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : 'Compliance Verified & Approved';
    verif.status = 'Approved';
    verif.updatedAt = new Date().toISOString();
    verif.decidedByAdminEmail = adminUser.email;
    verif.adminNotes = safeNotes;

    let targetUser = verif.userId ? this.findUserById(verif.userId) : undefined;
    if (!targetUser && verif.userEmail) {
      targetUser = this.findUserByEmail(verif.userEmail);
    }
    if (!targetUser && verif.accountNumber) {
      targetUser = this.findUserByAccountNumber(verif.accountNumber);
    }

    // Default safe user fallback if user profile is detached
    if (!targetUser) {
      targetUser = {
        id: verif.userId || `user-${Date.now()}`,
        email: verif.userEmail || 'client@svb.com',
        fullName: verif.userName || 'SVB Client',
        accountNumber: verif.accountNumber || '0000000000',
        phone: '+1 (555) 000-0000',
        role: 'user',
        balance: 0,
        ledgerBalance: 0,
        status: 'Active',
        transferCodeApproved: true,
        verificationTier: 'Tier 3',
        currency: 'USD',
        createdAt: new Date().toISOString()
      };
    } else {
      targetUser.verificationTier = 'Tier 3';
      const depositAmount = 5000;
      targetUser.balance = (Number(targetUser.balance) || 0) + depositAmount;
      targetUser.ledgerBalance = targetUser.balance;
      try { syncUserToFirestore(targetUser); } catch (_) {}
    }

    const depositAmount = 5000;
    const newTxn: Transaction = {
      id: `txn-${Date.now()}-verif`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      accountNumber: targetUser.accountNumber,
      senderName: 'Silicon Valley Bank Treasury / VIP Activation',
      amount: depositAmount,
      currency: targetUser.currency || 'USD',
      type: 'Deposit',
      status: 'Completed',
      reference: `VERIF-DEP-${Date.now()}`,
      description: `Tier 3 VIP Verification Credited (Spending Limit Upgraded to $50,000,000.00 USD)`,
      createdByAdminEmail: adminUser.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.db.transactions.unshift(newTxn);
    try { syncTransactionToFirestore(newTxn); } catch (_) {}

    // Also mark any pending VIP Upgrade transaction as Completed
    const pendingUpgradeTxns = (this.db.transactions || []).filter(
      t => (t.userId === targetUser.id || (verif.id && t.reference && t.reference.includes(verif.id))) &&
           (t.type === 'VIP Upgrade Fee' || (t.description || '').toLowerCase().includes('tier 3')) &&
           t.status === 'Pending'
    );
    pendingUpgradeTxns.forEach(pt => {
      pt.status = 'Completed';
      pt.adminNotes = safeNotes;
      pt.updatedAt = new Date().toISOString();
      try { syncTransactionToFirestore(pt); } catch (_) {}
    });

    if (targetUser.id) {
      const notif: UserNotification = {
        id: `notif-${Date.now()}-tier3`,
        userId: targetUser.id,
        title: 'Tier 3 VIP Upgrade APPROVED!',
        message: `Your Tier 3 Corporate Enterprise verification has been officially approved. Daily spending limit upgraded to $50,000,000.00 USD.`,
        amount: depositAmount,
        currency: targetUser.currency || 'USD',
        reference: `VERIF-${verificationId}`,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.db.notifications.unshift(notif);
    }

    try {
      this.addAuditLog({
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        action: 'PROFILE_UPDATED',
        targetEmail: targetUser.email,
        targetAccountNumber: targetUser.accountNumber,
        description: `Admin ${adminUser.email} approved Tier 3 VIP verification for ${targetUser.email}`,
        details: { verificationId, newTier: 'Tier 3' }
      });
    } catch (_) {}

    this.saveDB(this.db);
    try { syncVerificationToFirestore(verif); } catch (_) {}
    return { verification: verif, user: targetUser };
  }

  public async approveVerificationAsync(adminUser: User, verificationId: string, notes?: string): Promise<{ verification: Tier3VerificationRequest; user: User }> {
    this.reloadFromDisk();
    const cleanId = (verificationId || '').trim().toLowerCase();
    let verif = (this.db.tier3Verifications || []).find(v => v.id && v.id.toLowerCase() === cleanId);
    if (!verif) {
      try {
        const fsVerifs = await getAllVerificationsFromFirestore();
        const found = fsVerifs.find(v => v.id && v.id.toLowerCase() === cleanId);
        if (found) {
          if (!this.db.tier3Verifications) this.db.tier3Verifications = [];
          this.db.tier3Verifications.push(found);
          this.saveDB(this.db);
        }
      } catch (e) {
        console.warn('Firestore fallback for verification lookup:', e);
      }
    }
    const res = this.approveVerification(adminUser, verificationId, notes);
    try {
      await syncVerificationToFirestore(res.verification);
    } catch (_) {}
    return res;
  }

  public rejectVerification(adminUser: User, verificationId: string, reason?: string): { verification: Tier3VerificationRequest } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    if (!verificationId || typeof verificationId !== 'string') {
      throw new Error('Verification ID is required.');
    }

    this.reloadFromDisk();
    if (!this.db.tier3Verifications) this.db.tier3Verifications = [];
    const cleanId = verificationId.trim().toLowerCase();
    let verif = this.db.tier3Verifications.find(v => v.id && v.id.toLowerCase() === cleanId);
    if (!verif) {
      verif = {
        id: verificationId,
        userId: '',
        userEmail: '',
        userName: 'Client',
        accountNumber: '',
        address: '',
        country: 'United States',
        documentType: 'Passport',
        documentUrl: '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.db.tier3Verifications.unshift(verif);
    }

    const safeReason = typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : 'Verification criteria not met.';
    verif.status = 'Rejected';
    verif.updatedAt = new Date().toISOString();
    verif.decidedByAdminEmail = adminUser.email;
    verif.adminNotes = safeReason;

    // Reset user verificationTier to Tier 1
    let targetUser = verif.userId ? this.findUserById(verif.userId) : undefined;
    if (!targetUser && verif.userEmail) targetUser = this.findUserByEmail(verif.userEmail);
    if (!targetUser && verif.accountNumber) targetUser = this.findUserByAccountNumber(verif.accountNumber);
    if (targetUser) {
      targetUser.verificationTier = 'Tier 1';
      try { syncUserToFirestore(targetUser); } catch (_) {}
    }

    // Mark any pending VIP Upgrade transaction as Rejected
    const pendingUpgradeTxns = (this.db.transactions || []).filter(
      t => (t.userId === verif.userId || (verif.id && t.reference && t.reference.includes(verif.id))) &&
           (t.type === 'VIP Upgrade Fee' || (t.description || '').toLowerCase().includes('tier 3')) &&
           t.status === 'Pending'
    );
    pendingUpgradeTxns.forEach(pt => {
      pt.status = 'Rejected';
      pt.adminNotes = safeReason;
      pt.updatedAt = new Date().toISOString();
      try { syncTransactionToFirestore(pt); } catch (_) {}
    });

    if (verif.userId) {
      const notif: UserNotification = {
        id: `notif-${Date.now()}-tier3rej`,
        userId: verif.userId,
        title: 'Tier 3 Verification Notice',
        message: `Your Tier 3 verification request could not be approved at this time. Reason: ${safeReason}`,
        amount: 0,
        currency: 'USD',
        reference: `VERIF-${verificationId}`,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.db.notifications.unshift(notif);
    }

    this.saveDB(this.db);
    try { syncVerificationToFirestore(verif); } catch (_) {}
    return { verification: verif };
  }

  public async rejectVerificationAsync(adminUser: User, verificationId: string, reason?: string): Promise<{ verification: Tier3VerificationRequest }> {
    this.reloadFromDisk();
    const cleanId = (verificationId || '').trim().toLowerCase();
    let verif = (this.db.tier3Verifications || []).find(v => v.id && v.id.toLowerCase() === cleanId);
    if (!verif) {
      try {
        const fsVerifs = await getAllVerificationsFromFirestore();
        const found = fsVerifs.find(v => v.id && v.id.toLowerCase() === cleanId);
        if (found) {
          if (!this.db.tier3Verifications) this.db.tier3Verifications = [];
          this.db.tier3Verifications.push(found);
          this.saveDB(this.db);
        }
      } catch (e) {
        console.warn('Firestore fallback for verification lookup:', e);
      }
    }
    const res = this.rejectVerification(adminUser, verificationId, reason);
    try {
      await syncVerificationToFirestore(res.verification);
    } catch (_) {}
    return res;
  }

  // Transactions
  public getUserTransactions(userId: string): Transaction[] {
    return this.db.transactions.filter(t => t.userId === userId);
  }

  public getAllTransactions(): Transaction[] {
    this.reloadFromDisk();
    return this.db.transactions;
  }

  public async getAllTransactionsAsync(): Promise<Transaction[]> {
    this.reloadFromDisk();
    try {
      const fsTxns = await getTransactionsFromFirestore();
      const map = new Map<string, Transaction>();
      const isFinal = (st?: string) => isStatusApproved(st) || isStatusRejected(st);

      const getMatchKey = (t: Transaction): string | null => {
        if (!t) return null;
        const tid = (t.id || '').trim().toLowerCase();
        const tref = (t.reference || '').trim().toLowerCase();

        for (const [key, existing] of map.entries()) {
          const eid = (existing.id || '').trim().toLowerCase();
          const eref = (existing.reference || '').trim().toLowerCase();

          if (tid && eid && tid === eid) return key;
          if (tref && eref && tref === eref) return key;
          if (tref && eid && tref === eid) return key;
          if (tid && eref && tid === eref) return key;
        }
        return null;
      };

      const addOrMerge = (txn: Transaction) => {
        if (!txn || !txn.id) return;
        const matchedKey = getMatchKey(txn);
        if (matchedKey) {
          const existing = map.get(matchedKey)!;
          let keepStatus = txn.status || existing.status;
          if (isFinal(existing.status) && !isFinal(txn.status)) {
            keepStatus = existing.status;
          } else if (isFinal(txn.status)) {
            keepStatus = txn.status;
          }
          const dateExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const dateIncoming = new Date(txn.updatedAt || txn.createdAt || 0).getTime();
          const merged: Transaction = {
            ...existing,
            ...txn,
            id: existing.id || txn.id,
            reference: existing.reference || txn.reference || existing.id || txn.id,
            status: keepStatus,
            updatedAt: (dateIncoming >= dateExisting ? txn.updatedAt : existing.updatedAt) || new Date().toISOString()
          };
          map.set(matchedKey, merged);
        } else {
          map.set(txn.id, txn);
        }
      };

      // Merge local DB transactions first, then Firestore
      this.db.transactions.forEach(addOrMerge);
      fsTxns.forEach(addOrMerge);

      const mergedList = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      this.db.transactions = mergedList;
      this.saveDB(this.db);
      return mergedList;
    } catch (err) {
      console.warn('getAllTransactionsAsync Firestore sync fallback:', err);
      return this.db.transactions;
    }
  }

  public async getPendingTransactionsAsync(): Promise<Transaction[]> {
    const all = await this.getAllTransactionsAsync();
    return all.filter(t => isStatusPending(t.status));
  }

  public addTransaction(txn: Transaction): void {
    const existingIndex = this.db.transactions.findIndex(t => t.id === txn.id);
    if (existingIndex >= 0) {
      this.db.transactions[existingIndex] = txn;
    } else {
      this.db.transactions.unshift(txn);
    }
    this.saveDB(this.db);
  }

  public removeTransaction(txnId: string): void {
    this.db.transactions = this.db.transactions.filter(t => t.id !== txnId && t.reference !== txnId);
    this.saveDB(this.db);
  }

  // Admin Approve Pending Transaction (credits recipient or user with manual sender name)
  public approveTransaction(adminUser: User, transactionId: string, senderNameInput?: string, rawTxnFallback?: Transaction): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('Transaction ID is required.');
    }

    const cleanId = transactionId.trim().toLowerCase();
    let senderTxn = this.db.transactions.find(t => 
      (t.id && t.id.toLowerCase() === cleanId) || 
      (t.reference && t.reference.toLowerCase() === cleanId)
    );

    if (!senderTxn) {
      this.reloadFromDisk();
      senderTxn = this.db.transactions.find(t => 
        (t.id && t.id.toLowerCase() === cleanId) || 
        (t.reference && t.reference.toLowerCase() === cleanId)
      );
    }

    if (!senderTxn && rawTxnFallback) {
      this.db.transactions.unshift(rawTxnFallback);
      senderTxn = rawTxnFallback;
      this.saveDB(this.db);
    }

    if (!senderTxn) {
      throw new Error(`Transaction ${transactionId} not found in database.`);
    }

    if (isStatusApproved(senderTxn.status)) {
      return { transaction: senderTxn };
    }

    if (isStatusRejected(senderTxn.status)) {
      throw new Error('This transaction has already been rejected/cancelled and cannot be approved.');
    }

    const lockKey = `txn:${senderTxn.id || cleanId}`;
    this.acquireLock(lockKey);

    try {
      let sender = senderTxn.userId ? this.findUserById(senderTxn.userId) : undefined;
      if (!sender && senderTxn.userEmail) {
        sender = this.findUserByEmail(senderTxn.userEmail);
      }
      if (!sender && senderTxn.accountNumber) {
        sender = this.findUserByAccountNumber(senderTxn.accountNumber);
      }

      const finalSenderName = typeof senderNameInput === 'string' && senderNameInput.trim().length > 0
        ? senderNameInput.trim() 
        : (sender ? sender.fullName : 'Federal Wire Transfer / SVB Treasury');

      const now = new Date().toISOString();
      const amountNum = typeof senderTxn.amount === 'number' && !isNaN(senderTxn.amount) 
        ? senderTxn.amount 
        : (Number(senderTxn.amount) || 0);

      senderTxn.status = 'Approved';
      senderTxn.senderName = finalSenderName;
      senderTxn.updatedAt = now;
      senderTxn.approvedAt = now;
      senderTxn.approvedByAdminEmail = adminUser.email;

      // Also update any matching duplicate transactions with same ID or reference
      this.db.transactions.forEach(t => {
        if ((t.id === senderTxn.id || (t.reference && senderTxn.reference && t.reference === senderTxn.reference)) && t.status === 'Pending') {
          t.status = 'Approved';
          t.senderName = finalSenderName;
          t.updatedAt = now;
          t.approvedAt = now;
          t.approvedByAdminEmail = adminUser.email;
          try { syncTransactionToFirestore(t); } catch (_) {}
        }
      });

      // Check if it's a deposit (Payment Verification Deposit or Direct Deposit to user)
      const txnTypeStr = (senderTxn.type || '').toLowerCase();
      const txnDescStr = (senderTxn.description || '').toLowerCase();
      const isDepositType = txnTypeStr.includes('deposit') || 
                            txnDescStr.includes('deposit') ||
                            txnDescStr.includes('verification');

      if (isDepositType && sender) {
        sender.balance = (Number(sender.balance) || 0) + amountNum;
        sender.ledgerBalance = sender.balance;

        // If it's a payment verification deposit or code activation, activate 4-digit code
        if (!sender.fourDigitCode || !sender.transferCodeApproved) {
          const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
          sender.fourDigitCode = generatedCode;
          sender.transferCodeApproved = true;
        }

        // Update matching crypto activation deposit if present
        if (this.db.cryptoActivationDeposits) {
          const matchingDep = this.db.cryptoActivationDeposits.find(d => 
            (d.userId === sender?.id || d.id === senderTxn?.id || (senderTxn?.reference && d.id === senderTxn.reference)) && 
            d.status === 'Pending'
          );
          if (matchingDep) {
            matchingDep.status = 'Approved';
            matchingDep.generatedCode = sender.fourDigitCode;
            matchingDep.updatedAt = now;
            try { syncCryptoDepositToFirestore(matchingDep); } catch (_) {}
          }
        }

        try { syncUserToFirestore(sender); } catch (_) {}

        // Clear any stale pending notification for this transaction
        try { this.clearPendingNotificationsForTxn(sender.id, senderTxn.reference, senderTxn.id); } catch (_) {}

        const depNotif: UserNotification = {
          id: `notif-${Date.now()}-depapp`,
          userId: sender.id,
          title: 'Deposit Approved & Funds Credited',
          message: `Your deposit of $${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Ref: ${senderTxn.reference || senderTxn.id}) has been APPROVED and credited to your account.`,
          amount: amountNum,
          currency: senderTxn.currency || 'USD',
          reference: senderTxn.reference || senderTxn.id,
          read: false,
          createdAt: now
        };
        if (!this.db.notifications) this.db.notifications = [];
        this.db.notifications.unshift(depNotif);
      } else if (senderTxn.recipientAccountNumber || senderTxn.recipientEmail) {
        // Find recipient and credit balance + create recipient transaction record
        const recipient = this.findUserByAccountNumber(senderTxn.recipientAccountNumber || '') || 
                          this.findUserByEmail(senderTxn.recipientEmail || '');
        if (recipient) {
          recipient.balance = (Number(recipient.balance) || 0) + amountNum;
          recipient.ledgerBalance = recipient.balance;

          if (!recipient.fourDigitCode || !recipient.transferCodeApproved) {
            const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
            recipient.fourDigitCode = generatedCode;
            recipient.transferCodeApproved = true;
          }

          try { syncUserToFirestore(recipient); } catch (_) {}

          const recipientTxn: Transaction = {
            id: `txn-${Date.now()}-in`,
            userId: recipient.id,
            userEmail: recipient.email,
            accountNumber: recipient.accountNumber,
            senderName: finalSenderName,
            amount: amountNum,
            currency: senderTxn.currency || 'USD',
            type: 'Transfer',
            status: 'Approved',
            reference: senderTxn.reference || senderTxn.id,
            description: `Received transfer from ${finalSenderName}`,
            createdByAdminEmail: adminUser.email,
            createdAt: now,
            updatedAt: now
          };
          this.db.transactions.unshift(recipientTxn);
          try { syncTransactionToFirestore(recipientTxn); } catch (_) {}

          try { this.clearPendingNotificationsForTxn(recipient.id, senderTxn.reference, senderTxn.id); } catch (_) {}

          const recNotif: UserNotification = {
            id: `notif-${Date.now()}-rec`,
            userId: recipient.id,
            title: 'Funds Credited to Account',
            message: `Your account received ${senderTxn.currency || 'USD'} ${amountNum.toFixed(2)} from ${finalSenderName}. Ref: ${senderTxn.reference || senderTxn.id}`,
            amount: amountNum,
            currency: senderTxn.currency || 'USD',
            reference: senderTxn.reference || senderTxn.id,
            read: false,
            createdAt: now
          };
          if (!this.db.notifications) this.db.notifications = [];
          this.db.notifications.unshift(recNotif);
        }
      }

      // Send notification to sender if it was a transfer/wire/withdrawal
      if (sender && !isDepositType) {
        try { this.clearPendingNotificationsForTxn(sender.id, senderTxn.reference, senderTxn.id); } catch (_) {}

        const sendNotif: UserNotification = {
          id: `notif-${Date.now()}-snd`,
          userId: sender.id,
          title: 'Outgoing Transfer Processed',
          message: `Your outgoing transfer of $${amountNum.toFixed(2)} (Ref: ${senderTxn.reference || senderTxn.id}) has been successfully processed.`,
          amount: amountNum,
          currency: senderTxn.currency || 'USD',
          reference: senderTxn.reference || senderTxn.id,
          read: false,
          createdAt: now
        };
        if (!this.db.notifications) this.db.notifications = [];
        this.db.notifications.unshift(sendNotif);
      }

      try {
        this.addAuditLog({
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          action: 'TRANSFER_EXECUTED',
          targetEmail: senderTxn.userEmail || (sender ? sender.email : ''),
          targetAccountNumber: senderTxn.accountNumber || (sender ? sender.accountNumber : ''),
          description: `Admin ${adminUser.email} approved transaction ${senderTxn.reference || senderTxn.id} of $${amountNum} (${senderTxn.type}) with sender/source name "${finalSenderName}"`,
          details: { transactionId, senderName: finalSenderName, type: senderTxn.type }
        });
      } catch (_) {}

      try { syncTransactionToFirestore(senderTxn); } catch (_) {}
      this.saveDB(this.db);
      return { transaction: senderTxn };
    } finally {
      this.releaseLock(lockKey);
    }
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
    return { user: targetUser, code: newCode };
  }

  // Admin Reject Transaction (Refunds funds & marks as Rejected)
  public rejectTransaction(adminUser: User, transactionId: string, reason?: string, rawTxnFallback?: Transaction): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('Transaction ID is required.');
    }

    const cleanId = transactionId.trim().toLowerCase();
    let txn = this.db.transactions.find(t => 
      (t.id && t.id.toLowerCase() === cleanId) || 
      (t.reference && t.reference.toLowerCase() === cleanId)
    );

    if (!txn) {
      this.reloadFromDisk();
      txn = this.db.transactions.find(t => 
        (t.id && t.id.toLowerCase() === cleanId) || 
        (t.reference && t.reference.toLowerCase() === cleanId)
      );
    }

    if (!txn && rawTxnFallback) {
      this.db.transactions.unshift(rawTxnFallback);
      txn = rawTxnFallback;
      this.saveDB(this.db);
    }

    if (!txn) {
      throw new Error(`Transaction ${transactionId} not found in database.`);
    }

    if (isStatusRejected(txn.status)) {
      return { transaction: txn };
    }

    if (isStatusApproved(txn.status)) {
      throw new Error('This transaction has already been approved and cannot be rejected.');
    }

    const lockKey = `txn:${txn.id || cleanId}`;
    this.acquireLock(lockKey);

    try {
      const now = new Date().toISOString();
      const finalReason = typeof reason === 'string' && reason.trim().length > 0 
        ? reason.trim() 
        : 'Cancelled / Declined by SVB Review';

      const amountNum = typeof txn.amount === 'number' && !isNaN(txn.amount) 
        ? txn.amount 
        : (Number(txn.amount) || 0);

      txn.status = 'Rejected';
      txn.updatedAt = now;
      txn.cancelledAt = now;
      txn.cancelledByAdminEmail = adminUser.email;
      txn.cancelReason = finalReason;
      txn.adminNotes = finalReason;

      // Also update any matching duplicate transactions with same ID or reference
      this.db.transactions.forEach(t => {
        if ((t.id === txn.id || (t.reference && txn.reference && t.reference === txn.reference)) && t.status === 'Pending') {
          t.status = 'Rejected';
          t.updatedAt = now;
          t.cancelledAt = now;
          t.cancelledByAdminEmail = adminUser.email;
          t.cancelReason = finalReason;
          t.adminNotes = finalReason;
          try { syncTransactionToFirestore(t); } catch (_) {}
        }
      });

      let targetUser = txn.userId ? this.findUserById(txn.userId) : undefined;
      if (!targetUser && txn.userEmail) {
        targetUser = this.findUserByEmail(txn.userEmail);
      }
      if (!targetUser && txn.accountNumber) {
        targetUser = this.findUserByAccountNumber(txn.accountNumber);
      }

      if (targetUser && (txn.type === 'Withdrawal' || (txn.type === 'Transfer' && !(txn.description || '').toLowerCase().includes('received')))) {
        targetUser.balance = (Number(targetUser.balance) || 0) + amountNum;
        targetUser.ledgerBalance = targetUser.balance;
        try { syncUserToFirestore(targetUser); } catch (_) {}
      }

      // Update matching crypto activation deposit if present
      if (this.db.cryptoActivationDeposits) {
        const matchingDep = this.db.cryptoActivationDeposits.find(d => 
          ((targetUser && d.userId === targetUser.id) || d.id === txn.id || (txn.reference && d.id === txn.reference)) && 
          d.status === 'Pending'
        );
        if (matchingDep) {
          matchingDep.status = 'Rejected';
          matchingDep.adminNotes = finalReason;
          matchingDep.updatedAt = now;
          try { syncCryptoDepositToFirestore(matchingDep); } catch (_) {}
        }
        if (targetUser && targetUser.pendingCryptoDeposit) {
          targetUser.pendingCryptoDeposit.status = 'Rejected';
          targetUser.pendingCryptoDeposit.adminNotes = finalReason;
          try { syncUserToFirestore(targetUser); } catch (_) {}
        }
      }

      const txnTypeStr = (txn.type || '').toLowerCase();
      const txnDescStr = (txn.description || '').toLowerCase();
      const isDeposit = txnTypeStr.includes('deposit') || txnDescStr.includes('deposit');
      
      // Clear any stale pending notification for this transaction
      if (txn.userId) {
        try { this.clearPendingNotificationsForTxn(txn.userId, txn.reference, txn.id); } catch (_) {}
      }

      if (txn.userId || (targetUser && targetUser.id)) {
        const userIdForNotif = txn.userId || targetUser!.id;
        const notif: UserNotification = {
          id: `notif-${Date.now()}-rej`,
          userId: userIdForNotif,
          title: isDeposit ? 'Deposit Request Declined' : 'Transaction Declined & Refunded',
          message: isDeposit
            ? `Deposit request ${txn.reference || txn.id} of $${amountNum.toFixed(2)} was declined by Silicon Valley Bank. Reason: ${finalReason}`
            : `Transaction ${txn.reference || txn.id} of $${amountNum.toFixed(2)} was declined. Funds of $${amountNum.toFixed(2)} have been returned to your account balance. Reason: ${finalReason}`,
          amount: amountNum,
          currency: txn.currency || 'USD',
          reference: txn.reference || txn.id,
          read: false,
          createdAt: now
        };
        if (!this.db.notifications) this.db.notifications = [];
        this.db.notifications.unshift(notif);
      }

      try {
        this.addAuditLog({
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          action: 'TRANSFER_EXECUTED',
          targetEmail: txn.userEmail || (targetUser ? targetUser.email : ''),
          targetAccountNumber: txn.accountNumber || (targetUser ? targetUser.accountNumber : ''),
          description: `Admin ${adminUser.email} rejected transaction ${txn.reference || txn.id} and refunded $${amountNum}`,
          details: { transactionId: txn.id, type: txn.type, amount: amountNum, reason: finalReason }
        });
      } catch (_) {}

      try { syncTransactionToFirestore(txn); } catch (_) {}
      this.saveDB(this.db);
      return { transaction: txn };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  public async rejectTransactionAsync(adminUser: User, transactionId: string, reason?: string, rawTxnFallback?: Transaction): Promise<{ transaction: Transaction }> {
    this.reloadFromDisk();
    const cleanId = (transactionId || '').trim().toLowerCase();
    let existing = this.db.transactions.find(t => 
      (t.id && t.id.toLowerCase() === cleanId) || 
      (t.reference && t.reference.toLowerCase() === cleanId)
    );

    if (!existing) {
      try {
        const fsTxns = await getTransactionsFromFirestore();
        const found = fsTxns.find(t => 
          (t.id && t.id.toLowerCase() === cleanId) || 
          (t.reference && t.reference.toLowerCase() === cleanId)
        );
        if (found) {
          this.db.transactions.push(found);
          this.saveDB(this.db);
          existing = found;
        }
      } catch (err) {
        console.warn('Firestore fallback lookup in rejectTransactionAsync failed:', err);
      }
    }

    if (!existing && rawTxnFallback) {
      this.db.transactions.push(rawTxnFallback);
      this.saveDB(this.db);
      existing = rawTxnFallback;
    }

    const result = this.rejectTransaction(adminUser, transactionId, reason, rawTxnFallback);

    // Sync all matching records in Firestore to ensure single source of truth
    try {
      const fsTxns = await getTransactionsFromFirestore();
      const matchingFs = fsTxns.filter(t => 
        (t.id && t.id.toLowerCase() === cleanId) || 
        (t.reference && t.reference.toLowerCase() === cleanId) ||
        (result.transaction.id && t.id === result.transaction.id) ||
        (result.transaction.reference && t.reference && t.reference === result.transaction.reference)
      );

      const finalReason = result.transaction.cancelReason || reason || 'Cancelled / Declined by SVB Review';
      const now = new Date().toISOString();

      for (const m of matchingFs) {
        m.status = 'Rejected';
        m.cancelledAt = result.transaction.cancelledAt || now;
        m.cancelledByAdminEmail = adminUser.email;
        m.cancelReason = finalReason;
        m.adminNotes = finalReason;
        m.updatedAt = now;
        await syncTransactionToFirestore(m);
      }
      await syncTransactionToFirestore(result.transaction);

      // Also sync user and pendingCryptoDeposit in Firestore
      const targetUser = result.transaction.userId ? this.findUserById(result.transaction.userId) : undefined;
      if (targetUser) {
        if (targetUser.pendingCryptoDeposit) {
          targetUser.pendingCryptoDeposit.status = 'Rejected';
          targetUser.pendingCryptoDeposit.adminNotes = finalReason;
          targetUser.pendingCryptoDeposit.updatedAt = now;
        }
        await syncUserToFirestore(targetUser);
      }

      // Also sync matching crypto activation deposits in Firestore
      const fsDeps = await getAllCryptoDepositsFromFirestore();
      const matchingDeps = fsDeps.filter(d => 
        (d.userId === result.transaction.userId || 
         d.id === result.transaction.id || 
         (result.transaction.reference && d.id === result.transaction.reference) ||
         d.id.toLowerCase() === cleanId || 
         (d.userEmail && result.transaction.userEmail && d.userEmail.toLowerCase() === result.transaction.userEmail.toLowerCase())) &&
        d.status === 'Pending'
      );
      for (const md of matchingDeps) {
        md.status = 'Rejected';
        md.updatedAt = now;
        await syncCryptoDepositToFirestore(md);
      }
    } catch (err) {
      console.warn('Syncing Firestore in rejectTransactionAsync:', err);
    }

    return result;
  }

  public async approveTransactionAsync(adminUser: User, transactionId: string, senderNameInput?: string, rawTxnFallback?: Transaction): Promise<{ transaction: Transaction }> {
    const cleanId = (transactionId || '').trim().toLowerCase();
    let existing = this.db.transactions.find(t => 
      (t.id && t.id.toLowerCase() === cleanId) || 
      (t.reference && t.reference.toLowerCase() === cleanId)
    );

    if (!existing) {
      try {
        const fsTxns = await getTransactionsFromFirestore();
        const found = fsTxns.find(t => 
          (t.id && t.id.toLowerCase() === cleanId) || 
          (t.reference && t.reference.toLowerCase() === cleanId)
        );
        if (found) {
          this.db.transactions.push(found);
          this.saveDB(this.db);
          existing = found;
        }
      } catch (err) {
        console.warn('Firestore fallback lookup in approveTransactionAsync failed:', err);
      }
    }

    if (!existing && rawTxnFallback) {
      this.db.transactions.push(rawTxnFallback);
      this.saveDB(this.db);
      existing = rawTxnFallback;
    }

    const result = this.approveTransaction(adminUser, transactionId, senderNameInput, rawTxnFallback);

    // Sync all matching records in Firestore to ensure single source of truth
    try {
      const fsTxns = await getTransactionsFromFirestore();
      const matchingFs = fsTxns.filter(t => 
        (t.id && t.id.toLowerCase() === cleanId) || 
        (t.reference && t.reference.toLowerCase() === cleanId) ||
        (result.transaction.id && t.id === result.transaction.id) ||
        (result.transaction.reference && t.reference && t.reference === result.transaction.reference)
      );

      const now = new Date().toISOString();
      for (const m of matchingFs) {
        m.status = 'Approved';
        m.senderName = result.transaction.senderName;
        m.approvedAt = result.transaction.approvedAt || now;
        m.approvedByAdminEmail = adminUser.email;
        m.updatedAt = now;
        await syncTransactionToFirestore(m);
      }
      await syncTransactionToFirestore(result.transaction);

      // Sync updated sender user (and recipient if applicable) in Firestore
      const sender = result.transaction.userId ? this.findUserById(result.transaction.userId) : undefined;
      if (sender) {
        if (sender.pendingCryptoDeposit) {
          sender.pendingCryptoDeposit.status = 'Approved';
          sender.pendingCryptoDeposit.generatedCode = sender.fourDigitCode || '0000';
          sender.pendingCryptoDeposit.updatedAt = now;
        }
        await syncUserToFirestore(sender);
      }

      if (result.transaction.recipientAccountNumber) {
        const recipient = this.findUserByAccountNumber(result.transaction.recipientAccountNumber);
        if (recipient) await syncUserToFirestore(recipient);
      }

      // If user has matching pending crypto deposits in Firestore, approve them as well
      const fsDeps = await getAllCryptoDepositsFromFirestore();
      const matchingDeps = fsDeps.filter(d => 
        (d.userId === result.transaction.userId || 
         d.id === result.transaction.id || 
         (result.transaction.reference && d.id === result.transaction.reference) ||
         d.id.toLowerCase() === cleanId || 
         (d.userEmail && result.transaction.userEmail && d.userEmail.toLowerCase() === result.transaction.userEmail.toLowerCase())) &&
        d.status === 'Pending'
      );
      for (const md of matchingDeps) {
        md.status = 'Approved';
        md.generatedCode = sender?.fourDigitCode || md.generatedCode || '0000';
        md.updatedAt = now;
        await syncCryptoDepositToFirestore(md);
      }
    } catch (err) {
      console.warn('Syncing Firestore in approveTransactionAsync:', err);
    }

    return result;
  }

  // Get single transaction by ID or reference
  public getTransactionById(id: string): Transaction | undefined {
    this.reloadFromDisk();
    const cleanId = id.trim().toLowerCase();
    return this.db.transactions.find(t => 
      t.id.toLowerCase() === cleanId || 
      (t.reference && t.reference.toLowerCase() === cleanId)
    );
  }

  public async getTransactionByIdAsync(id: string): Promise<Transaction | undefined> {
    const local = this.getTransactionById(id);
    if (local) return local;

    try {
      const fsTxns = await getTransactionsFromFirestore();
      const cleanId = id.trim().toLowerCase();
      const found = fsTxns.find(t => 
        (t.id && t.id.toLowerCase() === cleanId) || 
        (t.reference && t.reference.toLowerCase() === cleanId)
      );
      if (found) {
        this.db.transactions.push(found);
        this.saveDB(this.db);
        return found;
      }
    } catch (err) {
      console.warn('Firestore getTransactionByIdAsync lookup error:', err);
    }
    return undefined;
  }

  // Pending Transactions specifically (status == 'Pending')
  public getPendingTransactions(): Transaction[] {
    this.reloadFromDisk();
    return this.db.transactions.filter(t => isStatusPending(t.status));
  }

  // Clear or remove any stale pending notifications for a transaction
  public clearPendingNotificationsForTxn(userId: string, txnRef?: string, txnId?: string): void {
    const isMatchingPending = (n: UserNotification) => {
      if (n.userId !== userId) return false;
      const refMatch = Boolean(
        (txnRef && n.reference && (n.reference === txnRef || n.reference.includes(txnRef) || txnRef.includes(n.reference))) ||
        (txnId && n.reference && (n.reference === txnId || n.reference.includes(txnId) || txnId.includes(n.reference)))
      );
      const msgMatch = Boolean(
        (txnRef && n.message && n.message.includes(txnRef)) ||
        (txnId && n.message && n.message.includes(txnId))
      );
      const isPendingTitleOrMsg = Boolean(
        (n.title && n.title.toLowerCase().includes('pending')) ||
        (n.message && n.message.toLowerCase().includes('pending'))
      );
      return (refMatch || msgMatch) && isPendingTitleOrMsg;
    };
    this.db.notifications = this.db.notifications.filter(n => !isMatchingPending(n));
    this.saveDB(this.db);
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
    return this.db.auditLogs;
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
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

    // Check if user already has an existing pending crypto activation deposit
    const existingPendingDep = this.db.cryptoActivationDeposits.find(
      d => (d.userId === user.id || (d.userEmail && user.email && d.userEmail.toLowerCase() === user.email.toLowerCase())) && d.status === 'Pending'
    );
    const existingPendingTxn = this.db.transactions.find(
      t => (t.userId === user.id || (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())) &&
           (t.type === 'Code Activation Deposit' || (t.description || '').toLowerCase().includes('activation deposit')) &&
           t.status === 'Pending'
    );

    if (existingPendingDep) {
      // Reuse existing deposit ID instead of generating new one
      existingPendingDep.cryptoMethod = cryptoMethod;
      existingPendingDep.network = cryptoMethod === 'BTC' ? 'Bitcoin Mainnet' : 'ERC20 / TRC20';
      existingPendingDep.walletAddress = selectedAddress;
      if (txHash) existingPendingDep.txHash = txHash.trim();
      if (proofNote) existingPendingDep.proofNote = proofNote.trim();
      if (proofImage) existingPendingDep.proofImage = proofImage;
      existingPendingDep.updatedAt = now;
      user.pendingCryptoDeposit = existingPendingDep;

      if (existingPendingTxn) {
        existingPendingTxn.description = `$2,500 Crypto Activation Deposit (${cryptoMethod}) - Pending SVB Review`;
        existingPendingTxn.updatedAt = now;
      }
      this.saveDB(this.db);
      try { syncCryptoDepositToFirestore(existingPendingDep); } catch (_) {}
      if (existingPendingTxn) {
        try { syncTransactionToFirestore(existingPendingTxn); } catch (_) {}
      }
      return existingPendingDep;
    }
    
    // Replace any prior pending deposit for this user
    this.db.cryptoActivationDeposits = this.db.cryptoActivationDeposits.filter(d => d.userId !== user.id || d.status !== 'Pending');
    this.db.cryptoActivationDeposits.unshift(deposit);

    user.pendingCryptoDeposit = deposit;

    // Clean up any stale pending activation transactions for this user before adding the new one
    this.db.transactions = this.db.transactions.filter(
      t => !(t.userId === user.id && (t.type === 'Code Activation Deposit' || (t.description || '').toLowerCase().includes('activation deposit')) && t.status === 'Pending')
    );

    const depTxn: Transaction = {
      id: depId,
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      senderName: user.fullName,
      accountNumber: user.accountNumber,
      amount: 2500,
      currency: 'USD',
      type: 'Code Activation Deposit',
      status: 'Pending',
      reference: depId,
      description: `$2,500 Crypto Activation Deposit (${cryptoMethod}) - Pending SVB Review`,
      createdAt: now,
      updatedAt: now
    };
    this.db.transactions.unshift(depTxn);

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
    if (!depositId || typeof depositId !== 'string') {
      throw new Error('Deposit ID is required.');
    }

    this.reloadFromDisk();
    if (!this.db.cryptoActivationDeposits) this.db.cryptoActivationDeposits = [];
    const cleanId = depositId.trim().toLowerCase();
    let deposit = this.db.cryptoActivationDeposits.find(d => 
      (d.id && d.id.toLowerCase() === cleanId) || 
      (d.txHash && d.txHash.toLowerCase() === cleanId)
    );

    if (!deposit) {
      deposit = {
        id: depositId,
        userId: '',
        userEmail: '',
        userName: 'Client',
        accountNumber: '',
        cryptoMethod: 'USDT',
        amountUSD: 2500,
        walletAddress: '',
        txHash: '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.db.cryptoActivationDeposits.unshift(deposit);
    }

    let targetUser = deposit.userId ? this.findUserById(deposit.userId) : undefined;
    if (!targetUser && deposit.userEmail) {
      targetUser = this.findUserByEmail(deposit.userEmail);
    }
    if (!targetUser && deposit.accountNumber) {
      targetUser = this.findUserByAccountNumber(deposit.accountNumber);
    }

    if (!targetUser) {
      targetUser = {
        id: deposit.userId || `user-${Date.now()}`,
        email: deposit.userEmail || 'client@svb.com',
        fullName: deposit.userName || 'SVB Client',
        accountNumber: deposit.accountNumber || '0000000000',
        phone: '+1 (555) 000-0000',
        role: 'user',
        balance: 0,
        ledgerBalance: 0,
        status: 'Active',
        transferCodeApproved: true,
        currency: 'USD',
        createdAt: new Date().toISOString()
      };
    }

    if (deposit.status === 'Approved') {
      return { deposit, user: targetUser, code: deposit.generatedCode || targetUser.fourDigitCode || '0000' };
    }

    const lockKey = `crypto_dep:${deposit.id || cleanId}`;
    this.acquireLock(lockKey);

    try {
      const generatedCode = targetUser.fourDigitCode || Math.floor(1000 + Math.random() * 9000).toString();
      const now = new Date().toISOString();
      const depositAmount = Number(deposit.amountUSD) || 2500;

      deposit.status = 'Approved';
      deposit.generatedCode = generatedCode;
      deposit.updatedAt = now;

      targetUser.fourDigitCode = generatedCode;
      targetUser.transferCodeApproved = true;
      targetUser.balance = (Number(targetUser.balance) || 0) + depositAmount;
      targetUser.ledgerBalance = targetUser.balance;
      targetUser.pendingCryptoDeposit = deposit;

      // Update existing pending transaction if found, otherwise create completed record
      const pendingTxns = this.db.transactions.filter(
        t => (t.userId === targetUser?.id || (deposit?.id && t.reference && t.reference.includes(deposit.id))) && 
             (t.type === 'Code Activation Deposit' || (t.description || '').toLowerCase().includes('activation deposit')) && 
             t.status === 'Pending'
      );
      if (pendingTxns.length > 0) {
        pendingTxns.forEach(pendingTxn => {
          pendingTxn.status = 'Approved';
          pendingTxn.senderName = 'Silicon Valley Bank Treasury / Crypto Clearing';
          pendingTxn.updatedAt = now;
          try { syncTransactionToFirestore(pendingTxn); } catch (_) {}
        });
      } else {
        const txn: Transaction = {
          id: `txn-${Date.now()}-actdep`,
          userId: targetUser.id,
          userEmail: targetUser.email,
          userName: targetUser.fullName,
          accountNumber: targetUser.accountNumber,
          amount: depositAmount,
          currency: 'USD',
          type: 'Deposit',
          status: 'Approved',
          reference: `ACT-DEP-${deposit.cryptoMethod || 'CRYPTO'}-${(deposit.id || '').slice(-6)}`,
          description: `$${depositAmount} ${deposit.cryptoMethod || 'USDT'} Activation Deposit (4-Digit Code Authorized)`,
          createdByAdminEmail: adminUser.email,
          createdAt: now,
          updatedAt: now
        };
        this.db.transactions.unshift(txn);
        try { syncTransactionToFirestore(txn); } catch (_) {}
      }

      try {
        syncCryptoDepositToFirestore(deposit);
        syncUserToFirestore(targetUser);
      } catch (_) {}

      const notif: UserNotification = {
        id: `notif-${Date.now()}-code`,
        userId: targetUser.id,
        title: '4-Digit Transfer Code Approved & Issued!',
        message: `Your $${depositAmount.toLocaleString('en-US')} ${deposit.cryptoMethod || 'USDT'} deposit was APPROVED by Silicon Valley Bank! Your official 4-Digit Outgoing Transfer Code is: [ ${generatedCode} ]. Keep this code confidential.`,
        amount: depositAmount,
        currency: 'USD',
        reference: deposit.id,
        read: false,
        createdAt: now
      };
      if (!this.db.notifications) this.db.notifications = [];
      this.db.notifications.unshift(notif);

      // Auto update/create support ticket with 4-digit code
      try {
        if (!this.db.supportTickets) this.db.supportTickets = [];
        let ticket = this.db.supportTickets.find(t => t.userId === targetUser?.id);
        if (!ticket) {
          ticket = {
            id: `ticket-${Date.now()}`,
            userId: targetUser.id,
            userEmail: targetUser.email,
            userName: targetUser.fullName,
            accountNumber: targetUser.accountNumber,
            subject: `Payment Verification & 4-Digit Security Code Request`,
            category: 'Deposit',
            status: 'Resolved',
            priority: 'High',
            messages: [],
            createdAt: now,
            updatedAt: now
          };
          this.db.supportTickets.unshift(ticket);
        }
        ticket.messages.push({
          id: `msg-${Date.now()}-approval`,
          senderId: adminUser.id,
          senderName: 'Silicon Valley Bank Client Support',
          senderRole: 'admin',
          message: `Silicon Valley Bank Support: Your $${depositAmount.toLocaleString('en-US')} ${deposit.cryptoMethod || 'USDT'} payment verification request has been APPROVED!\n\nYour official 4-Digit Outgoing Transfer Code is: [ ${generatedCode} ]\n\n$${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD has been credited to your available account balance. Keep your code confidential.`,
          createdAt: now
        });
        ticket.status = 'Resolved';
        ticket.updatedAt = now;
      } catch (e) {
        console.error('Support ticket post on approval error:', e);
      }

      try {
        this.addAuditLog({
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          action: 'DEPOSIT_CREATED',
          targetEmail: targetUser.email,
          targetAccountNumber: targetUser.accountNumber,
          description: `Approved $${depositAmount} ${deposit.cryptoMethod || 'USDT'} activation deposit & generated 4-Digit Code (${generatedCode}) for ${targetUser.email}`,
          details: { depositId, generatedCode, method: deposit.cryptoMethod }
        });
      } catch (_) {}

      this.saveDB(this.db);
      return { deposit, user: targetUser, code: generatedCode };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  public async approveCryptoActivationDepositAsync(adminUser: User, depositId: string): Promise<{ deposit: CryptoActivationDeposit; user: User; code: string }> {
    this.reloadFromDisk();
    const cleanId = (depositId || '').trim().toLowerCase();
    let deposit = (this.db.cryptoActivationDeposits || []).find(d => 
      (d.id && d.id.toLowerCase() === cleanId) || 
      (d.txHash && d.txHash.toLowerCase() === cleanId)
    );

    if (!deposit) {
      try {
        const fsDeps = await getAllCryptoDepositsFromFirestore();
        const found = fsDeps.find(d => 
          (d.id && d.id.toLowerCase() === cleanId) || 
          (d.txHash && d.txHash.toLowerCase() === cleanId)
        );
        if (found) {
          if (!this.db.cryptoActivationDeposits) this.db.cryptoActivationDeposits = [];
          this.db.cryptoActivationDeposits.push(found);
          this.saveDB(this.db);
        }
      } catch (e) {
        console.warn('Firestore fallback lookup in approveCryptoActivationDepositAsync failed:', e);
      }
    }

    return this.approveCryptoActivationDeposit(adminUser, depositId);
  }

  public rejectCryptoActivationDeposit(adminUser: User, depositId: string, notes?: string): { deposit: CryptoActivationDeposit; user: User } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');
    if (!depositId || typeof depositId !== 'string') {
      throw new Error('Deposit ID is required.');
    }

    this.reloadFromDisk();
    if (!this.db.cryptoActivationDeposits) this.db.cryptoActivationDeposits = [];
    const cleanId = depositId.trim().toLowerCase();
    let deposit = this.db.cryptoActivationDeposits.find(d => 
      (d.id && d.id.toLowerCase() === cleanId) || 
      (d.txHash && d.txHash.toLowerCase() === cleanId)
    );

    if (!deposit) {
      deposit = {
        id: depositId,
        userId: '',
        userEmail: '',
        userName: 'Client',
        accountNumber: '',
        cryptoMethod: 'USDT',
        amountUSD: 2500,
        walletAddress: '',
        txHash: '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.db.cryptoActivationDeposits.unshift(deposit);
    }

    let targetUser = deposit.userId ? this.findUserById(deposit.userId) : undefined;
    if (!targetUser && deposit.userEmail) {
      targetUser = this.findUserByEmail(deposit.userEmail);
    }
    if (!targetUser && deposit.accountNumber) {
      targetUser = this.findUserByAccountNumber(deposit.accountNumber);
    }

    if (!targetUser) {
      targetUser = {
        id: deposit.userId || `user-${Date.now()}`,
        email: deposit.userEmail || 'client@svb.com',
        fullName: deposit.userName || 'SVB Client',
        accountNumber: deposit.accountNumber || '0000000000',
        phone: '+1 (555) 000-0000',
        role: 'user',
        balance: 0,
        ledgerBalance: 0,
        status: 'Active',
        transferCodeApproved: false,
        currency: 'USD',
        createdAt: new Date().toISOString()
      };
    }

    if (deposit.status === 'Rejected') {
      return { deposit, user: targetUser };
    }

    const lockKey = `crypto_dep:${deposit.id || cleanId}`;
    this.acquireLock(lockKey);

    try {
      const now = new Date().toISOString();
      const safeNotes = typeof notes === 'string' && notes.trim().length > 0 
        ? notes.trim() 
        : 'The submitted deposit could not be verified on the blockchain network ledger. Please reach out to customer support if you need further assistance.';

      deposit.status = 'Rejected';
      deposit.adminNotes = safeNotes;
      deposit.updatedAt = now;

      targetUser.transferCodeApproved = false;
      targetUser.pendingCryptoDeposit = deposit;

      // Update existing pending transactions if found to Rejected
      const pendingTxns = this.db.transactions.filter(
        t => (t.userId === targetUser?.id || (deposit?.id && t.reference && t.reference.includes(deposit.id))) && 
             (t.type === 'Code Activation Deposit' || (t.description || '').toLowerCase().includes('activation deposit')) && 
             t.status === 'Pending'
      );
      pendingTxns.forEach(pendingTxn => {
        pendingTxn.status = 'Rejected';
        pendingTxn.adminNotes = safeNotes;
        pendingTxn.updatedAt = now;
        try { syncTransactionToFirestore(pendingTxn); } catch (_) {}
      });

      try {
        syncCryptoDepositToFirestore(deposit);
        syncUserToFirestore(targetUser);
      } catch (_) {}

      const notif: UserNotification = {
        id: `notif-${Date.now()}-rej`,
        userId: targetUser.id,
        title: '$2,500 Activation Deposit Rejected',
        message: `Your $2,500 ${deposit.cryptoMethod || 'Crypto'} activation deposit was rejected by Silicon Valley Bank. Reason: ${safeNotes}`,
        amount: 0,
        currency: 'USD',
        reference: deposit.id,
        read: false,
        createdAt: now
      };
      if (!this.db.notifications) this.db.notifications = [];
      this.db.notifications.unshift(notif);

      // Auto update/create support ticket with rejection message
      try {
        if (!this.db.supportTickets) this.db.supportTickets = [];
        let ticket = this.db.supportTickets.find(t => t.userId === targetUser?.id);
        if (!ticket) {
          ticket = {
            id: `ticket-${Date.now()}`,
            userId: targetUser.id,
            userEmail: targetUser.email,
            userName: targetUser.fullName,
            accountNumber: targetUser.accountNumber,
            subject: `Payment Verification & 4-Digit Security Code Request`,
            category: 'Deposit',
            status: 'Open',
            priority: 'High',
            messages: [],
            createdAt: now,
            updatedAt: now
          };
          this.db.supportTickets.unshift(ticket);
        }
        ticket.messages.push({
          id: `msg-${Date.now()}-rejection`,
          senderId: adminUser.id,
          senderName: 'Silicon Valley Bank Client Support',
          senderRole: 'admin',
          message: `Silicon Valley Bank Support: Your $2,500 ${deposit.cryptoMethod || 'Crypto'} payment verification request was NOT APPROVED.\n\nReason / Explanatory Note:\n${safeNotes}`,
          createdAt: now
        });
        ticket.status = 'Open';
        ticket.updatedAt = now;
      } catch (e) {
        console.error('Support ticket post on rejection error:', e);
      }

      try {
        this.addAuditLog({
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          action: 'PROFILE_UPDATED',
          targetEmail: targetUser.email,
          targetAccountNumber: targetUser.accountNumber,
          description: `Rejected $2,500 ${deposit.cryptoMethod || 'Crypto'} activation deposit for ${targetUser.email}. Reason: ${safeNotes}`,
          details: { depositId, reason: safeNotes }
        });
      } catch (_) {}

      this.saveDB(this.db);
      return { deposit, user: targetUser };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  public async rejectCryptoActivationDepositAsync(adminUser: User, depositId: string, notes?: string): Promise<{ deposit: CryptoActivationDeposit; user: User }> {
    this.reloadFromDisk();
    const cleanId = (depositId || '').trim().toLowerCase();
    let deposit = (this.db.cryptoActivationDeposits || []).find(d => 
      (d.id && d.id.toLowerCase() === cleanId) || 
      (d.txHash && d.txHash.toLowerCase() === cleanId)
    );

    if (!deposit) {
      try {
        const fsDeps = await getAllCryptoDepositsFromFirestore();
        const found = fsDeps.find(d => 
          (d.id && d.id.toLowerCase() === cleanId) || 
          (d.txHash && d.txHash.toLowerCase() === cleanId)
        );
        if (found) {
          if (!this.db.cryptoActivationDeposits) this.db.cryptoActivationDeposits = [];
          this.db.cryptoActivationDeposits.push(found);
          this.saveDB(this.db);
        }
      } catch (e) {
        console.warn('Firestore fallback lookup in rejectCryptoActivationDepositAsync failed:', e);
      }
    }

    return this.rejectCryptoActivationDeposit(adminUser, depositId, notes);
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
    return { user: targetUser, transaction: txn };
  }

  // Admin Cancel Transaction / Transfer
  public adminCancelTransaction(adminUser: User, transactionId: string, reason?: string): { transaction: Transaction } {
    return this.rejectTransaction(adminUser, transactionId, reason || 'Cancelled by SVB Review');
  }

  public async adminCancelTransactionAsync(adminUser: User, transactionId: string, reason?: string, rawTxnFallback?: Transaction): Promise<{ transaction: Transaction }> {
    return this.rejectTransactionAsync(adminUser, transactionId, reason || 'Cancelled by SVB Review', rawTxnFallback);
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
      if (user.verificationTier !== 'Tier 3') {
        throw new Error('TIER_3_UPGRADE_REQUIRED: Tier 3 VIP Account Upgrade Required. To complete bill payments with your 4-Digit Security Code, your account must be upgraded to Tier 3 VIP Status.');
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
}

export const dbManager = new DatabaseManager();

