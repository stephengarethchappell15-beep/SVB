import { dbManager } from './db.js';
import { User, Transaction } from '../types.js';

async function runSuite() {
  console.log('====================================================');
  console.log('STARTING REFUND ACCOUNTING & STATE MACHINE TEST SUITE');
  console.log('====================================================\n');

  const adminUser: User = {
    id: 'admin-test-01',
    fullName: 'Admin Test',
    email: 'admin@svb.com',
    role: 'admin',
    balance: 0,
    phone: '+1 (555) 000-0000',
    currency: 'USD',
    createdAt: new Date().toISOString(),
    accountNumber: 'SVB-999999999'
  };

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedTests++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ==========================================
  // TEST A: Cancel Pending Outgoing Wire Transfer
  // ==========================================
  console.log('--- TEST A: Cancel Pending Outgoing Wire Transfer ---');
  {
    const testUserId = `user-test-a-${Date.now()}`;
    const testAccNo = `ACC-A-${Math.floor(100000 + Math.random() * 900000)}`;
    const initialBalance = 10000.00;
    const transferAmount = 2500.00;
    const expectedDeductedBalance = 7500.00;
    const expectedRestoredBalance = 10000.00;

    // 1. Create test user
    const testUser: User = {
      id: testUserId,
      fullName: 'Test Sender A',
      email: `${testUserId}@example.com`,
      role: 'user',
      balance: expectedDeductedBalance, // after transfer deduction
      ledgerBalance: expectedDeductedBalance,
      phone: '+1 (555) 111-2222',
      currency: 'USD',
      accountNumber: testAccNo,
      createdAt: new Date().toISOString()
    };
    dbManager.getDB().users.push(testUser);

    // 2. Create pending outgoing wire transfer
    const txnId = `TXN-WIRE-${Date.now()}`;
    const wireTxn: Transaction = {
      id: txnId,
      reference: `WIRE-${Date.now()}`,
      userId: testUserId,
      userEmail: testUser.email,
      accountNumber: testAccNo,
      type: 'Wire Transfer',
      transferType: 'Domestic',
      amount: transferAmount,
      currency: 'USD',
      status: 'Pending',
      description: 'Domestic Wire Transfer to Vendor Co',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recipientName: 'Vendor Co',
      recipientAccountNumber: '987654321',
      destinationBank: 'Bank of America'
    };
    dbManager.getDB().transactions.unshift(wireTxn);
    dbManager.saveDB(dbManager.getDB());
    dbManager.saveDB(dbManager.getDB());
    dbManager.saveDB(dbManager.getDB());

    console.log(`  User starting balance: $${testUser.balance.toFixed(2)} (after $${transferAmount} deduction)`);
    console.log(`  Pending wire transfer created: ${wireTxn.id} ($${wireTxn.amount})`);

    // 3. Admin rejects/cancels the pending wire transfer
    const rejectResult = await dbManager.rejectTransactionAsync(adminUser, txnId, 'Cancelled by Risk Assessment');

    // 4. Assertions
    assert(rejectResult.transaction.status === 'Refunded', 'Transaction status transitioned to REFUNDED');
    assert(rejectResult.transaction.refundAmount === transferAmount, 'Transaction refundAmount matches transfer amount');
    assert(!!rejectResult.transaction.refundReference, `Transaction has valid refundReference (${rejectResult.transaction.refundReference})`);
    assert(!!rejectResult.transaction.refundedAt, 'Transaction has valid refundedAt timestamp');
    
    const userInDb = dbManager.findUserById(testUserId);
    assert(rejectResult.user?.balance === expectedRestoredBalance, `rejectResult.user balance is ${expectedRestoredBalance} (actual: ${rejectResult.user?.balance})`);
    assert(userInDb?.balance === expectedRestoredBalance, `User balance in db restored from ${expectedDeductedBalance} to ${expectedRestoredBalance} (actual: ${userInDb?.balance})`);
    assert(userInDb?.ledgerBalance === expectedRestoredBalance, `User ledgerBalance restored to ${expectedRestoredBalance} (actual: ${userInDb?.ledgerBalance})`);
    assert(!!rejectResult.refundLedgerTxn, 'Refund ledger transaction was created');
    assert(rejectResult.refundLedgerTxn?.type === 'Refund', 'Refund ledger type is "Refund"');
    assert(rejectResult.refundLedgerTxn?.amount === transferAmount, `Refund ledger amount is ${transferAmount}`);

    // 5. Test idempotency (duplicate cancellation click)
    console.log('  Testing duplicate cancellation / double refund protection...');
    const duplicateResult = await dbManager.rejectTransactionAsync(adminUser, txnId, 'Duplicate cancel attempt');
    const userAfterDup = dbManager.findUserById(testUserId);
    assert(userAfterDup?.balance === expectedRestoredBalance, `Balance remained ${expectedRestoredBalance} on duplicate reject (NO double refund)`);
    assert(duplicateResult.transaction.status === 'Refunded', 'Status remains Refunded');
    console.log('  TEST A PASSED COMPLETELY!\n');
  }

  // ==========================================
  // TEST B: Approve Pending Outgoing Transfer
  // ==========================================
  console.log('--- TEST B: Approve Pending Outgoing Transfer ---');
  {
    const testUserId = `user-test-b-${Date.now()}`;
    const testAccNo = `ACC-B-${Math.floor(100000 + Math.random() * 900000)}`;
    const initialBalance = 12000.00;
    const transferAmount = 4000.00;
    const expectedRemainingBalance = 8000.00;

    // 1. Create test user
    const testUser: User = {
      id: testUserId,
      fullName: 'Test Sender B',
      email: `${testUserId}@example.com`,
      role: 'user',
      balance: expectedRemainingBalance, // debited at submission
      ledgerBalance: expectedRemainingBalance,
      phone: '+1 (555) 222-3333',
      currency: 'USD',
      accountNumber: testAccNo,
      createdAt: new Date().toISOString()
    };
    dbManager.getDB().users.push(testUser);

    // 2. Create pending transfer
    const txnId = `TXN-WIRE-B-${Date.now()}`;
    const wireTxn: Transaction = {
      id: txnId,
      reference: `WIRE-B-${Date.now()}`,
      userId: testUserId,
      userEmail: testUser.email,
      accountNumber: testAccNo,
      type: 'Wire Transfer',
      amount: transferAmount,
      currency: 'USD',
      status: 'Pending',
      description: 'Outgoing domestic wire transfer B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbManager.getDB().transactions.unshift(wireTxn);
    dbManager.saveDB(dbManager.getDB());

    // 3. Admin approves transaction
    console.log(`  Approving pending wire ${txnId}...`);
    const approveResult = await dbManager.approveTransactionAsync(adminUser, txnId);

    // 4. Assertions
    assert(approveResult.transaction.status === 'Completed', 'Approved transaction status is Completed');
    assert(testUser.balance === expectedRemainingBalance, `User balance NOT refunded on approval (remains $${expectedRemainingBalance})`);
    
    // Check no refund ledger was created for this txn
    const refundEntries = dbManager.getDB().transactions.filter(t => t.type === 'Refund' && t.description?.includes(txnId));
    assert(refundEntries.length === 0, 'No refund ledger entry created on approval');

    // 5. Attempt to reject/cancel an approved transfer
    console.log('  Testing reject on already approved transfer (must be blocked)...');
    let blocked = false;
    try {
      await dbManager.rejectTransactionAsync(adminUser, txnId, 'Try cancel approved');
    } catch (e: any) {
      blocked = true;
      assert(e.message.includes('already been approved'), `Rejection blocked with message: ${e.message}`);
    }
    assert(blocked, 'Rejecting approved transaction was properly blocked with an error');
    assert(testUser.balance === expectedRemainingBalance, `Balance unchanged at $${expectedRemainingBalance}`);
    console.log('  TEST B PASSED COMPLETELY!\n');
  }

  // ==========================================
  // TEST C: Reject Pending Deposit
  // ==========================================
  console.log('--- TEST C: Reject Pending Deposit ---');
  {
    const testUserId = `user-test-c-${Date.now()}`;
    const testAccNo = `ACC-C-${Math.floor(100000 + Math.random() * 900000)}`;
    const currentBalance = 5000.00;
    const depositAmount = 1500.00;

    // 1. Create test user
    const testUser: User = {
      id: testUserId,
      fullName: 'Test Depositor C',
      email: `${testUserId}@example.com`,
      role: 'user',
      balance: currentBalance, // deposit not credited yet
      ledgerBalance: currentBalance,
      phone: '+1 (555) 333-4444',
      currency: 'USD',
      accountNumber: testAccNo,
      createdAt: new Date().toISOString()
    };
    dbManager.getDB().users.push(testUser);

    // 2. Create pending incoming deposit
    const txnId = `TXN-DEP-C-${Date.now()}`;
    const depTxn: Transaction = {
      id: txnId,
      reference: `DEP-C-${Date.now()}`,
      userId: testUserId,
      userEmail: testUser.email,
      accountNumber: testAccNo,
      type: 'Deposit',
      amount: depositAmount,
      currency: 'USD',
      status: 'Pending',
      description: 'Incoming mobile check deposit',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbManager.getDB().transactions.unshift(depTxn);
    dbManager.saveDB(dbManager.getDB());

    // 3. Admin rejects deposit
    console.log(`  Rejecting pending deposit ${txnId}...`);
    const rejectResult = await dbManager.rejectTransactionAsync(adminUser, txnId, 'Unverified check deposit');

    // 4. Assertions
    assert(rejectResult.transaction.status === 'Cancelled', `Deposit status transitioned to Cancelled (actual: ${rejectResult.transaction.status})`);
    assert(rejectResult.transaction.status !== 'Refunded', 'Deposit status is NOT Refunded');
    assert(testUser.balance === currentBalance, `User balance remains unchanged at ${currentBalance} (NO refund or credit applied)`);
    assert(!rejectResult.refundLedgerTxn, 'No refund ledger entry created for rejected deposit');
    console.log('  TEST C PASSED COMPLETELY!\n');
  }

  // ==========================================
  // TEST D: Simulated Failure During Refund
  // ==========================================
  console.log('--- TEST D: Simulated Failure During Refund ---');
  {
    // Transaction with unknown sender user that cannot be resolved
    const unresolvableUserId = `non-existent-user-${Date.now()}`;
    const txnId = `TXN-FAIL-D-${Date.now()}`;
    const orphanTxn: Transaction = {
      id: txnId,
      reference: `WIRE-FAIL-${Date.now()}`,
      userId: unresolvableUserId,
      userEmail: 'orphan@ghost.invalid',
      accountNumber: 'ACC-GHOST-000',
      type: 'Wire Transfer',
      amount: 3000.00,
      currency: 'USD',
      status: 'Pending',
      description: 'Orphan wire transfer test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbManager.getDB().transactions.unshift(orphanTxn);
    dbManager.saveDB(dbManager.getDB());

    console.log(`  Attempting refund on unresolvable user transaction ${txnId}...`);
    let failed = false;
    try {
      await dbManager.rejectTransactionAsync(adminUser, txnId, 'Cancel attempt on missing account');
    } catch (e: any) {
      failed = true;
      console.log(`  Caught expected error: ${e.message}`);
      assert(e.message.includes('Refund failed'), 'Error explicitly identified that refund failed');
    }

    assert(failed, 'Operation failed as required when sender account cannot be restored');
    
    // Check that transaction was NOT marked Refunded!
    const txnInDb = dbManager.getDB().transactions.find(t => t.id === txnId);
    assert(txnInDb?.status === 'Pending', `Transaction status was preserved as Pending (actual: ${txnInDb?.status}) and NOT marked REFUNDED`);
    assert(!txnInDb?.refundedAt, 'Transaction does NOT have refundedAt timestamp');
    console.log('  TEST D PASSED COMPLETELY!\n');
  }

  console.log('====================================================');
  console.log(`ALL TESTS COMPLETED SUCCESSFULLY! (${passedTests} passed, ${failedTests} failed)`);
  console.log('====================================================');
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Test suite execution error:', err);
    process.exit(1);
  });
