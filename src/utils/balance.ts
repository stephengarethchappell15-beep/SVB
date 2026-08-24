import { User, Transaction } from '../types';

/**
 * Calculates and reconciles the active available and ledger balance for a user
 * based on the user's base account state and all approved/completed ledger transactions.
 */
export function calculateUserBalance(
  user: User | null | undefined,
  transactions: Transaction[] = []
): {
  availableBalance: number;
  ledgerBalance: number;
  totalCredits: number;
  totalDebits: number;
} {
  if (!user) {
    return { availableBalance: 0, ledgerBalance: 0, totalCredits: 0, totalDebits: 0 };
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const userAcc = (user.accountNumber || '').trim();
  const userAccClean = userAcc.replace(/[^0-9]/g, '');
  const userId = (user.id || '').trim();

  // Find all transactions matching this user
  const userTxns = (Array.isArray(transactions) ? transactions : []).filter(t => {
    if (!t) return false;
    const tUserId = (t.userId || '').trim();
    const tEmail = (t.userEmail || '').toLowerCase().trim();
    const tAcc = (t.accountNumber || '').trim();
    const tAccClean = tAcc.replace(/[^0-9]/g, '');
    const tRecAcc = (t.recipientAccountNumber || '').trim();
    const tRecAccClean = tRecAcc.replace(/[^0-9]/g, '');
    const tRecEmail = (t.recipientEmail || '').toLowerCase().trim();

    return (
      (userId && tUserId === userId) ||
      (userEmail && tEmail === userEmail) ||
      (userAcc && tAcc === userAcc) ||
      (userAccClean.length > 4 && tAccClean === userAccClean) ||
      (userAcc && tRecAcc === userAcc) ||
      (userAccClean.length > 4 && tRecAccClean === userAccClean) ||
      (userEmail && tRecEmail === userEmail)
    );
  });

  let totalCredits = 0;
  let totalDebits = 0;

  for (const t of userTxns) {
    const status = (t.status || '').toLowerCase();
    // Failed, Rejected, Cancelled transactions do not alter ledger
    if (status === 'rejected' || status === 'cancelled' || status === 'failed') {
      continue;
    }

    const type = (t.type || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const tRecAcc = (t.recipientAccountNumber || '').trim();
    const tRecEmail = (t.recipientEmail || '').toLowerCase().trim();
    const isRecipient = (userAcc && tRecAcc === userAcc) || (userEmail && tRecEmail === userEmail);

    const amount = Math.abs(Number(t.amount) || 0);

    // Is it an incoming / deposit / credit transaction?
    const isCredit =
      isRecipient ||
      type.includes('deposit') ||
      type.includes('credit') ||
      desc.includes('credit') ||
      desc.includes('deposit') ||
      desc.includes('incoming') ||
      desc.includes('received') ||
      (status === 'completed' && (type === 'code activation deposit' || desc.includes('activation deposit') || desc.includes('tier 3') || desc.includes('upgrade')));

    // Is it an outgoing / debit transaction?
    const isDebit =
      !isCredit &&
      (type.includes('withdraw') ||
        type.includes('wire') ||
        type.includes('debit') ||
        type.includes('bill') ||
        type.includes('payment') ||
        desc.includes('outgoing') ||
        desc.includes('transfer to') ||
        desc.includes('payment to') ||
        desc.includes('withdrawal'));

    if (isCredit) {
      // Completed, Approved, or Posted deposits add to balance
      if (status === 'completed' || status === 'approved' || status === 'posted' || status === '') {
        totalCredits += amount;
      }
    } else if (isDebit) {
      // Outgoing withdrawals/wires hold funds in Pending or Completed
      if (status === 'completed' || status === 'pending' || status === 'approved' || status === 'posted') {
        totalDebits += amount;
      }
    }
  }

  const computedLedger = Math.max(0, totalCredits - totalDebits);

  const rawBaseBalance = typeof user.balance === 'number' && !isNaN(user.balance) ? user.balance : 0;
  const rawLedgerBalance = typeof user.ledgerBalance === 'number' && !isNaN(user.ledgerBalance) ? user.ledgerBalance : rawBaseBalance;

  // If user.balance is 0 but we have completed credits/deposits totaling e.g. $59,000,
  // the reconciled balance should reflect the computed ledger!
  // If user.balance > 0, we ensure it's at least max(user.balance, computedLedger)
  let activeAvailable = rawBaseBalance;
  if (rawBaseBalance === 0 && totalCredits > 0) {
    activeAvailable = computedLedger;
  } else if (totalCredits > 0 && computedLedger > rawBaseBalance) {
    activeAvailable = computedLedger;
  }

  // Multi-account structure fallback if user has accounts array
  if (Array.isArray(user.accounts) && user.accounts.length > 0) {
    const accSum = user.accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    if (accSum > activeAvailable) {
      activeAvailable = accSum;
    }
  }

  const activeLedger = Math.max(activeAvailable, rawLedgerBalance, computedLedger);

  return {
    availableBalance: activeAvailable,
    ledgerBalance: activeLedger,
    totalCredits,
    totalDebits
  };
}
