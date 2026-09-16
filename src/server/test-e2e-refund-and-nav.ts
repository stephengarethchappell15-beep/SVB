import { dbManager } from './db.js';
import { User, Transaction } from '../types.js';

async function testE2E() {
  console.log('====================================================');
  console.log('RUNNING FULL END-TO-END VERIFICATION: REFUND & RECEIPT');
  console.log('====================================================\n');

  const adminUser: User = {
    id: 'admin-e2e-01',
    fullName: 'Admin E2E',
    email: 'admin.e2e@svb.com',
    role: 'admin',
    balance: 0,
    phone: '+1 (555) 000-0000',
    currency: 'USD',
    createdAt: new Date().toISOString(),
    accountNumber: 'SVB-999999999'
  };

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
    } else {
      console.error(`  [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Setup client user with $15,000 initial balance
  const userId = `usr-e2e-${Date.now()}`;
  const userEmail = `client.${Date.now()}@svb-client.com`;
  const initialBalance = 15000.00;
  const transferAmount = 4500.00;

  const clientUser: User = {
    id: userId,
    fullName: 'Jane Silicon',
    email: userEmail,
    role: 'user',
    balance: initialBalance,
    ledgerBalance: initialBalance,
    phone: '+1 (555) 123-4567',
    currency: 'USD',
    accountNumber: `SVB-${Math.floor(100000000 + Math.random() * 900000000)}`,
    fourDigitCode: '8899',
    transferCodeApproved: true,
    verificationTier: 'Tier 3',
    createdAt: new Date().toISOString()
  };

  dbManager.getDB().users.push(clientUser);
  dbManager.saveDB(dbManager.getDB());
  console.log(`1. Created Client User ${clientUser.email} with Balance: $${clientUser.balance}`);

  // 2. Client initiates outgoing wire transfer of $4,500
  console.log(`2. Initiating wire transfer of $${transferAmount}...`);
  const transferResult = dbManager.createTransfer(clientUser, {
    destinationCountry: 'United States',
    destinationBank: 'JPMorgan Chase Bank',
    recipientInput: 'CHASE-440019283',
    recipientName: 'Venture Capital Partners LLC',
    amount: transferAmount,
    fourDigitCode: '8899',
    note: 'Q3 Seed Investment Tranche'
  });

  const pendingTxn = transferResult.transaction;
  console.log(`   Transfer created with ID: ${pendingTxn.id}, Reference: ${pendingTxn.reference}`);
  console.log(`   Transaction Status: ${pendingTxn.status}`);
  console.log(`   Client Balance After Transfer: $${transferResult.sender.balance}`);

  assert(pendingTxn.status === 'Pending', 'Transfer created in Pending status');
  assert(transferResult.sender.balance === 10500.00, 'Client available balance deducted by $4,500 (now $10,500)');
  assert(transferResult.sender.ledgerBalance === 10500.00, 'Client ledger balance deducted by $4,500 (now $10,500)');

  // Verify findUserByIdAsync returns deducted balance
  const userDuringPending = await dbManager.findUserByIdAsync(userId);
  assert(userDuringPending?.balance === 10500.00, 'findUserByIdAsync returns $10,500 during pending state');

  // 3. Admin reviews and CANCELS / REJECTS the wire transfer
  console.log('\n3. Admin executing rejection/cancellation with refund...');
  const rejectResult = await dbManager.rejectTransactionAsync(
    adminUser,
    pendingTxn.id,
    'Beneficiary bank routing number flagged for review'
  );

  console.log(`   Rejection completed. Returned user balance: $${rejectResult.user?.balance}`);
  console.log(`   Transaction final status: ${rejectResult.transaction.status}`);
  console.log(`   Refund reference: ${rejectResult.transaction.refundReference}`);
  console.log(`   Refund timestamp: ${rejectResult.transaction.refundedAt}`);

  // 4. Assertions on Database & State Machine
  assert(rejectResult.transaction.status === 'Refunded', 'Transaction status transitioned to REFUNDED');
  assert(rejectResult.transaction.refundAmount === 4500.00, 'Refund amount matches exactly $4,500');
  assert(!!rejectResult.transaction.refundReference, 'Refund reference generated');
  assert(!!rejectResult.transaction.refundedAt, 'Refund timestamp recorded');
  assert(rejectResult.user?.balance === 15000.00, 'Returned user object has restored balance $15,000');

  // Check persisted balance in DB
  const userAfterRefund = await dbManager.findUserByIdAsync(userId);
  assert(userAfterRefund?.balance === 15000.00, 'Persisted user balance in database restored to $15,000');
  assert(userAfterRefund?.ledgerBalance === 15000.00, 'Persisted ledger balance in database restored to $15,000');

  // Check refund ledger transaction
  const refundLedger = dbManager.getDB().transactions.find(t => t.type === 'Refund' && t.userId === userId);
  assert(!!refundLedger, 'Explicit "Refund" ledger transaction exists in system ledger');
  assert(refundLedger?.amount === 4500.00, 'Refund ledger transaction amount is $4,500');
  assert(refundLedger?.status === 'Completed', 'Refund ledger transaction status is Completed');

  // 5. Test Double Refund Protection (Idempotency)
  console.log('\n4. Testing Idempotency (preventing double refund)...');
  const duplicateReject = await dbManager.rejectTransactionAsync(
    adminUser,
    pendingTxn.id,
    'Second attempt by admin'
  );
  const userAfterDuplicate = await dbManager.findUserByIdAsync(userId);
  assert(userAfterDuplicate?.balance === 15000.00, 'Balance NOT doubled, remains exactly $15,000');
  assert(duplicateReject.transaction.status === 'Refunded', 'Transaction remains Refunded');

  console.log('\n====================================================');
  console.log('ALL E2E SCENARIOS VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

testE2E()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('E2E test failed:', e);
    process.exit(1);
  });
