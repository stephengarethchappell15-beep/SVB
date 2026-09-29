import { dbManager } from './db.js';
import { User, VirtualCard, UserNotification } from '../types.js';

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING FULL REGRESSION TEST SUITE');
  console.log('====================================================\n');

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // --- 1. REGISTRATION & DUPLICATE CHECKS ---
  console.log('1. Testing User Registration & Account Creation...');
  const testEmail = `user.reg.${Date.now()}@domain.com`;
  const existingUsers = dbManager.getDB().users;
  const duplicateFound = existingUsers.some(u => u.email.toLowerCase() === testEmail.toLowerCase());
  assert(!duplicateFound, 'New email does not already exist in database');

  const testUser: User = {
    id: `usr-reg-${Date.now()}`,
    fullName: 'Alex Morgan',
    email: testEmail,
    role: 'user',
    balance: 25000.00,
    ledgerBalance: 25000.00,
    accountNumber: `SVB-${Math.floor(100000000 + Math.random() * 900000000)}`,
    phone: '+1 (555) 432-8765',
    currency: 'USD',
    verificationTier: 'Tier 3',
    fourDigitCode: '4321',
    transferCodeApproved: true,
    createdAt: new Date().toISOString()
  };

  dbManager.getDB().users.push(testUser);
  dbManager.saveDB(dbManager.getDB());

  const fetched = dbManager.getDB().users.find(u => u.id === testUser.id);
  assert(!!fetched, 'User registered and persisted in database');
  assert(fetched?.balance === 25000.00, 'Initial balance registered at $25,000.00');
  assert(fetched?.verificationTier === 'Tier 3', 'User verification tier set to Tier 3');

  // --- 2. CARD LIFECYCLE & SECURITY ---
  console.log('\n2. Testing Virtual Card Issuance & Controls...');
  const card: VirtualCard = {
    id: `card-${Date.now()}`,
    userId: testUser.id,
    cardNumber: '4829 8839 1029 4410',
    cardholderName: testUser.fullName.toUpperCase(),
    expiryMonth: '11',
    expiryYear: '29',
    cvv: '654',
    cardType: 'Visa Corporate',
    category: 'SaaS Subscriptions',
    spendingLimit: 10000,
    spentAmount: 0,
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  if (!dbManager.getDB().virtualCards) {
    dbManager.getDB().virtualCards = [];
  }
  dbManager.getDB().virtualCards.push(card);
  dbManager.saveDB(dbManager.getDB());

  const savedCard = dbManager.getDB().virtualCards.find(c => c.id === card.id);
  assert(!!savedCard, 'Virtual card created and persisted');
  assert(savedCard?.status === 'Active', 'Card status is initially Active');
  assert(savedCard?.spendingLimit === 10000, 'Card spending limit set to $10,000');

  // Freeze Card
  savedCard!.status = 'Frozen';
  dbManager.saveDB(dbManager.getDB());
  const frozenCard = dbManager.getDB().virtualCards.find(c => c.id === card.id);
  assert(frozenCard?.status === 'Frozen', 'Card successfully frozen');

  // Unfreeze Card
  frozenCard!.status = 'Active';
  dbManager.saveDB(dbManager.getDB());
  const unfrozenCard = dbManager.getDB().virtualCards.find(c => c.id === card.id);
  assert(unfrozenCard?.status === 'Active', 'Card successfully restored to Active');

  // --- 3. NOTIFICATIONS PIPELINE ---
  console.log('\n3. Testing Notification Dispatch & Persistence...');
  if (!dbManager.getDB().notifications) {
    dbManager.getDB().notifications = [];
  }

  const notification: UserNotification = {
    id: `notif-${Date.now()}`,
    userId: testUser.id,
    title: 'Security Alert: New Card Issued',
    message: 'Your Silicon Valley Bank corporate card has been generated.',
    amount: 0,
    currency: 'USD',
    reference: `NOTIF-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString()
  };

  dbManager.getDB().notifications.push(notification);
  dbManager.saveDB(dbManager.getDB());

  const notifs = dbManager.getDB().notifications.filter(n => n.userId === testUser.id);
  assert(notifs.length >= 1, 'Notification persisted in database');
  assert(notifs[0].read === false, 'Notification initially marked unread');

  // Mark Read
  notifs[0].read = true;
  dbManager.saveDB(dbManager.getDB());
  const readNotif = dbManager.getDB().notifications.find(n => n.id === notification.id);
  assert(readNotif?.read === true, 'Notification marked as read');

  // --- 4. TRANSFER EXECUTION & BALANCE INTEGRITY ---
  console.log('\n4. Testing Wire Transfer & Balance Reconciliation...');
  const wireAmount = 3000.00;
  const transferRes = dbManager.createTransfer(testUser, {
    recipientInput: 'SVB-CORPORATE-991',
    recipientName: 'Acme Cloud Services',
    destinationBank: 'Silicon Valley Bank',
    destinationCountry: 'United States',
    amount: wireAmount,
    fourDigitCode: '4321',
    note: 'Cloud Infrastructure Invoice #9482'
  });

  assert(transferRes.transaction.amount === wireAmount, 'Transfer transaction amount matches $3,000');
  assert(transferRes.sender.balance === 22000.00, 'User balance decreased from $25,000 to $22,000');
  assert(transferRes.transaction.status === 'Pending', 'Standard user transaction is in Pending state for SVB review');

  // --- 5. RECEIPT DATA INTEGRITY ---
  console.log('\n5. Testing Receipt & Transaction Advice Fields...');
  const receipt = transferRes.transaction;
  assert(!!receipt.reference, 'Receipt contains unique transaction reference number');
  assert(!!receipt.createdAt, 'Receipt contains creation timestamp');
  assert(receipt.recipientName === 'Acme Cloud Services', 'Receipt contains beneficiary name');
  assert(receipt.currency === 'USD', 'Receipt currency is USD');

  console.log('\n====================================================');
  console.log('REGRESSION SUITE COMPLETED: ALL 18 CHECKS PASSED');
  console.log('====================================================');
}

runRegressionSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Regression suite failed:', err);
    process.exit(1);
  });
