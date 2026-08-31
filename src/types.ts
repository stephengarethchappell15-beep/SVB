export type UserRole = 'user' | 'admin';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'ja';

export interface BankAccount {
  id: string;
  userId: string;
  accountType: 
    | 'Personal Checking' 
    | 'Personal Savings' 
    | 'Business Venture Checking' 
    | 'Business Growth Treasury'
    | 'Multi-Currency IBAN (EUR/GBP)'
    | 'Offshore Wealth Reserve'
    | 'SWIFT Global Account';
  accountNumber: string;
  routingNumber: string;
  balance: number;
  currency: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface VirtualCard {
  id: string;
  userId: string;
  cardholderName: string;
  cardNumber: string; // 16 digits formatted
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: 'Visa Corporate' | 'Visa Business Debit' | 'Mastercard Personal Virtual';
  category: 'Personal' | 'Business' | 'SaaS Subscriptions' | 'Corporate Travel';
  spendingLimit: number;
  spentAmount: number;
  status: 'Active' | 'Frozen';
  createdAt: string;
}

export interface BillPayment {
  id: string;
  userId: string;
  billerName: string;
  billerCategory: 'Utilities' | 'Cloud Computing' | 'SaaS & Software' | 'Credit Card' | 'Vendor Invoice' | 'Rent & Lease';
  accountNumber: string; // Paying account
  amount: number;
  reference: string;
  status: 'Completed' | 'Pending' | 'Scheduled' | 'Failed';
  paymentDate: string;
}

export interface CryptoActivationDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  accountNumber: string;
  cryptoMethod: 'BTC' | 'USDT';
  network?: string; // e.g., 'Bitcoin Mainnet', 'ERC20 / TRC20'
  walletAddress: string;
  amountUSD: number;
  txHash?: string;
  proofNote?: string;
  proofImage?: string; // Base64 screenshot proof image
  status: 'Pending' | 'Approved' | 'Rejected';
  generatedCode?: string;
  adminNotes?: string;
  decidedByAdminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tier3VerificationRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  accountNumber: string;
  address: string;
  country: string;
  documentType: 'Passport' | 'National ID Card' | "Driver's License" | 'Residence Permit';
  documentUrl: string; // Base64 or image URL of ID Document
  paymentSlipUrl?: string; // Base64 or image URL of $5,000 Payment Slip
  txHash?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNotes?: string;
  decidedByAdminEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  accountNumber: string;
  role: UserRole;
  balance: number;
  ledgerBalance?: number;
  currency: string;
  address?: string;
  country?: string;
  verificationTier?: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Pending Tier 3' | 'Rejected';
  profilePicture?: string;
  status?: 'Active' | 'Blocked' | 'Suspended';
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  accounts?: BankAccount[];
  createdAt: string;

  // 4-Digit Security Code & Activation Deposit fields
  accountPin?: string; // 4-digit Account Security PIN set during registration
  fourDigitCode?: string; // e.g. "8492"
  transferCodeApproved?: boolean; // true if admin approved $200 deposit
  pendingCryptoDeposit?: CryptoActivationDeposit | null;
}

export type TransactionType = 'Deposit' | 'Withdrawal' | 'Transfer' | 'Credit' | 'Adjustment' | 'Bill Pay' | 'Virtual Card Charge' | 'Admin Debit' | 'SVB Review Debit' | 'Credit Deposit' | 'Refund' | 'Wire Transfer' | 'Wire Withdrawal' | 'Code Activation Deposit' | 'VIP Upgrade Fee';
export type TransactionStatus = 'Completed' | 'Pending' | 'Cancelled' | 'Rejected' | 'Refunded';

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  accountNumber: string;
  senderName?: string;
  senderAccountNumber?: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientAccountNumber?: string;
  destinationCountry?: string;
  destinationBank?: string;
  transferType?: 'Domestic' | 'International';
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  reference: string;
  description: string;
  createdByAdminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  images?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  accountNumber: string;
  subject: string;
  category: 'Deposit' | 'Withdrawal' | 'Account' | 'Security' | 'General';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: 'USER_REGISTERED' | 'DEPOSIT_CREATED' | 'WITHDRAWAL_EXECUTED' | 'TRANSFER_EXECUTED' | 'ROLE_UPDATED' | 'USER_SEARCHED' | 'PROFILE_UPDATED' | 'SUPPORT_TICKET_UPDATED' | 'VIRTUAL_CARD_CREATED' | 'BILL_PAID' | 'SYSTEM_SEED';
  targetEmail: string;
  targetAccountNumber: string;
  description: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  amount: number;
  currency: string;
  reference: string;
  read: boolean;
  createdAt: string;
}

export interface DepositPayload {
  userEmail: string;
  accountNumber: string;
  senderName?: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
}

export interface TransferPayload {
  destinationCountry?: string;
  destinationBank?: string;
  recipientInput: string; // Recipient account number
  recipientName?: string; // Account holder name
  amount: number;
  note?: string; // Reference (Optional)
  fourDigitCode?: string;
}

export interface WithdrawPayload {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountHolderName: string;
  amount: number;
  note?: string;
  fourDigitCode?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  requires2FA?: boolean;
}

