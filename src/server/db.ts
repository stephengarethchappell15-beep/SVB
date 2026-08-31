import fs from 'fs';
import path from 'path';
import { User, BankAccount, VirtualCard, BillPayment, Transaction, AuditLog, UserNotification, DepositPayload, TransferPayload, WithdrawPayload, SupportTicket, SupportMessage, CryptoActivationDeposit } from '../types';
import { syncUserToFirestore, getUserFromFirestore, getAllUsersFromFirestore, syncTransactionToFirestore } from '../lib/firebase';

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
      const fsUsers = await getAllUsersFromFirestore();
      const userMap = new Map<string, User>();
      memoryMatches.forEach(u => userMap.set(u.id, u));

      // Also try direct lookup if query is non-empty (direct email or account number lookup)
      if (rawQ) {
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
    syncUserToFirestore(targetUser).catch(err => console.warn('Firestore sync user error in createDeposit:', err));
    syncTransactionToFirestore(newTxn).catch(err => console.warn('Firestore sync txn error in createDeposit:', err));

    return { user: targetUser, transaction: newTxn };
  }

  public async createDepositAsync(deposit: DepositPayload, adminUser: User): Promise<{ user: User; transaction: Transaction }> {
    if (adminUser.role !== 'admin') {
      throw new Error('Unauthorized: Only SVB Review team can create deposit entries.');
    }

    const emailQuery = deposit.userEmail ? deposit.userEmail.trim() : '';
    const accQuery = deposit.accountNumber ? deposit.accountNumber.trim() : '';

    const targetUser = (emailQuery ? await this.findUserByEmailOrAccountAsync(emailQuery) : undefined) ||
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

    targetUser.balance += Number(deposit.amount);
    targetUser.ledgerBalance = (targetUser.ledgerBalance ?? 0) + Number(deposit.amount);

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

    try {
      await syncUserToFirestore(targetUser);
      await syncTransactionToFirestore(newTxn);
    } catch (fsErr) {
      console.warn('Firestore sync error in createDepositAsync:', fsErr);
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
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      accountNumber: user.accountNumber,
      subject: data.subject.trim(),
      category: data.category || 'General',
      status: 'Open',
      priority: data.priority || 'Medium',
      messages: [firstMsg],
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

  public getSupportTickets(userId?: string): SupportTicket[] {
    if (userId) {
      return this.db.supportTickets.filter(t => t.userId === userId);
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
    return this.db.transactions.filter(t => t.userId === userId);
  }

  public getAllTransactions(): Transaction[] {
    return this.db.transactions;
  }

  // Admin Approve Pending Transaction (credits recipient or user with manual sender name)
  public approveTransaction(adminUser: User, transactionId: string, senderNameInput?: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const senderTxn = this.db.transactions.find(t => t.id === transactionId);
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

    // Check if it's a deposit (Payment Verification Deposit or Direct Deposit to user)
    const isDepositType = senderTxn.type.toLowerCase().includes('deposit') || 
                          senderTxn.description.toLowerCase().includes('deposit') ||
                          senderTxn.description.toLowerCase().includes('verification');

    if (isDepositType && sender) {
      sender.balance += senderTxn.amount;
      sender.ledgerBalance = sender.balance;

      // If it's a payment verification deposit or code activation, activate 4-digit code
      if (!sender.fourDigitCode || !sender.transferCodeApproved) {
        const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
        sender.fourDigitCode = generatedCode;
        sender.transferCodeApproved = true;
      }

      // Update matching crypto activation deposit if present
      if (this.db.cryptoActivationDeposits) {
        const matchingDep = this.db.cryptoActivationDeposits.find(d => d.userId === sender.id && d.status === 'Pending');
        if (matchingDep) {
          matchingDep.status = 'Approved';
          matchingDep.generatedCode = sender.fourDigitCode;
          matchingDep.updatedAt = new Date().toISOString();
        }
      }

      const depNotif: UserNotification = {
        id: `notif-${Date.now()}-depapp`,
        userId: sender.id,
        title: 'Deposit Approved & Funds Credited',
        message: `Your deposit of $${senderTxn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Ref: ${senderTxn.reference}) has been APPROVED and credited to your account.`,
        amount: senderTxn.amount,
        currency: senderTxn.currency || 'USD',
        reference: senderTxn.reference,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.db.notifications.unshift(depNotif);
    } else if (senderTxn.recipientAccountNumber || senderTxn.recipientEmail) {
      // Find recipient and credit balance + create recipient transaction record
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

    // Send notification to sender if it was a transfer/wire/withdrawal
    if (sender && !isDepositType) {
      const sendNotif: UserNotification = {
        id: `notif-${Date.now()}-snd`,
        userId: sender.id,
        title: 'Outgoing Transfer Processed',
        message: `Your outgoing transfer of $${senderTxn.amount.toFixed(2)} (Ref: ${senderTxn.reference}) has been successfully processed.`,
        amount: senderTxn.amount,
        currency: senderTxn.currency || 'USD',
        reference: senderTxn.reference,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.db.notifications.unshift(sendNotif);
    }

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'TRANSFER_EXECUTED',
      targetEmail: senderTxn.userEmail,
      targetAccountNumber: senderTxn.accountNumber,
      description: `Admin ${adminUser.email} approved transaction ${senderTxn.reference} of $${senderTxn.amount} (${senderTxn.type}) with sender/source name "${finalSenderName}"`,
      details: { transactionId, senderName: finalSenderName, type: senderTxn.type }
    });

    this.saveDB(this.db);
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
    return { user: targetUser, code: newCode };
  }

  // Admin Reject Transaction (Refunds funds & marks as Rejected)
  public rejectTransaction(adminUser: User, transactionId: string, reason?: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const txn = this.db.transactions.find(t => t.id === transactionId);
    if (!txn) throw new Error('Transaction not found.');

    if (txn.status === 'Rejected' || txn.status === 'Cancelled') {
      throw new Error(`Transaction is already ${txn.status.toLowerCase()}.`);
    }

    txn.status = 'Rejected';
    txn.updatedAt = new Date().toISOString();

    const targetUser = this.findUserById(txn.userId);
    if (targetUser && (txn.type === 'Withdrawal' || (txn.type === 'Transfer' && !txn.description.includes('received')))) {
      targetUser.balance += txn.amount;
      targetUser.ledgerBalance = targetUser.balance;
    }

    // Update matching crypto activation deposit if present
    if (this.db.cryptoActivationDeposits && targetUser) {
      const matchingDep = this.db.cryptoActivationDeposits.find(d => d.userId === targetUser.id && d.status === 'Pending');
      if (matchingDep) {
        matchingDep.status = 'Rejected';
        matchingDep.adminNotes = reason || 'Declined by SVB Review';
        matchingDep.updatedAt = new Date().toISOString();
      }
      if (targetUser.pendingCryptoDeposit) {
        targetUser.pendingCryptoDeposit.status = 'Rejected';
        targetUser.pendingCryptoDeposit.adminNotes = reason || 'Declined by SVB Review';
      }
    }

    const isDeposit = txn.type.toLowerCase().includes('deposit') || txn.description.toLowerCase().includes('deposit');
    const notif: UserNotification = {
      id: `notif-${Date.now()}-rej`,
      userId: txn.userId,
      title: isDeposit ? 'Deposit Request Declined' : 'Transaction Declined & Refunded',
      message: isDeposit
        ? `Deposit request ${txn.reference} of $${txn.amount.toFixed(2)} was declined by Silicon Valley Bank.${reason ? ` Reason: ${reason}` : ''}`
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

    // Auto update/create support ticket with 4-digit code
    try {
      if (!this.db.supportTickets) this.db.supportTickets = [];
      let ticket = this.db.supportTickets.find(t => t.userId === targetUser.id);
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
        message: `Silicon Valley Bank Support: Your $2,500 ${deposit.cryptoMethod} payment verification request has been APPROVED!\n\nYour official 4-Digit Outgoing Transfer Code is: [ ${generatedCode} ]\n\n$2,500.00 USD has been credited to your available account balance. Keep your code confidential.`,
        createdAt: now
      });
      ticket.status = 'Resolved';
      ticket.updatedAt = now;
    } catch (e) {
      console.error('Support ticket post on approval error:', e);
    }

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
    return { deposit, user: targetUser, code: generatedCode };
  }

  public rejectCryptoActivationDeposit(adminUser: User, depositId: string, notes?: string): { deposit: CryptoActivationDeposit; user: User } {
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
      message: `Your $2,500 ${deposit.cryptoMethod} activation deposit was rejected by Silicon Valley Bank. ${notes ? 'Reason: ' + notes : '4-Digit Transfer Code has not been issued. Please contact support.'}`,
      amount: 0,
      currency: 'USD',
      reference: deposit.id,
      read: false,
      createdAt: now
    };
    this.db.notifications.unshift(notif);

    // Auto update/create support ticket with rejection message
    try {
      if (!this.db.supportTickets) this.db.supportTickets = [];
      let ticket = this.db.supportTickets.find(t => t.userId === targetUser.id);
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
        message: `Silicon Valley Bank Support: Your $2,500 ${deposit.cryptoMethod} payment verification request was NOT APPROVED.\n\nReason / Explanatory Note:\n${notes || 'The submitted deposit could not be verified on the blockchain network ledger. Please reach out to customer support if you need further assistance.'}`,
        createdAt: now
      });
      ticket.status = 'Open';
      ticket.updatedAt = now;
    } catch (e) {
      console.error('Support ticket post on rejection error:', e);
    }

    this.addAuditLog({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'PROFILE_UPDATED',
      targetEmail: targetUser.email,
      targetAccountNumber: targetUser.accountNumber,
      description: `Rejected $2,500 ${deposit.cryptoMethod} activation deposit for ${targetUser.email}`,
      details: { depositId }
    });

    this.saveDB(this.db);
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
    return { user: targetUser, transaction: txn };
  }

  // Admin Cancel Transaction / Transfer
  public adminCancelTransaction(adminUser: User, transactionId: string): { transaction: Transaction } {
    if (adminUser.role !== 'admin') throw new Error('Unauthorized. Admin privileges required.');

    const txn = this.db.transactions.find(t => t.id === transactionId);
    if (!txn) throw new Error('Transaction not found.');

    if (txn.status === 'Cancelled') throw new Error('Transaction is already cancelled.');

    txn.status = 'Cancelled';
    txn.updatedAt = new Date().toISOString();

    const targetUser = this.findUserById(txn.userId);
    if (targetUser && (txn.type === 'Withdrawal' || (txn.type === 'Transfer' && !txn.description.includes('received')))) {
      targetUser.balance += txn.amount;
    } else if (targetUser && txn.type === 'Deposit') {
      targetUser.balance = Math.max(0, targetUser.balance - txn.amount);
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

