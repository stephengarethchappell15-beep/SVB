import { Transaction } from '../types.js';

const FINALIZED_STATUS_KEY = 'svb_finalized_txn_statuses';

export function getFinalizedStatuses(): Record<string, 'Completed' | 'Rejected' | 'Cancelled'> {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(FINALIZED_STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFinalizedStatus(idOrRef: string, status: 'Completed' | 'Rejected' | 'Cancelled' | string): void {
  if (!idOrRef || status === 'Pending') return;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const current = getFinalizedStatuses();
    current[idOrRef] = status as any;
    localStorage.setItem(FINALIZED_STATUS_KEY, JSON.stringify(current));
  } catch {}
}

export function deduplicateTransactions(txns: Transaction[]): Transaction[] {
  if (!txns || !Array.isArray(txns)) return [];

  const finalizedStatuses = getFinalizedStatuses();

  // Normalize and apply overrides
  const normalized = txns.map(t => {
    const override = finalizedStatuses[t.id] || (t.reference ? finalizedStatuses[t.reference] : null);
    if (override && t.status !== override) {
      return { ...t, status: override };
    }
    return t;
  });

  const map = new Map<string, Transaction>();

  for (const t of normalized) {
    // Determine canonical lookup keys
    const anyTxn = t as any;
    const primaryKey = t.id ? `id:${t.id}` : null;
    const refKey = t.reference ? `ref:${t.reference.trim()}` : null;
    const amountNum = typeof t.amount === 'number' ? Math.abs(t.amount) : parseFloat(String(t.amount)) || 0;
    const dateStr = t.createdAt || anyTxn.date || '';
    const fuzzyKey = `${t.type}_${dateStr ? dateStr.slice(0, 16) : ''}_${amountNum.toFixed(2)}_${t.senderName || ''}_${t.recipientName || ''}`;

    // Look for existing duplicate
    let existingKey: string | null = null;
    let existing: Transaction | undefined;

    if (primaryKey && map.has(primaryKey)) {
      existingKey = primaryKey;
      existing = map.get(primaryKey);
    } else if (refKey && map.has(refKey)) {
      existingKey = refKey;
      existing = map.get(refKey);
    } else if (map.has(fuzzyKey)) {
      existingKey = fuzzyKey;
      existing = map.get(fuzzyKey);
    }

    if (!existing) {
      // Register with all possible keys
      const keyToUse = primaryKey || refKey || fuzzyKey;
      map.set(keyToUse, t);
      if (primaryKey && keyToUse !== primaryKey) map.set(primaryKey, t);
      if (refKey && keyToUse !== refKey) map.set(refKey, t);
      if (fuzzyKey && keyToUse !== fuzzyKey) map.set(fuzzyKey, t);
    } else {
      // Merge records: prefer Completed/Rejected over Pending, richer descriptions, valid timestamps
      const statusWeight = (s?: string) => {
        if (s === 'Completed') return 3;
        if (s === 'Rejected' || s === 'Cancelled') return 2;
        if (s === 'Pending') return 1;
        return 0;
      };

      const preferredStatus = statusWeight(t.status) >= statusWeight(existing.status) ? t.status : existing.status;
      const anyExisting = existing as any;
      const merged: Transaction = {
        ...existing,
        ...t,
        status: preferredStatus,
        description: (t.description && t.description.length > (existing.description?.length || 0)) ? t.description : existing.description,
        recipientName: t.recipientName || existing.recipientName,
        senderName: t.senderName || existing.senderName,
        destinationBank: t.destinationBank || existing.destinationBank,
        reference: t.reference || existing.reference,
        transferType: t.transferType || existing.transferType,
        destinationCountry: t.destinationCountry || existing.destinationCountry,
        recipientAccountNumber: t.recipientAccountNumber || existing.recipientAccountNumber,
        recipientEmail: t.recipientEmail || existing.recipientEmail,
        senderAccountNumber: t.senderAccountNumber || existing.senderAccountNumber,
        updatedAt: t.updatedAt || new Date().toISOString()
      };

      // Update in all mappings
      if (existingKey) map.set(existingKey, merged);
      if (primaryKey) map.set(primaryKey, merged);
      if (refKey) map.set(refKey, merged);
      if (fuzzyKey) map.set(fuzzyKey, merged);
    }
  }

  // Extract unique transactions by object identity
  const uniqueList = Array.from(new Set(map.values()));

  // Sort descending by date
  return uniqueList.sort((a, b) => {
    const anyA = a as any;
    const anyB = b as any;
    const timeA = anyA.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0) || (anyA.date ? new Date(anyA.date).getTime() : 0);
    const timeB = anyB.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0) || (anyB.date ? new Date(anyB.date).getTime() : 0);
    return timeB - timeA;
  });
}
