import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  deleteDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { User, VirtualCard, CryptoActivationDeposit, Tier3VerificationRequest, Transaction, SupportTicket, SupportMessage } from '../types.js';
import { deduplicateTransactions, saveFinalizedStatus } from '../utils/transactions.js';
import { dbStore } from '../services/dbStore.js';

// Default project configuration fallback
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0276814234",
  appId: "1:89916653740:web:5ba9a9cdc7a295dbcb5f09",
  apiKey: "AIzaSyDD3L1PRMjFp4YbVVrMjydD9M-HZ7Pik_M",
  authDomain: "gen-lang-client-0276814234.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-useraccountadmin-04fdbca0-f4d3-4cb2-b47d-ede50540d064",
  storageBucket: "gen-lang-client-0276814234.firebasestorage.app",
  messagingSenderId: "89916653740"
};

// Helper to safely get config values across Vite client and Node server
const getEnvVal = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {}
  return '';
};

// Firebase Config using environment variables or embedded project defaults
const firebaseConfig = {
  apiKey: getEnvVal('VITE_FIREBASE_API_KEY') || getEnvVal('FIREBASE_API_KEY') || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: getEnvVal('VITE_FIREBASE_AUTH_DOMAIN') || getEnvVal('FIREBASE_AUTH_DOMAIN') || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: getEnvVal('VITE_FIREBASE_PROJECT_ID') || getEnvVal('FIREBASE_PROJECT_ID') || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: getEnvVal('VITE_FIREBASE_STORAGE_BUCKET') || getEnvVal('FIREBASE_STORAGE_BUCKET') || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: getEnvVal('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnvVal('FIREBASE_MESSAGING_SENDER_ID') || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: getEnvVal('VITE_FIREBASE_APP_ID') || getEnvVal('FIREBASE_APP_ID') || DEFAULT_FIREBASE_CONFIG.appId,
  databaseId: getEnvVal('VITE_FIREBASE_DATABASE_ID') || getEnvVal('FIREBASE_DATABASE_ID') || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId
};

// Initialize Firebase App & Firestore
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.databaseId);

// Helper to check if object is a special Firestore type that should not be stripped
function isSpecialObject(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  if ('_delegate' in val || '_methodName' in val) return true;
  const name = val.constructor?.name;
  if (name && (name.includes('FieldValue') || name.includes('Timestamp') || name === 'Date')) return true;
  if (typeof val.isEqual === 'function' && typeof val.toMillis === 'function') return true;
  return false;
}

// Helper to remove undefined fields recursively to prevent Firestore write crashes
function cleanUndefined<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null || typeof obj !== 'object') return obj;
  if (isSpecialObject(obj)) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = cleanUndefined(value);
    }
  }
  return clean as T;
}

// Helper to safely merge user records across Firestore collections without losing fields
export function mergeUserRecords(existing: User | undefined, incoming: User): User {
  if (!existing) return incoming;

  const isIncomingNewer = incoming.updatedAt && existing.updatedAt 
    ? new Date(incoming.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
    : true;

  const merged: User = {
    ...existing,
    ...incoming,
    id: incoming.id || existing.id,
    fullName: incoming.fullName || existing.fullName,
    email: (incoming.email || existing.email || '').trim().toLowerCase(),
    phone: incoming.phone || existing.phone,
    accountNumber: incoming.accountNumber || existing.accountNumber,
    role: incoming.role || existing.role,
    currency: incoming.currency || existing.currency || 'USD',
    address: incoming.address || existing.address,
    country: incoming.country || existing.country,
    verificationTier: incoming.verificationTier || existing.verificationTier,
    status: incoming.status || existing.status || 'Active',
    accountPin: incoming.accountPin || existing.accountPin,
    fourDigitCode: incoming.fourDigitCode || existing.fourDigitCode,
    transferCodeApproved: typeof incoming.transferCodeApproved === 'boolean' ? incoming.transferCodeApproved : existing.transferCodeApproved,
    twoFactorEnabled: typeof incoming.twoFactorEnabled === 'boolean' ? incoming.twoFactorEnabled : existing.twoFactorEnabled,
    balance: typeof incoming.balance === 'number' 
      ? (isIncomingNewer ? incoming.balance : (typeof existing.balance === 'number' ? existing.balance : incoming.balance)) 
      : (typeof existing.balance === 'number' ? existing.balance : 0),
    ledgerBalance: typeof incoming.ledgerBalance === 'number' 
      ? (isIncomingNewer ? incoming.ledgerBalance : (typeof existing.ledgerBalance === 'number' ? existing.ledgerBalance : incoming.ledgerBalance)) 
      : (typeof existing.ledgerBalance === 'number' ? existing.ledgerBalance : (incoming.balance || 0)),
    updatedAt: isIncomingNewer 
      ? (incoming.updatedAt || existing.updatedAt || new Date().toISOString()) 
      : (existing.updatedAt || incoming.updatedAt || new Date().toISOString()),
    createdAt: existing.createdAt || incoming.createdAt || new Date().toISOString()
  };

  // Synchronize multi-account balance if present
  if (Array.isArray(incoming.accounts) && incoming.accounts.length > 0) {
    merged.accounts = incoming.accounts.map((acc, idx) => idx === 0 ? { ...acc, balance: merged.balance } : acc);
  } else if (Array.isArray(existing.accounts) && existing.accounts.length > 0) {
    merged.accounts = existing.accounts.map((acc, idx) => idx === 0 ? { ...acc, balance: merged.balance } : acc);
  }

  return merged;
}

// Helper to prevent hanging in serverless or constrained networks
function withTimeout<T>(promise: Promise<T>, timeoutMs = 3500, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

/**
 * Save or update user persistently in Firestore across all query index collections
 */
export async function syncUserToFirestore(user: User, password?: string): Promise<void> {
  if (!user || !user.email) return;
  try {
    const cleanEmail = user.email.trim().toLowerCase();
    const uid = user.id || (user as any).uid || (user as any)._id || `usr-${Date.now()}`;
    const cleanAcc = (user.accountNumber || '').trim();
    const cleanAccNum = cleanAcc.replace(/[^0-9]/g, '');

    const userProfile = cleanUndefined({
      ...user,
      uid: uid,
      id: uid,
      fullName: user.fullName || '',
      email: cleanEmail,
      accountNumber: cleanAcc,
      balance: Number(user.balance) || 0.00, // Explicitly numeric
      ledgerBalance: Number(user.ledgerBalance) || Number(user.balance) || 0.00,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      ...(password ? { password } : {})
    });

    const ops: Promise<any>[] = [];
    if (uid) {
      ops.push(setDoc(doc(db, 'users', uid), userProfile, { merge: true }));
    }
    ops.push(setDoc(doc(db, 'users_by_email', cleanEmail), userProfile, { merge: true }));

    if (cleanAcc) {
      ops.push(setDoc(doc(db, 'users_by_account', cleanAcc), userProfile, { merge: true }));
      if (cleanAccNum && cleanAccNum !== cleanAcc) {
        ops.push(setDoc(doc(db, 'users_by_account', cleanAccNum), userProfile, { merge: true }));
      }
    }
    await withTimeout(Promise.all(ops), 3500, null);
  } catch (err) {
    console.warn('Firestore user sync warning:', err);
  }
}

/**
 * Perform direct normalized search on 'users' collection by email and account number
 */
export async function searchUsersDirectory(searchTerm: string): Promise<User[]> {
  const queryStr = (searchTerm || '').trim().toLowerCase();
  const cleanNum = queryStr.replace(/[^0-9]/g, '');
  const usersRef = collection(db, 'users');

  const results: User[] = [];
  const addedIds = new Set<string>();

  const addResult = (u: any) => {
    if (!u) return;
    const id = u.id || u.uid;
    const key = (u.email || id || u.accountNumber || '').toLowerCase();
    if (key && !addedIds.has(key)) {
      addedIds.add(key);
      results.push({
        ...u,
        id: id || `usr-${Date.now()}`,
        email: (u.email || '').trim().toLowerCase(),
        balance: Number(u.balance) || 0.00,
        ledgerBalance: Number(u.ledgerBalance) || Number(u.balance) || 0.00
      });
    }
  };

  try {
    if (!queryStr) {
      return await getAllUsersFromFirestore();
    }

    // 1. Direct document ID lookups
    const [snapId, snapEmailDoc, snapAccDoc] = await Promise.all([
      getDoc(doc(db, 'users', searchTerm.trim())).catch(() => null),
      getDoc(doc(db, 'users_by_email', queryStr)).catch(() => null),
      getDoc(doc(db, 'users_by_account', searchTerm.trim())).catch(() => null)
    ]);

    if (snapId && snapId.exists()) addResult({ id: snapId.id, ...snapId.data() });
    if (snapEmailDoc && snapEmailDoc.exists()) addResult({ id: snapEmailDoc.id, ...snapEmailDoc.data() });
    if (snapAccDoc && snapAccDoc.exists()) addResult({ id: snapAccDoc.id, ...snapAccDoc.data() });

    if (cleanNum && cleanNum !== searchTerm.trim()) {
      const snapCleanAcc = await getDoc(doc(db, 'users_by_account', cleanNum)).catch(() => null);
      if (snapCleanAcc && snapCleanAcc.exists()) addResult({ id: snapCleanAcc.id, ...snapCleanAcc.data() });
    }

    // 2. Query against 'users' collection by email and accountNumber
    const [snapshotByAcc, snapshotByEmail] = await Promise.all([
      getDocs(query(usersRef, where('accountNumber', '==', searchTerm.trim()))).catch(() => null),
      getDocs(query(usersRef, where('email', '==', queryStr))).catch(() => null)
    ]);

    if (snapshotByAcc) {
      snapshotByAcc.forEach(docSnap => {
        if (docSnap.exists()) addResult({ id: docSnap.id, ...docSnap.data() });
      });
    }

    if (snapshotByEmail) {
      snapshotByEmail.forEach(docSnap => {
        if (docSnap.exists()) addResult({ id: docSnap.id, ...docSnap.data() });
      });
    }

    if (cleanNum && cleanNum !== searchTerm.trim()) {
      const snapNum = await getDocs(query(usersRef, where('accountNumber', '==', cleanNum))).catch(() => null);
      if (snapNum) {
        snapNum.forEach(docSnap => {
          if (docSnap.exists()) addResult({ id: docSnap.id, ...docSnap.data() });
        });
      }
    }

    // 3. Fallback search across all users for partial substring matches
    const allUsers = await getAllUsersFromFirestore();
    allUsers.forEach(u => {
      if (!u) return;
      const uEmail = (u.email || '').toLowerCase();
      const uName = (u.fullName || '').toLowerCase();
      const uAcc = (u.accountNumber || '').toLowerCase();
      const uAccClean = uAcc.replace(/[^0-9]/g, '');
      const uId = (u.id || '').toLowerCase();

      if (
        uEmail.includes(queryStr) ||
        uAcc.includes(queryStr) ||
        (cleanNum.length > 0 && uAccClean.includes(cleanNum)) ||
        uName.includes(queryStr) ||
        uId.includes(queryStr)
      ) {
        addResult(u);
      }
    });
  } catch (err) {
    console.warn('searchUsersDirectory error:', err);
  }

  return results;
}

/**
 * Execute administrative deposit with strict numeric casting and Firestore write alignment
 */
export async function executeAdminDeposit(
  accountIdentifier: string, 
  depositAmount: number,
  options?: { senderName?: string; description?: string; reference?: string; adminEmail?: string }
): Promise<{ success: boolean; newBalance: number; user: User; transaction: Transaction }> {
  const usersRef = collection(db, 'users');
  const queryStr = accountIdentifier.trim();
  const cleanEmail = queryStr.toLowerCase();
  const cleanAcc = queryStr.replace(/[^0-9]/g, '');

  let targetUid = '';
  let userData: any = null;

  // 1. Find user by accountNumber or email or ID
  const [snapAcc, snapEmail, snapId] = await Promise.all([
    getDocs(query(usersRef, where('accountNumber', '==', queryStr))).catch(() => null),
    getDocs(query(usersRef, where('email', '==', cleanEmail))).catch(() => null),
    getDoc(doc(db, 'users', queryStr)).catch(() => null)
  ]);

  if (snapAcc && !snapAcc.empty) {
    const docSnap = snapAcc.docs[0];
    targetUid = docSnap.id;
    userData = docSnap.data();
  } else if (snapEmail && !snapEmail.empty) {
    const docSnap = snapEmail.docs[0];
    targetUid = docSnap.id;
    userData = docSnap.data();
  } else if (snapId && snapId.exists()) {
    targetUid = snapId.id;
    userData = snapId.data();
  } else if (cleanAcc) {
    const snapCleanAcc = await getDocs(query(usersRef, where('accountNumber', '==', cleanAcc))).catch(() => null);
    if (snapCleanAcc && !snapCleanAcc.empty) {
      const docSnap = snapCleanAcc.docs[0];
      targetUid = docSnap.id;
      userData = docSnap.data();
    }
  }

  // Fallback to users_by_email or users_by_account
  if (!userData) {
    const [byEmailDoc, byAccDoc] = await Promise.all([
      getDoc(doc(db, 'users_by_email', cleanEmail)).catch(() => null),
      getDoc(doc(db, 'users_by_account', queryStr)).catch(() => null)
    ]);
    if (byEmailDoc && byEmailDoc.exists()) {
      userData = byEmailDoc.data();
      targetUid = userData.id || userData.uid || byEmailDoc.id;
    } else if (byAccDoc && byAccDoc.exists()) {
      userData = byAccDoc.data();
      targetUid = userData.id || userData.uid || byAccDoc.id;
    }
  }

  // Final fallback to memory DB
  if (!userData) {
    const memoryUser = dbStore.getUsers().find(u => 
      u.accountNumber === queryStr || 
      u.email.toLowerCase() === cleanEmail ||
      (cleanAcc.length > 0 && u.accountNumber.replace(/[^0-9]/g, '') === cleanAcc)
    );
    if (memoryUser) {
      userData = memoryUser;
      targetUid = memoryUser.id;
    }
  }

  if (!userData) {
    throw new Error(`User account not found in database for '${accountIdentifier}'.`);
  }

  // Force numeric addition to prevent string concatenation or NaN bugs
  const currentBalance = Number(userData.balance) || 0;
  const amountToAdd = Number(depositAmount) || 0;
  const newBalance = currentBalance + amountToAdd;
  const now = new Date().toISOString();
  const refCode = options?.reference || `TXN-DEP-${now.slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let fourDigitCode = userData.fourDigitCode;
  let transferCodeApproved = userData.transferCodeApproved;
  let isNewCodeGenerated = false;
  if (!fourDigitCode || !transferCodeApproved) {
    fourDigitCode = Math.floor(1000 + Math.random() * 9000).toString();
    transferCodeApproved = true;
    isNewCodeGenerated = true;
  }

  const updatedUserData: User = {
    ...userData,
    id: targetUid || userData.id,
    balance: newBalance,
    ledgerBalance: newBalance,
    fourDigitCode,
    transferCodeApproved,
    lastUpdated: now,
    updatedAt: now
  };

  // Update user document balance in main users collection and index collections
  await syncUserToFirestore(updatedUserData);
  dbStore.saveUser(updatedUserData);

  // Create audit transaction log
  const txnId = `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newTxn: Transaction = {
    id: txnId,
    userId: targetUid || userData.id,
    userEmail: userData.email,
    accountNumber: userData.accountNumber || queryStr,
    type: 'ADMIN_DEPOSIT',
    amount: amountToAdd,
    balanceAfter: newBalance,
    currency: userData.currency || 'USD',
    status: 'Completed',
    senderName: options?.senderName || 'Federal Wire Transfer / SVB Treasury',
    reference: refCode,
    description: isNewCodeGenerated
      ? `${options?.description || 'Admin Balance Deposit'} (4-Digit Code Activated: ${fourDigitCode})`
      : (options?.description || 'Admin Balance Deposit'),
    createdByAdminEmail: options?.adminEmail || 'admin@svb.com',
    timestamp: now,
    createdAt: now,
    updatedAt: now
  };

  await syncTransactionToFirestore(newTxn);
  dbStore.addTransaction(newTxn);

  return { success: true, newBalance, user: updatedUserData, transaction: newTxn };
}

/**
 * Get user by email or account number or ID from Firestore
 */
export async function getUserFromFirestore(identifier: string): Promise<User | null> {
  if (!identifier) return null;
  const raw = identifier.trim().toLowerCase();
  const cleanNum = raw.replace(/[^0-9]/g, '');

  const fetchInternal = async (): Promise<User | null> => {
    try {
      let resultUser: User | null = null;

      const byIdSnap = await getDoc(doc(db, 'users', identifier)).catch(() => null);
      if (byIdSnap && byIdSnap.exists()) {
        resultUser = mergeUserRecords(resultUser || undefined, byIdSnap.data() as User);
      }

      const byEmailSnap = await getDoc(doc(db, 'users_by_email', raw)).catch(() => null);
      if (byEmailSnap && byEmailSnap.exists()) {
        resultUser = mergeUserRecords(resultUser || undefined, byEmailSnap.data() as User);
      }

      const byAccSnap = await getDoc(doc(db, 'users_by_account', identifier)).catch(() => null);
      if (byAccSnap && byAccSnap.exists()) {
        resultUser = mergeUserRecords(resultUser || undefined, byAccSnap.data() as User);
      }

      if (cleanNum) {
        const byCleanAccSnap = await getDoc(doc(db, 'users_by_account', cleanNum)).catch(() => null);
        if (byCleanAccSnap && byCleanAccSnap.exists()) {
          resultUser = mergeUserRecords(resultUser || undefined, byCleanAccSnap.data() as User);
        }
      }

      if (resultUser) return resultUser;

      const usersRef = collection(db, 'users');
      const qEmail = query(usersRef, where('email', '==', raw));
      const snapEmail = await getDocs(qEmail).catch(() => null);
      if (snapEmail && !snapEmail.empty) {
        resultUser = mergeUserRecords(resultUser || undefined, snapEmail.docs[0].data() as User);
      }

      const qAcc = query(usersRef, where('accountNumber', '==', identifier));
      const snapAcc = await getDocs(qAcc).catch(() => null);
      if (snapAcc && !snapAcc.empty) {
        resultUser = mergeUserRecords(resultUser || undefined, snapAcc.docs[0].data() as User);
      }

      if (cleanNum) {
        const qCleanAcc = query(usersRef, where('accountNumber', '==', cleanNum));
        const snapCleanAcc = await getDocs(qCleanAcc).catch(() => null);
        if (snapCleanAcc && !snapCleanAcc.empty) {
          resultUser = mergeUserRecords(resultUser || undefined, snapCleanAcc.docs[0].data() as User);
        }
      }

      if (resultUser) return resultUser;

      const allUsers = await getAllUsersFromFirestore();
      const matched = allUsers.find(u => {
        if (!u) return false;
        const emailClean = (u.email || '').trim().toLowerCase();
        const accRaw = (u.accountNumber || '').trim().toLowerCase();
        const accClean = accRaw.replace(/[^0-9]/g, '');
        const uid = (u.id || '').trim().toLowerCase();

        return (
          emailClean === raw ||
          accRaw === raw ||
          (cleanNum.length > 0 && accClean === cleanNum) ||
          uid === raw
        );
      });

      if (matched) return matched;
    } catch (err) {
      console.warn('Firestore user fetch error:', err);
    }
    return null;
  };

  return withTimeout(fetchInternal(), 3000, null);
}

/**
 * Get all users from Firestore with discovery across users, users_by_email, tickets, and transactions
 */
export async function getAllUsersFromFirestore(): Promise<User[]> {
  const userMap = new Map<string, User>();

  const addUserToMap = (u: User) => {
    if (!u) return;
    const emailKey = (u.email || '').trim().toLowerCase();
    const idKey = (u.id || '').trim().toLowerCase();
    const accKey = (u.accountNumber || '').trim().replace(/[^0-9]/g, '');
    const canonicalKey = emailKey || accKey || idKey;
    if (!canonicalKey) return;

    // Find existing entry if any key matches
    let existing: User | undefined = userMap.get(canonicalKey);
    if (!existing && emailKey && userMap.has(emailKey)) existing = userMap.get(emailKey);
    if (!existing && accKey && userMap.has(accKey)) existing = userMap.get(accKey);
    if (!existing && idKey && userMap.has(idKey)) existing = userMap.get(idKey);

    const merged = mergeUserRecords(existing, u);
    if (emailKey) userMap.set(emailKey, merged);
    if (accKey) userMap.set(accKey, merged);
    if (idKey) userMap.set(idKey, merged);
  };

  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((d) => {
      if (d.exists()) {
        addUserToMap(d.data() as User);
      }
    });
  } catch (err) {
    console.warn('Firestore getAllUsers main collection error:', err);
  }

  try {
    const emailSnap = await getDocs(collection(db, 'users_by_email'));
    emailSnap.forEach((d) => {
      if (d.exists()) {
        addUserToMap(d.data() as User);
      }
    });
  } catch (err) {
    console.warn('Firestore getAllUsers email collection error:', err);
  }

  try {
    const accSnap = await getDocs(collection(db, 'users_by_account'));
    accSnap.forEach((d) => {
      if (d.exists()) {
        addUserToMap(d.data() as User);
      }
    });
  } catch (err) {
    console.warn('Firestore getAllUsers account collection error:', err);
  }

  try {
    const [ticketsSnap, chatsSnap] = await Promise.all([
      getDocs(collection(db, 'support_tickets')).catch(() => null),
      getDocs(collection(db, 'chats')).catch(() => null)
    ]);

    const processTicketUser = (docItem: any) => {
      if (docItem && docItem.exists()) {
        const t = docItem.data();
        const userEmail = (t.userEmail || '').trim().toLowerCase();
        if (userEmail && !userMap.has(userEmail)) {
          const synthesizedUser: User = {
            id: t.userId || `usr-${userEmail.replace(/[^a-z0-9]/g, '')}`,
            fullName: t.userName || userEmail.split('@')[0],
            email: userEmail,
            phone: '+1 (555) 019-2834',
            accountNumber: t.accountNumber || '10' + Math.floor(10000000 + Math.random() * 90000000).toString(),
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
            createdAt: t.createdAt || new Date().toISOString()
          };
          addUserToMap(synthesizedUser);
        }
      }
    };

    if (ticketsSnap) ticketsSnap.forEach(processTicketUser);
    if (chatsSnap) chatsSnap.forEach(processTicketUser);
  } catch (err) {
    console.warn('Firestore user discovery from tickets error:', err);
  }

  // Deduplicate by email or ID for clean array output
  const uniqueUsers = new Map<string, User>();
  userMap.forEach((u) => {
    const key = (u.email || u.id || u.accountNumber).toLowerCase();
    if (!uniqueUsers.has(key)) {
      uniqueUsers.set(key, u);
    }
  });

  return Array.from(uniqueUsers.values());
}

/**
 * Sync Virtual Card to Firestore for permanent cross-session storage
 */
export async function syncVirtualCardToFirestore(card: VirtualCard): Promise<void> {
  if (!card || !card.id) return;
  try {
    await setDoc(doc(db, 'virtual_cards', card.id), {
      ...card,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore virtual card sync error:', err);
  }
}

/**
 * Fetch Virtual Cards for a user from Firestore
 */
export async function getVirtualCardsFromFirestore(userId: string): Promise<VirtualCard[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'virtual_cards'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const cards: VirtualCard[] = [];
    snap.forEach((d) => {
      if (d.exists()) cards.push(d.data() as VirtualCard);
    });
    return cards;
  } catch (err) {
    console.warn('Firestore getVirtualCards error:', err);
    return [];
  }
}

/**
 * Sync Global Crypto Wallet Deposit Addresses to Firestore
 */
export async function syncCryptoAddressesToFirestore(addresses: { BTC: string; USDT: string }): Promise<void> {
  if (!addresses) return;
  try {
    await setDoc(doc(db, 'config', 'crypto_addresses'), {
      BTC: addresses.BTC,
      USDT: addresses.USDT,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore crypto addresses sync error:', err);
  }
}

/**
 * Subscribe to Live Global Crypto Wallet Deposit Addresses from Firestore
 */
export function subscribeCryptoAddressesFromFirestore(callback: (addresses: { BTC: string; USDT: string }) => void): () => void {
  try {
    const unsub = onSnapshot(doc(db, 'config', 'crypto_addresses'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.BTC && data.USDT) {
          callback({ BTC: data.BTC, USDT: data.USDT });
        }
      }
    }, (err) => {
      console.warn('Firestore subscribeCryptoAddresses error:', err);
    });
    return unsub;
  } catch (err) {
    console.warn('Firestore subscribeCryptoAddresses catch error:', err);
    return () => {};
  }
}

/**
 * Sync Crypto Activation Deposit ($2,500 deposit for 4-digit code) to Firestore
 */
export async function syncCryptoDepositToFirestore(deposit: CryptoActivationDeposit): Promise<void> {
  if (!deposit || !deposit.id) return;
  try {
    await setDoc(doc(db, 'crypto_activation_deposits', deposit.id), {
      ...deposit,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore crypto deposit sync error:', err);
  }
}

/**
 * Get all Crypto Activation Deposits from Firestore for admin queue
 */
export async function getAllCryptoDepositsFromFirestore(): Promise<CryptoActivationDeposit[]> {
  try {
    const snap = await getDocs(collection(db, 'crypto_activation_deposits'));
    const list: CryptoActivationDeposit[] = [];
    snap.forEach((d) => {
      if (d.exists()) list.push(d.data() as CryptoActivationDeposit);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Firestore getAllCryptoDeposits error:', err);
    return [];
  }
}

/**
 * Sync Tier 3 Verification Request ($5,000 upgrade deposit) to Firestore
 */
export async function syncVerificationToFirestore(verif: Tier3VerificationRequest): Promise<void> {
  if (!verif || !verif.id) return;
  try {
    await setDoc(doc(db, 'tier3_verifications', verif.id), {
      ...verif,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore verification sync error:', err);
  }
}

/**
 * Get all Tier 3 Verification Requests from Firestore for admin queue
 */
export async function getAllVerificationsFromFirestore(): Promise<Tier3VerificationRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'tier3_verifications'));
    const list: Tier3VerificationRequest[] = [];
    snap.forEach((d) => {
      if (d.exists()) list.push(d.data() as Tier3VerificationRequest);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Firestore getAllVerifications error:', err);
    return [];
  }
}

/**
 * Sync Transaction to Firestore
 */
export async function syncTransactionToFirestore(txn: Transaction): Promise<void> {
  if (!txn || (!txn.id && !txn.reference)) return;
  try {
    const docId = txn.reference || txn.id;
    const payload = cleanUndefined({
      ...txn,
      id: txn.id || docId,
      reference: txn.reference || docId,
      updatedAt: txn.updatedAt || new Date().toISOString()
    });

    if (payload.status && payload.status !== 'Pending') {
      if (txn.id) saveFinalizedStatus(txn.id, payload.status);
      if (txn.reference) saveFinalizedStatus(txn.reference, payload.status);
    }

    const writes = [setDoc(doc(db, 'transactions', docId), payload, { merge: true })];
    if (txn.id && txn.id !== docId) {
      writes.push(setDoc(doc(db, 'transactions', txn.id), payload, { merge: true }));
    }
    await Promise.all(writes);
  } catch (err) {
    console.warn('Firestore transaction sync error:', err);
  }
}

/**
 * Permanently update transaction status across all matching Firestore documents and linked collections
 */
export async function updateTransactionInFirestore(
  identifier: string,
  status: 'Completed' | 'Rejected' | 'Cancelled' | 'Pending',
  extraUpdates?: Partial<Transaction>
): Promise<void> {
  if (!identifier) return;
  const now = new Date().toISOString();
  saveFinalizedStatus(identifier, status);
  try {
    const directRef1 = doc(db, 'transactions', identifier);
    const updates = cleanUndefined({
      status,
      updatedAt: now,
      ...(extraUpdates || {})
    });

    const writes: Promise<any>[] = [
      setDoc(directRef1, updates, { merge: true }).catch(() => null)
    ];

    try {
      const q1 = query(collection(db, 'transactions'), where('reference', '==', identifier));
      const q2 = query(collection(db, 'transactions'), where('id', '==', identifier));
      const [snap1, snap2] = await Promise.all([
        getDocs(q1).catch(() => null),
        getDocs(q2).catch(() => null)
      ]);

      if (snap1 && !snap1.empty) {
        snap1.forEach((d) => {
          const dData = d.data() as any;
          if (dData?.id) saveFinalizedStatus(dData.id, status);
          if (dData?.reference) saveFinalizedStatus(dData.reference, status);
          writes.push(setDoc(d.ref, updates, { merge: true }).catch(() => null));
        });
      }
      if (snap2 && !snap2.empty) {
        snap2.forEach((d) => {
          const dData = d.data() as any;
          if (dData?.id) saveFinalizedStatus(dData.id, status);
          if (dData?.reference) saveFinalizedStatus(dData.reference, status);
          writes.push(setDoc(d.ref, updates, { merge: true }).catch(() => null));
        });
      }
    } catch (qErr) {
      console.warn('Query matching transactions error:', qErr);
    }

    try {
      const c1 = query(collection(db, 'crypto_activation_deposits'), where('id', '==', identifier));
      const cSnap = await getDocs(c1).catch(() => null);
      if (cSnap && !cSnap.empty) {
        cSnap.forEach((d) => {
          writes.push(setDoc(d.ref, { status, updatedAt: now }, { merge: true }).catch(() => null));
        });
      }
    } catch (cErr) {
      console.warn('Query crypto deposits error:', cErr);
    }

    await Promise.all(writes);
  } catch (err) {
    console.warn('Firestore updateTransactionInFirestore error:', err);
  }
}

/**
 * Get Transactions for user from Firestore
 */
export async function getTransactionsFromFirestore(userOrId?: string | User | null): Promise<Transaction[]> {
  try {
    const snap = await getDocs(collection(db, 'transactions'));
    const list: Transaction[] = [];
    snap.forEach((d) => {
      if (d.exists()) list.push(d.data() as Transaction);
    });
    const deduped = deduplicateTransactions(list);

    if (!userOrId) return deduped;

    let uId = '';
    let uEmail = '';
    let uAcc = '';

    if (typeof userOrId === 'string') {
      const clean = userOrId.trim().toLowerCase();
      if (clean.includes('@')) uEmail = clean;
      else if (clean.replace(/[^0-9]/g, '').length >= 6) uAcc = clean.replace(/[^0-9]/g, '');
      else uId = userOrId.trim();
    } else if (userOrId && typeof userOrId === 'object') {
      uId = (userOrId.id || '').trim();
      uEmail = (userOrId.email || '').trim().toLowerCase();
      uAcc = (userOrId.accountNumber || '').trim().replace(/[^0-9]/g, '');
    }

    return deduped.filter(t => {
      if (!t) return false;
      const tUserId = (t.userId || '').trim();
      const tEmail = (t.userEmail || '').toLowerCase().trim();
      const tAcc = (t.accountNumber || '').replace(/[^0-9]/g, '');
      const tRecAcc = (t.recipientAccountNumber || '').replace(/[^0-9]/g, '');
      const tRecEmail = (t.recipientEmail || '').toLowerCase().trim();

      return (
        (uId && tUserId === uId) ||
        (uEmail && tEmail === uEmail) ||
        (uEmail && tRecEmail === uEmail) ||
        (uAcc && tAcc === uAcc) ||
        (uAcc && tRecAcc === uAcc)
      );
    });
  } catch (err) {
    console.warn('Firestore getTransactions error:', err);
    return [];
  }
}

/**
 * Subscribe to real-time User snapshot updates from Firestore
 */
export function subscribeUserFromFirestore(
  userId: string | undefined, 
  email: string | undefined, 
  callback: (user: User) => void,
  accountNumber?: string | undefined
): () => void {
  const unsubs: (() => void)[] = [];
  let currentUser: User | undefined = undefined;

  const handleUserSnap = (snapData: User) => {
    if (!snapData) return;
    currentUser = mergeUserRecords(currentUser, snapData);
    callback(currentUser);
  };

  try {
    if (userId) {
      const u1 = onSnapshot(doc(db, 'users', userId), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as User;
          if (data && data.email) handleUserSnap(data);
        }
      }, (err) => console.warn('User snapshot error:', err));
      unsubs.push(u1);
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const u2 = onSnapshot(doc(db, 'users_by_email', cleanEmail), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as User;
          if (data && data.email) handleUserSnap(data);
        }
      }, (err) => console.warn('User by email snapshot error:', err));
      unsubs.push(u2);
    }

    if (accountNumber) {
      const cleanAcc = accountNumber.replace(/[^0-9]/g, '');
      const u3 = onSnapshot(doc(db, 'users_by_account', accountNumber), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as User;
          if (data && data.email) handleUserSnap(data);
        }
      }, (err) => console.warn('User by account snapshot error:', err));
      unsubs.push(u3);

      if (cleanAcc && cleanAcc !== accountNumber) {
        const u4 = onSnapshot(doc(db, 'users_by_account', cleanAcc), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as User;
            if (data && data.email) handleUserSnap(data);
          }
        }, (err) => console.warn('User by clean account snapshot error:', err));
        unsubs.push(u4);
      }
    }
  } catch (err) {
    console.warn('subscribeUserFromFirestore error:', err);
  }

  return () => {
    unsubs.forEach(u => u());
  };
}

/**
 * Subscribe to real-time Transactions snapshot updates from Firestore
 */
export function subscribeTransactionsFromFirestore(userOrId: string | User | null | undefined, callback: (txns: Transaction[]) => void): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => {
        if (d.exists()) list.push(d.data() as Transaction);
      });
      const deduped = deduplicateTransactions(list);

      if (!userOrId) {
        callback(deduped);
        return;
      }

      let uId = '';
      let uEmail = '';
      let uAcc = '';

      if (typeof userOrId === 'string') {
        const clean = userOrId.trim().toLowerCase();
        if (clean.includes('@')) uEmail = clean;
        else if (clean.replace(/[^0-9]/g, '').length >= 6) uAcc = clean.replace(/[^0-9]/g, '');
        else uId = userOrId.trim();
      } else if (userOrId && typeof userOrId === 'object') {
        uId = (userOrId.id || '').trim();
        uEmail = (userOrId.email || '').trim().toLowerCase();
        uAcc = (userOrId.accountNumber || '').trim().replace(/[^0-9]/g, '');
      }

      const filtered = deduped.filter(t => {
        if (!t) return false;
        const tUserId = (t.userId || '').trim();
        const tEmail = (t.userEmail || '').toLowerCase().trim();
        const tAcc = (t.accountNumber || '').replace(/[^0-9]/g, '');
        const tRecAcc = (t.recipientAccountNumber || '').replace(/[^0-9]/g, '');
        const tRecEmail = (t.recipientEmail || '').toLowerCase().trim();

        return (
          (uId && tUserId === uId) ||
          (uEmail && tEmail === uEmail) ||
          (uEmail && tRecEmail === uEmail) ||
          (uAcc && tAcc === uAcc) ||
          (uAcc && tRecAcc === uAcc)
        );
      });

      callback(filtered);
    }, (err) => console.warn('Transactions snapshot error:', err));

    return unsub;
  } catch (err) {
    console.warn('subscribeTransactionsFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Subscribe to real-time All Users list from Firestore
 */
export function subscribeAllUsersFromFirestore(callback: (users: User[]) => void): () => void {
  const unsubs: (() => void)[] = [];
  const userMap = new Map<string, User>();

  const addUserToMap = (u: User) => {
    if (!u) return;
    const emailKey = (u.email || '').trim().toLowerCase();
    const idKey = (u.id || '').trim().toLowerCase();
    const accKey = (u.accountNumber || '').trim().replace(/[^0-9]/g, '');
    const canonicalKey = emailKey || accKey || idKey;
    if (!canonicalKey) return;

    let existing: User | undefined = userMap.get(canonicalKey);
    if (!existing && emailKey && userMap.has(emailKey)) existing = userMap.get(emailKey);
    if (!existing && accKey && userMap.has(accKey)) existing = userMap.get(accKey);
    if (!existing && idKey && userMap.has(idKey)) existing = userMap.get(idKey);

    const merged = mergeUserRecords(existing, u);
    if (emailKey) userMap.set(emailKey, merged);
    if (accKey) userMap.set(accKey, merged);
    if (idKey) userMap.set(idKey, merged);
  };

  const emit = () => {
    const uniqueUsers = new Map<string, User>();
    userMap.forEach((u) => {
      const key = (u.email || u.id || u.accountNumber).toLowerCase();
      if (!uniqueUsers.has(key)) {
        uniqueUsers.set(key, u);
      }
    });
    callback(Array.from(uniqueUsers.values()));
  };

  try {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      snap.forEach((d) => {
        if (d.exists()) {
          addUserToMap(d.data() as User);
        }
      });
      emit();
    }, (err) => console.warn('Users collection snapshot error:', err));
    unsubs.push(unsubUsers);

    const unsubEmailUsers = onSnapshot(collection(db, 'users_by_email'), (snap) => {
      snap.forEach((d) => {
        if (d.exists()) {
          addUserToMap(d.data() as User);
        }
      });
      emit();
    }, (err) => console.warn('Users by email snapshot error:', err));
    unsubs.push(unsubEmailUsers);

    const unsubAccountUsers = onSnapshot(collection(db, 'users_by_account'), (snap) => {
      snap.forEach((d) => {
        if (d.exists()) {
          addUserToMap(d.data() as User);
        }
      });
      emit();
    }, (err) => console.warn('Users by account snapshot error:', err));
    unsubs.push(unsubAccountUsers);

    const unsubChats = onSnapshot(collection(db, 'chats'), (snap) => {
      snap.forEach((d) => {
        if (d.exists()) {
          const t = d.data();
          const userEmail = (t.userEmail || '').trim().toLowerCase();
          if (userEmail && !userMap.has(userEmail)) {
            const synthesizedUser: User = {
              id: t.userId || `usr-${userEmail.replace(/[^a-z0-9]/g, '')}`,
              fullName: t.userName || userEmail.split('@')[0],
              email: userEmail,
              phone: '+1 (555) 019-2834',
              accountNumber: t.accountNumber || '10' + Math.floor(10000000 + Math.random() * 90000000).toString(),
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
              createdAt: t.createdAt || new Date().toISOString()
            };
            addUserToMap(synthesizedUser);
          }
        }
      });
      emit();
    }, (err) => console.warn('Chats user sync snapshot error:', err));
    unsubs.push(unsubChats);

    const unsubTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      snap.forEach((d) => {
        if (d.exists()) {
          const t = d.data();
          const userEmail = (t.userEmail || '').trim().toLowerCase();
          if (userEmail && !userMap.has(userEmail)) {
            const synthesizedUser: User = {
              id: t.userId || `usr-${userEmail.replace(/[^a-z0-9]/g, '')}`,
              fullName: t.userName || userEmail.split('@')[0],
              email: userEmail,
              phone: '+1 (555) 019-2834',
              accountNumber: t.accountNumber || '10' + Math.floor(10000000 + Math.random() * 90000000).toString(),
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
              createdAt: t.createdAt || new Date().toISOString()
            };
            userMap.set(userEmail, synthesizedUser);
          }
        }
      });
      emit();
    }, (err) => console.warn('Support tickets user sync snapshot error:', err));
    unsubs.push(unsubTickets);

    return () => {
      unsubs.forEach(u => u());
    };
  } catch (err) {
    console.warn('subscribeAllUsersFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Canonical Ticket ID Helper - ensures a single deterministic ID representation
 */
export function getCanonicalTicketId(id?: string): string {
  if (!id) return '';
  const clean = String(id).trim();
  return clean.startsWith('TICKET-') ? clean : `TICKET-${clean}`;
}

export function getRawTicketId(id?: string): string {
  if (!id) return '';
  return String(id).trim().replace(/^TICKET-/, '');
}

/**
 * Robust ticket equality checker matching variants with/without TICKET- prefix and case insensitivity
 */
export function isSameTicketId(id1?: string, id2?: string): boolean {
  if (!id1 || !id2) return false;
  if (id1 === id2) return true;
  const clean1 = String(id1).replace(/^TICKET-/, '').trim().toLowerCase();
  const clean2 = String(id2).replace(/^TICKET-/, '').trim().toLowerCase();
  return clean1 === clean2;
}

/**
 * Returns all normalized ID variants for a given ticket identifier
 */
export function getTicketIdVariants(ticketId?: string): string[] {
  if (!ticketId) return [];
  const raw = String(ticketId).trim();
  if (!raw) return [];
  const withPrefix = raw.startsWith('TICKET-') ? raw : `TICKET-${raw}`;
  const withoutPrefix = raw.replace(/^TICKET-/, '');
  const set = new Set<string>([withPrefix, withoutPrefix, raw]);
  return Array.from(set).filter(Boolean);
}

/**
 * Helper to normalize any incoming SupportMessage from Firestore or REST payload
 */
export function normalizeSupportMessage(rawMsg: any, parentTicket?: Partial<SupportTicket>): SupportMessage {
  if (!rawMsg) {
    return {
      id: `msg-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      message: '',
      createdAt: new Date().toISOString()
    };
  }

  let messageStr = '';
  if (typeof rawMsg === 'string') {
    messageStr = rawMsg;
  } else if (rawMsg.message !== undefined && rawMsg.message !== null) {
    messageStr = typeof rawMsg.message === 'string' ? rawMsg.message : JSON.stringify(rawMsg.message);
  } else if (rawMsg.text !== undefined && rawMsg.text !== null) {
    messageStr = typeof rawMsg.text === 'string' ? rawMsg.text : JSON.stringify(rawMsg.text);
  } else if (rawMsg.content !== undefined && rawMsg.content !== null) {
    messageStr = typeof rawMsg.content === 'string' ? rawMsg.content : JSON.stringify(rawMsg.content);
  } else if (rawMsg.body !== undefined && rawMsg.body !== null) {
    messageStr = typeof rawMsg.body === 'string' ? rawMsg.body : JSON.stringify(rawMsg.body);
  } else if (rawMsg.msg !== undefined && rawMsg.msg !== null) {
    messageStr = typeof rawMsg.msg === 'string' ? rawMsg.msg : JSON.stringify(rawMsg.msg);
  } else if (rawMsg.description !== undefined && rawMsg.description !== null) {
    messageStr = typeof rawMsg.description === 'string' ? rawMsg.description : JSON.stringify(rawMsg.description);
  } else if (rawMsg.inquiry !== undefined && rawMsg.inquiry !== null) {
    messageStr = typeof rawMsg.inquiry === 'string' ? rawMsg.inquiry : JSON.stringify(rawMsg.inquiry);
  } else if (rawMsg.notes !== undefined && rawMsg.notes !== null) {
    messageStr = typeof rawMsg.notes === 'string' ? rawMsg.notes : JSON.stringify(rawMsg.notes);
  }

  let images: string[] = [];
  if (Array.isArray(rawMsg.images)) {
    images = rawMsg.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
  } else if (Array.isArray(rawMsg.attachments)) {
    images = rawMsg.attachments.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
  } else if (rawMsg.image) {
    images = [rawMsg.image];
  } else if (rawMsg.imageUrl) {
    images = [rawMsg.imageUrl];
  } else if (rawMsg.photoUrl) {
    images = [rawMsg.photoUrl];
  } else if (rawMsg.fileUrl) {
    images = [rawMsg.fileUrl];
  } else if (rawMsg.url && typeof rawMsg.url === 'string' && (rawMsg.url.startsWith('data:image') || rawMsg.url.startsWith('http'))) {
    images = [rawMsg.url];
  } else if (rawMsg.depositSlipUrl) {
    images = [rawMsg.depositSlipUrl];
  } else if (rawMsg.proofUrl) {
    images = [rawMsg.proofUrl];
  } else if (rawMsg.documentUrl) {
    images = [rawMsg.documentUrl];
  } else if (rawMsg.paymentSlipUrl) {
    images = [rawMsg.paymentSlipUrl];
  } else if (rawMsg.screenshot) {
    images = [rawMsg.screenshot];
  } else if (rawMsg.receipt) {
    images = [rawMsg.receipt];
  }

  const roleStr = String(rawMsg.senderRole || rawMsg.role || rawMsg.type || '').toLowerCase().trim();
  let role: 'admin' | 'user' | 'system' = 'user';

  if (roleStr === 'admin' || roleStr === 'support' || roleStr === 'agent' || roleStr === 'staff' || roleStr === 'representative') {
    role = 'admin';
  } else if (roleStr === 'user' || roleStr === 'client' || roleStr === 'customer') {
    role = 'user';
  } else if (roleStr === 'system') {
    role = 'system';
  } else if (
    rawMsg.isAdmin === true || 
    rawMsg.fromAdmin === true ||
    rawMsg.senderId === 'svb-live-agent-bot' ||
    (rawMsg.senderName && rawMsg.senderName.toLowerCase().includes('support')) ||
    (rawMsg.senderName && rawMsg.senderName.toLowerCase().includes('desk')) ||
    (rawMsg.senderName && rawMsg.senderName.toLowerCase().includes('admin'))
  ) {
    role = 'admin';
  } else {
    role = 'user';
  }

  const senderName = 
    rawMsg.senderName || 
    rawMsg.userName || 
    rawMsg.name || 
    rawMsg.sender || 
    (role === 'admin' ? 'SVB Client Support' : (parentTicket?.userName || 'Client'));

  const senderId = 
    rawMsg.senderId || 
    rawMsg.userId || 
    rawMsg.sender || 
    (role === 'admin' ? 'admin' : (parentTicket?.userId || 'user'));

  let createdAt = new Date().toISOString();
  if (rawMsg.createdAt) {
    if (typeof rawMsg.createdAt === 'string') createdAt = rawMsg.createdAt;
    else if (rawMsg.createdAt.toDate && typeof rawMsg.createdAt.toDate === 'function') createdAt = rawMsg.createdAt.toDate().toISOString();
    else if (typeof rawMsg.createdAt === 'number') createdAt = new Date(rawMsg.createdAt).toISOString();
  } else if (rawMsg.timestamp) {
    if (typeof rawMsg.timestamp === 'string') createdAt = rawMsg.timestamp;
    else if (rawMsg.timestamp.toDate && typeof rawMsg.timestamp.toDate === 'function') createdAt = rawMsg.timestamp.toDate().toISOString();
    else if (typeof rawMsg.timestamp === 'number') createdAt = new Date(rawMsg.timestamp).toISOString();
  }

  const canonicalThreadId = getCanonicalTicketId(rawMsg.ticketId || rawMsg.chatId || rawMsg.threadId || rawMsg.roomId || parentTicket?.id || `TICKET-${Date.now()}`);

  let messageId = rawMsg.id || rawMsg._id;
  if (!messageId) {
    const cleanMsgSlice = messageStr.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '');
    messageId = `msg-${senderId}-${new Date(createdAt).getTime()}-${cleanMsgSlice || 'body'}`;
  }

  return {
    id: messageId,
    ticketId: canonicalThreadId,
    chatId: canonicalThreadId,
    threadId: canonicalThreadId,
    roomId: canonicalThreadId,
    senderId,
    senderName,
    senderRole: role,
    message: messageStr,
    images: images.length > 0 ? images : undefined,
    createdAt
  };
}

/**
 * Helper to normalize any incoming SupportTicket document
 */
export function normalizeSupportTicket(rawDoc: any, docId?: string): SupportTicket {
  const canonicalId = getCanonicalTicketId(rawDoc?.id || docId || rawDoc?.ticketId || rawDoc?.threadId || rawDoc?.chatId || rawDoc?.roomId || `TICKET-${Date.now()}`);
  const nowIso = new Date().toISOString();

  if (!rawDoc) {
    return {
      id: canonicalId,
      chatId: canonicalId,
      threadId: canonicalId,
      roomId: canonicalId,
      userId: '',
      userEmail: '',
      userName: 'Client',
      accountNumber: '',
      subject: 'Support Inquiry',
      category: 'General',
      status: 'Open',
      priority: 'Medium',
      messages: [],
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }
  
  let createdAt = nowIso;
  if (rawDoc.createdAt) {
    if (typeof rawDoc.createdAt === 'string') createdAt = rawDoc.createdAt;
    else if (rawDoc.createdAt.toDate) createdAt = rawDoc.createdAt.toDate().toISOString();
    else if (typeof rawDoc.createdAt === 'number') createdAt = new Date(rawDoc.createdAt).toISOString();
  }

  let updatedAt = createdAt;
  if (rawDoc.updatedAt) {
    if (typeof rawDoc.updatedAt === 'string') updatedAt = rawDoc.updatedAt;
    else if (rawDoc.updatedAt.toDate) updatedAt = rawDoc.updatedAt.toDate().toISOString();
    else if (typeof rawDoc.updatedAt === 'number') updatedAt = new Date(rawDoc.updatedAt).toISOString();
  }

  let rawMessages: any[] = [];
  if (Array.isArray(rawDoc.messages)) {
    rawMessages = rawDoc.messages;
  } else if (Array.isArray(rawDoc.chatMessages)) {
    rawMessages = rawDoc.chatMessages;
  } else if (Array.isArray(rawDoc.history)) {
    rawMessages = rawDoc.history;
  } else if (Array.isArray(rawDoc.logs)) {
    rawMessages = rawDoc.logs;
  }

  const messages: SupportMessage[] = rawMessages.map(m => normalizeSupportMessage(m, { ...rawDoc, id: canonicalId, createdAt }));

  const rootText = rawDoc.message || rawDoc.text || rawDoc.content || rawDoc.body || rawDoc.description || rawDoc.inquiry || rawDoc.notes;
  const rootImages = Array.isArray(rawDoc.images) ? rawDoc.images : (rawDoc.image ? [rawDoc.image] : (rawDoc.imageUrl ? [rawDoc.imageUrl] : (rawDoc.depositSlipUrl ? [rawDoc.depositSlipUrl] : undefined)));

  if (messages.length === 0 && (rootText || (rootImages && rootImages.length > 0))) {
    const textStr = rootText ? (typeof rootText === 'string' ? rootText : JSON.stringify(rootText)) : (rootImages ? 'Attached proof document' : '');
    messages.push({
      id: `msg-initial-${canonicalId}`,
      ticketId: canonicalId,
      chatId: canonicalId,
      threadId: canonicalId,
      roomId: canonicalId,
      senderId: rawDoc.userId || 'user',
      senderName: rawDoc.userName || (rawDoc.userEmail ? rawDoc.userEmail.split('@')[0] : 'Client'),
      senderRole: 'user',
      message: textStr.trim(),
      images: rootImages,
      createdAt
    });
  }

  const msgMap = new Map<string, SupportMessage>();
  messages.forEach(m => {
    if (!m) return;
    const key = m.id || `${m.senderId}_${(m.message || '').trim()}_${m.createdAt}`;
    msgMap.set(key, m);
  });
  const dedupedMessages = Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let userEmail = rawDoc.userEmail || rawDoc.email || rawDoc.senderEmail || rawDoc.clientEmail || rawDoc.targetEmail || rawDoc.user_email || rawDoc.from || '';
  let userName = rawDoc.userName || rawDoc.name || rawDoc.senderName || rawDoc.clientName || '';
  let userId = rawDoc.userId || rawDoc.uid || rawDoc.user_id || '';
  let accountNumber = rawDoc.accountNumber || rawDoc.account_number || '';

  if (!userEmail && Array.isArray(messages)) {
    for (const m of messages) {
      if (m && m.senderRole !== 'admin' && m.senderRole !== 'system') {
        if (m.senderId && m.senderId.includes('@')) {
          userEmail = m.senderId;
          break;
        }
        if (m.senderName && m.senderName.includes('@')) {
          userEmail = m.senderName;
          break;
        }
      }
    }
  }

  if (!userName) {
    userName = userEmail ? userEmail.split('@')[0] : 'Client';
  }

  let status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' = 'Open';
  if (rawDoc.status === 'Resolved' || rawDoc.status === 'Closed' || rawDoc.status === 'In Progress') {
    status = rawDoc.status;
  } else if (rawDoc.status === 'resolved' || rawDoc.status === 'closed') {
    status = 'Resolved';
  } else if (rawDoc.status === 'in_progress' || rawDoc.status === 'pending') {
    status = 'In Progress';
  }

  // If the last message in the thread is from the user/client, ensure the ticket is Open and pending admin attention
  if (dedupedMessages.length > 0) {
    const lastMsg = dedupedMessages[dedupedMessages.length - 1];
    if (lastMsg && lastMsg.senderRole === 'user' && (status === 'Closed' || status === 'Resolved')) {
      status = 'Open';
    }
  }

  return {
    id: canonicalId,
    chatId: canonicalId,
    threadId: canonicalId,
    roomId: canonicalId,
    userId,
    userEmail,
    userName,
    accountNumber,
    subject: rawDoc.subject || rawDoc.title || rawDoc.topic || 'Customer Support Consultation',
    category: rawDoc.category || 'General',
    status,
    priority: (rawDoc.priority === 'High' || rawDoc.priority === 'Low') ? rawDoc.priority : 'Medium',
    messages: dedupedMessages,
    createdAt,
    updatedAt
  };
}

/**
 * Merge two ticket representations preserving all messages and highest metadata fidelity
 */
export function mergeSupportTickets(existing: SupportTicket, incoming: SupportTicket): SupportTicket {
  const canonicalId = getCanonicalTicketId(incoming.id || existing.id);
  const msgMap = new Map<string, SupportMessage>();

  const addMsg = (m: SupportMessage) => {
    if (!m) return;
    const msgText = (m.message || '').trim();
    const msgTime = new Date(m.createdAt || 0).getTime();
    const isTemp = m.id && (m.id.startsWith('msg-opt-') || m.id.startsWith('msg-temp-'));
    
    if (isTemp) {
      const existingMatch = Array.from(msgMap.values()).find(ex => {
        if (ex.id && (ex.id.startsWith('msg-opt-') || ex.id.startsWith('msg-temp-'))) return false;
        if (ex.senderRole !== m.senderRole && ex.senderId !== m.senderId) return false;
        if ((ex.message || '').trim() !== msgText) return false;
        const exTime = new Date(ex.createdAt || 0).getTime();
        return Math.abs(exTime - msgTime) < 120000;
      });
      if (!existingMatch) {
        msgMap.set(m.id, m);
      }
    } else {
      for (const [k, v] of msgMap.entries()) {
        if (v.id && (v.id.startsWith('msg-opt-') || v.id.startsWith('msg-temp-'))) {
          if ((v.senderRole === m.senderRole || v.senderId === m.senderId) && (v.message || '').trim() === msgText) {
            const vTime = new Date(v.createdAt || 0).getTime();
            if (Math.abs(vTime - msgTime) < 120000) {
              msgMap.delete(k);
            }
          }
        }
      }
      const key = m.id || `${m.senderRole}_${m.senderId || 'user'}_${msgText}_${m.createdAt || msgTime}`;
      msgMap.set(key, m);
    }
  };

  (existing.messages || []).forEach(addMsg);
  (incoming.messages || []).forEach(addMsg);

  const mergedMessages = Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const isIncomingNewer = new Date(incoming.updatedAt || incoming.createdAt || 0).getTime() >= new Date(existing.updatedAt || existing.createdAt || 0).getTime();
  const mostRecentStatus = isIncomingNewer ? incoming.status : existing.status;

  return {
    ...existing,
    ...incoming,
    id: canonicalId,
    chatId: canonicalId,
    threadId: canonicalId,
    roomId: canonicalId,
    status: mostRecentStatus || incoming.status || existing.status || 'Open',
    userId: incoming.userId || existing.userId || '',
    userEmail: incoming.userEmail || existing.userEmail || '',
    userName: incoming.userName || existing.userName || 'Client',
    accountNumber: incoming.accountNumber || existing.accountNumber || '',
    messages: mergedMessages,
    updatedAt: isIncomingNewer ? (incoming.updatedAt || new Date().toISOString()) : (existing.updatedAt || new Date().toISOString())
  };
}

/**
 * Sync Support Ticket & Messages to Firestore for permanent persistence
 */
export async function syncSupportTicketToFirestore(ticket: SupportTicket): Promise<void> {
  if (!ticket || !ticket.id) return;
  try {
    const canonicalId = getCanonicalTicketId(ticket.id);
    const idVariants = getTicketIdVariants(canonicalId);
    const nowIso = new Date().toISOString();
    const normalized = normalizeSupportTicket(ticket, canonicalId);

    const payload = cleanUndefined({
      ...normalized,
      id: canonicalId,
      chatId: canonicalId,
      threadId: canonicalId,
      roomId: canonicalId,
      updatedAt: normalized.updatedAt || nowIso
    });

    const docWrites = idVariants.flatMap(variant => [
      setDoc(doc(db, 'support_tickets', variant), payload, { merge: true }),
      setDoc(doc(db, 'chats', variant), payload, { merge: true })
    ]);
    await Promise.all(docWrites);

    if (Array.isArray(normalized.messages) && normalized.messages.length > 0) {
      const writeMsgPromises = normalized.messages.map((m) => {
        const normalizedMsg = normalizeSupportMessage(m, normalized);
        const msgId = normalizedMsg.id;
        const msgPayload = cleanUndefined({
          ...normalizedMsg,
          id: msgId,
          ticketId: canonicalId,
          chatId: canonicalId,
          threadId: canonicalId,
          roomId: canonicalId
        });

        const subWrites = idVariants.flatMap(variant => [
          setDoc(doc(db, 'support_tickets', variant, 'messages', msgId), msgPayload, { merge: true }),
          setDoc(doc(db, 'chats', variant, 'messages', msgId), msgPayload, { merge: true })
        ]);

        return Promise.all([
          ...subWrites,
          setDoc(doc(db, 'support_messages', msgId), msgPayload, { merge: true }),
          setDoc(doc(db, 'messages', msgId), msgPayload, { merge: true })
        ]);
      });
      await Promise.all(writeMsgPromises);
    }
  } catch (err) {
    console.warn('Firestore support ticket & chat sync error:', err);
  }
}

/**
 * Bulk sync default/local support tickets to Firestore
 */
export async function syncAllDefaultTicketsToFirestore(tickets: SupportTicket[]): Promise<void> {
  if (!tickets || tickets.length === 0) return;
  for (const t of tickets) {
    try {
      await syncSupportTicketToFirestore(t);
    } catch (e) {
      console.warn('Failed to sync default ticket to Firestore:', e);
    }
  }
}

/**
 * Send an individual message directly to Firestore with real-time atomic propagation
 */
export async function sendSupportMessageToFirestore(
  ticketId: string, 
  message: SupportMessage,
  parentTicket?: Partial<SupportTicket>
): Promise<void> {
  if (!ticketId || !message) return;
  try {
    const canonicalId = getCanonicalTicketId(ticketId);
    const idVariants = getTicketIdVariants(canonicalId);
    const localTicket = dbStore.getSupportTickets(undefined, true).find(t => isSameTicketId(t.id, canonicalId));

    const finalUserId = parentTicket?.userId || localTicket?.userId || '';
    const finalUserEmail = parentTicket?.userEmail || localTicket?.userEmail || '';
    const finalUserName = parentTicket?.userName || localTicket?.userName || 'Client';
    const finalAccountNumber = parentTicket?.accountNumber || localTicket?.accountNumber || '';
    const finalSubject = parentTicket?.subject || localTicket?.subject || 'Customer Support Consultation';
    const finalCategory = parentTicket?.category || localTicket?.category || 'General';
    const finalPriority = parentTicket?.priority || localTicket?.priority || 'Medium';

    const normalizedMsg = normalizeSupportMessage(message, { 
      id: canonicalId, 
      userId: finalUserId,
      userEmail: finalUserEmail,
      userName: finalUserName,
      accountNumber: finalAccountNumber,
      ...parentTicket 
    });
    const msgId = normalizedMsg.id;
    const nowIso = new Date().toISOString();

    const msgPayload = cleanUndefined({
      ...normalizedMsg,
      id: msgId,
      ticketId: canonicalId,
      chatId: canonicalId,
      threadId: canonicalId,
      roomId: canonicalId
    });

    const subWrites = idVariants.flatMap(variant => [
      setDoc(doc(db, 'support_tickets', variant, 'messages', msgId), msgPayload, { merge: true }),
      setDoc(doc(db, 'chats', variant, 'messages', msgId), msgPayload, { merge: true })
    ]);

    await Promise.all([
      ...subWrites,
      setDoc(doc(db, 'support_messages', msgId), msgPayload, { merge: true }),
      setDoc(doc(db, 'messages', msgId), msgPayload, { merge: true })
    ]);

    const existingMsgs = (parentTicket?.messages && parentTicket.messages.length > 0) 
      ? parentTicket.messages 
      : (localTicket?.messages || []);
    const allMsgs = [...existingMsgs.filter(m => m && m.id !== msgId), normalizedMsg].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let nextStatus: 'Open' | 'In Progress' | 'Resolved' | 'Closed' = 'Open';
    if (normalizedMsg.senderRole === 'user') {
      nextStatus = 'Open';
    } else if (normalizedMsg.senderRole === 'admin') {
      if (parentTicket?.status === 'Resolved' || parentTicket?.status === 'Closed') {
        nextStatus = parentTicket.status;
      } else {
        nextStatus = 'In Progress';
      }
    } else {
      nextStatus = parentTicket?.status || localTicket?.status || 'Open';
    }

    const updatePayload: any = {
      id: canonicalId,
      chatId: canonicalId,
      threadId: canonicalId,
      roomId: canonicalId,
      updatedAt: nowIso,
      lastMessage: normalizedMsg.message || (normalizedMsg.images && normalizedMsg.images.length > 0 ? 'Attached image' : ''),
      lastSenderRole: normalizedMsg.senderRole,
      lastSenderName: normalizedMsg.senderName,
      status: nextStatus,
      userId: finalUserId,
      userEmail: finalUserEmail,
      userName: finalUserName,
      accountNumber: finalAccountNumber,
      subject: finalSubject,
      category: finalCategory,
      priority: finalPriority,
      messages: allMsgs.map(cleanUndefined)
    };

    const parentUpdates = idVariants.flatMap(variant => [
      setDoc(doc(db, 'support_tickets', variant), cleanUndefined(updatePayload), { merge: true }),
      setDoc(doc(db, 'chats', variant), cleanUndefined(updatePayload), { merge: true })
    ]);
    await Promise.all(parentUpdates);
  } catch (err) {
    console.warn('sendSupportMessageToFirestore error:', err);
  }
}

/**
 * Permanently delete an individual message from Firestore across subcollections, root collections, and parent docs
 */
export async function deleteSupportMessageFromFirestore(
  ticketId: string, 
  messageId: string,
  remainingMessages?: SupportMessage[]
): Promise<void> {
  if (!ticketId || !messageId) return;
  try {
    const canonicalId = getCanonicalTicketId(ticketId);
    const idVariants = getTicketIdVariants(canonicalId);

    const directDeletes = idVariants.flatMap(variant => [
      deleteDoc(doc(db, 'support_tickets', variant, 'messages', messageId)).catch(() => null),
      deleteDoc(doc(db, 'chats', variant, 'messages', messageId)).catch(() => null)
    ]);

    await Promise.all([
      ...directDeletes,
      deleteDoc(doc(db, 'support_messages', messageId)).catch(() => null),
      deleteDoc(doc(db, 'messages', messageId)).catch(() => null)
    ]);

    const queryDeletes: Promise<any>[] = [];
    idVariants.forEach(variant => {
      queryDeletes.push(
        getDocs(query(collection(db, 'support_messages'), where('ticketId', '==', variant))).then(snap => {
          const toDelete: Promise<any>[] = [];
          snap.forEach(d => {
            const data = d.data();
            if (d.id === messageId || data.id === messageId || `${data.senderId}-${data.message}-${data.createdAt}` === messageId) {
              toDelete.push(deleteDoc(d.ref).catch(() => null));
            }
          });
          return Promise.all(toDelete);
        }).catch(() => null)
      );
      queryDeletes.push(
        getDocs(query(collection(db, 'messages'), where('ticketId', '==', variant))).then(snap => {
          const toDelete: Promise<any>[] = [];
          snap.forEach(d => {
            const data = d.data();
            if (d.id === messageId || data.id === messageId || `${data.senderId}-${data.message}-${data.createdAt}` === messageId) {
              toDelete.push(deleteDoc(d.ref).catch(() => null));
            }
          });
          return Promise.all(toDelete);
        }).catch(() => null)
      );
    });
    await Promise.all(queryDeletes);

    if (Array.isArray(remainingMessages)) {
      const nowIso = new Date().toISOString();
      const lastMsg = remainingMessages.length > 0 ? remainingMessages[remainingMessages.length - 1] : null;
      const parentUpdate: any = {
        updatedAt: nowIso,
        messages: remainingMessages,
        lastMessage: lastMsg ? (lastMsg.message || (lastMsg.images && lastMsg.images.length > 0 ? 'Attached image' : '')) : '',
        lastSenderRole: lastMsg ? lastMsg.senderRole : '',
        lastSenderName: lastMsg ? lastMsg.senderName : ''
      };
      const parentWrites = idVariants.flatMap(variant => [
        setDoc(doc(db, 'support_tickets', variant), cleanUndefined(parentUpdate), { merge: true }).catch(() => null),
        setDoc(doc(db, 'chats', variant), cleanUndefined(parentUpdate), { merge: true }).catch(() => null)
      ]);
      await Promise.all(parentWrites);
    }
  } catch (err) {
    console.warn('deleteSupportMessageFromFirestore error:', err);
  }
}

/**
 * Permanently delete a support ticket and all its nested messages from Firestore
 */
export async function deleteSupportTicketFromFirestore(ticketId: string): Promise<void> {
  if (!ticketId) return;
  try {
    const canonicalId = getCanonicalTicketId(ticketId);
    const idVariants = getTicketIdVariants(canonicalId);

    const docDeletes = idVariants.flatMap(variant => [
      deleteDoc(doc(db, 'support_tickets', variant)).catch(() => null),
      deleteDoc(doc(db, 'chats', variant)).catch(() => null)
    ]);
    await Promise.all(docDeletes);

    const subcollectionDeletes = idVariants.flatMap(variant => [
      getDocs(collection(db, 'support_tickets', variant, 'messages')).then(snap => 
        Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => null)))
      ).catch(() => null),
      getDocs(collection(db, 'chats', variant, 'messages')).then(snap => 
        Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => null)))
      ).catch(() => null)
    ]);
    await Promise.all(subcollectionDeletes);

    const queryDeletes = idVariants.flatMap(variant => [
      getDocs(query(collection(db, 'support_messages'), where('ticketId', '==', variant))).then(snap =>
        Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => null)))
      ).catch(() => null),
      getDocs(query(collection(db, 'messages'), where('ticketId', '==', variant))).then(snap =>
        Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => null)))
      ).catch(() => null)
    ]);
    await Promise.all(queryDeletes);
  } catch (err) {
    console.warn('deleteSupportTicketFromFirestore error:', err);
  }
}

/**
 * Update support ticket metadata (status, priority, agent assignments)
 */
export async function updateSupportTicketInFirestore(
  ticketId: string, 
  updates: Partial<SupportTicket>
): Promise<void> {
  if (!ticketId) return;
  try {
    const canonicalId = getCanonicalTicketId(ticketId);
    const idVariants = getTicketIdVariants(canonicalId);
    const payload = cleanUndefined({
      ...updates,
      updatedAt: updates.updatedAt || new Date().toISOString()
    });

    const writes = idVariants.flatMap(variant => [
      setDoc(doc(db, 'support_tickets', variant), payload, { merge: true }),
      setDoc(doc(db, 'chats', variant), payload, { merge: true })
    ]);
    await Promise.all(writes);
  } catch (err) {
    console.warn('updateSupportTicketInFirestore error:', err);
  }
}

/**
 * Real-time bidirectional listener for a specific Support Ticket / Chat room
 */
export function subscribeSupportTicketFromFirestore(
  ticketId: string | undefined, 
  callback: (ticket: SupportTicket | null) => void
): () => void {
  if (!ticketId) return () => {};

  const unsubs: (() => void)[] = [];
  const canonicalId = getCanonicalTicketId(ticketId);
  const rawId = getRawTicketId(ticketId);
  const listenedVariants = Array.from(new Set([canonicalId, rawId])).filter(Boolean);

  const localTicket = dbStore.getSupportTickets(undefined, true).find(t => isSameTicketId(t.id, canonicalId));

  let currentTicket: SupportTicket = localTicket ? { ...localTicket } : {
    id: canonicalId,
    chatId: canonicalId,
    threadId: canonicalId,
    roomId: canonicalId,
    userId: '',
    userEmail: '',
    userName: 'Client',
    accountNumber: '',
    subject: 'Customer Support Consultation',
    category: 'General',
    status: 'Open',
    priority: 'Medium',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const msgMap = new Map<string, SupportMessage>();

  if (localTicket && Array.isArray(localTicket.messages)) {
    localTicket.messages.forEach(m => {
      if (m && m.id) msgMap.set(m.id, m);
    });
  }

  const emit = () => {
    const sorted = Array.from(msgMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    currentTicket = {
      ...currentTicket,
      messages: sorted
    };
    callback(currentTicket);
  };

  const processIncomingMsg = (rawMsg: any) => {
    if (!rawMsg) return;
    const norm = normalizeSupportMessage(rawMsg, currentTicket);
    if (!norm || !norm.id) return;
    const msgText = (norm.message || '').trim();
    const msgTime = new Date(norm.createdAt).getTime();

    for (const [k, v] of msgMap.entries()) {
      if (v.id && (v.id.startsWith('msg-opt-') || v.id.startsWith('msg-temp-'))) {
        if ((v.senderRole === norm.senderRole || v.senderId === norm.senderId) && (v.message || '').trim() === msgText) {
          const vTime = new Date(v.createdAt || 0).getTime();
          if (Math.abs(vTime - msgTime) < 120000) {
            msgMap.delete(k);
          }
        }
      }
    }
    msgMap.set(norm.id, norm);
  };

  try {
    listenedVariants.forEach(variant => {
      const uDoc1 = onSnapshot(doc(db, 'support_tickets', variant), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          currentTicket = mergeSupportTickets(currentTicket, normalizeSupportTicket(data, canonicalId));
          if (Array.isArray(data.messages)) {
            data.messages.forEach(processIncomingMsg);
          }
          emit();
        }
      }, (err) => console.warn(`Doc snapshot error (${variant}):`, err));
      unsubs.push(uDoc1);

      const uDoc2 = onSnapshot(doc(db, 'chats', variant), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          currentTicket = mergeSupportTickets(currentTicket, normalizeSupportTicket(data, canonicalId));
          if (Array.isArray(data.messages)) {
            data.messages.forEach(processIncomingMsg);
          }
          emit();
        }
      }, (err) => console.warn(`Chat doc snapshot error (${variant}):`, err));
      unsubs.push(uDoc2);

      const uSub1 = onSnapshot(collection(db, 'support_tickets', variant, 'messages'), (snap) => {
        snap.forEach((d) => {
          if (d.exists()) {
            processIncomingMsg({ ...d.data(), id: d.id, ticketId: canonicalId });
          }
        });
        emit();
      }, (err) => console.warn(`Subcollection 1 error (${variant}):`, err));
      unsubs.push(uSub1);

      const uSub2 = onSnapshot(collection(db, 'chats', variant, 'messages'), (snap) => {
        snap.forEach((d) => {
          if (d.exists()) {
            processIncomingMsg({ ...d.data(), id: d.id, ticketId: canonicalId });
          }
        });
        emit();
      }, (err) => console.warn(`Subcollection 2 error (${variant}):`, err));
      unsubs.push(uSub2);

      const qMsg1 = query(collection(db, 'support_messages'), where('ticketId', '==', variant));
      const uQ1 = onSnapshot(qMsg1, (snap) => {
        snap.forEach((d) => {
          if (d.exists()) {
            processIncomingMsg({ ...d.data(), id: d.id, ticketId: canonicalId });
          }
        });
        emit();
      }, (err) => console.warn(`Query support_messages error (${variant}):`, err));
      unsubs.push(uQ1);

      const qMsg2 = query(collection(db, 'messages'), where('ticketId', '==', variant));
      const uQ2 = onSnapshot(qMsg2, (snap) => {
        snap.forEach((d) => {
          if (d.exists()) {
            processIncomingMsg({ ...d.data(), id: d.id, ticketId: canonicalId });
          }
        });
        emit();
      }, (err) => console.warn(`Query messages error (${variant}):`, err));
      unsubs.push(uQ2);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  } catch (err) {
    console.warn('subscribeSupportTicketFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Subscribe to all support tickets in real-time across both support_tickets and chats collections
 */
export function subscribeAllSupportTicketsFromFirestore(callback: (tickets: SupportTicket[]) => void): () => void {
  const unsubs: (() => void)[] = [];
  const ticketMap = new Map<string, SupportTicket>();

  // Pre-seed ticketMap with all known local tickets from dbStore to prevent tickets from disappearing
  try {
    const localTickets = dbStore.getSupportTickets(undefined, true);
    if (Array.isArray(localTickets)) {
      localTickets.forEach(t => {
        if (t && t.id) {
          const canonical = getCanonicalTicketId(t.id);
          ticketMap.set(canonical, t);
        }
      });
    }
  } catch (e) {
    console.warn('Error pre-seeding ticketMap in subscribeAllSupportTicketsFromFirestore:', e);
  }

  const emit = () => {
    const list = Array.from(ticketMap.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    callback(list);
  };

  const processTicketDoc = (d: any) => {
    if (d && d.exists()) {
      const raw = d.data();
      const norm = normalizeSupportTicket(raw, d.id);
      const canonical = getCanonicalTicketId(norm.id || d.id);
      const existing = ticketMap.get(canonical);
      if (existing) {
        ticketMap.set(canonical, mergeSupportTickets(existing, norm));
      } else {
        ticketMap.set(canonical, norm);
      }
    }
  };

  const processMessageDoc = (d: any) => {
    if (d && d.exists()) {
      const raw = d.data();
      const normMsg = normalizeSupportMessage(raw, raw);
      const ticketId = raw.ticketId || raw.chatId || raw.threadId || raw.roomId || d.id;
      if (!ticketId) return;
      const canonical = getCanonicalTicketId(ticketId);
      const existing = ticketMap.get(canonical);
      if (existing) {
        const merged = mergeSupportTickets(existing, {
          ...existing,
          id: canonical,
          messages: [normMsg],
          updatedAt: normMsg.createdAt || existing.updatedAt
        });
        ticketMap.set(canonical, merged);
      } else {
        const localMatch = dbStore.getSupportTickets(undefined, true).find(t => isSameTicketId(t.id, canonical));
        const synthTicket = normalizeSupportTicket({
          id: canonical,
          chatId: canonical,
          userId: raw.userId || localMatch?.userId || (normMsg.senderRole !== 'admin' ? normMsg.senderId : ''),
          userEmail: raw.userEmail || localMatch?.userEmail || (normMsg.senderRole !== 'admin' && normMsg.senderId?.includes('@') ? normMsg.senderId : ''),
          userName: raw.userName || localMatch?.userName || (normMsg.senderRole !== 'admin' ? normMsg.senderName : 'Client'),
          accountNumber: raw.accountNumber || localMatch?.accountNumber,
          subject: raw.subject || localMatch?.subject || 'Customer Support Consultation',
          category: raw.category || localMatch?.category || 'General',
          status: raw.status || localMatch?.status || 'Open',
          priority: raw.priority || localMatch?.priority || 'Medium',
          messages: [normMsg],
          createdAt: normMsg.createdAt || new Date().toISOString(),
          updatedAt: normMsg.createdAt || new Date().toISOString()
        }, canonical);
        ticketMap.set(canonical, synthTicket);
      }
    }
  };

  try {
    const uTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      snap.forEach(processTicketDoc);
      emit();
    }, (err) => console.warn('All tickets snapshot error:', err));
    unsubs.push(uTickets);

    const uChats = onSnapshot(collection(db, 'chats'), (snap) => {
      snap.forEach(processTicketDoc);
      emit();
    }, (err) => console.warn('All chats snapshot error:', err));
    unsubs.push(uChats);

    const uSupportMsgs = onSnapshot(collection(db, 'support_messages'), (snap) => {
      snap.forEach(processMessageDoc);
      emit();
    }, (err) => console.warn('All support_messages snapshot error:', err));
    unsubs.push(uSupportMsgs);

    const uMsgs = onSnapshot(collection(db, 'messages'), (snap) => {
      snap.forEach(processMessageDoc);
      emit();
    }, (err) => console.warn('All messages snapshot error:', err));
    unsubs.push(uMsgs);

    return () => {
      unsubs.forEach(u => u());
    };
  } catch (err) {
    console.warn('subscribeAllSupportTicketsFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Fetch all support tickets once from Firestore
 */
export async function getAllSupportTicketsFromFirestore(): Promise<SupportTicket[]> {
  const ticketMap = new Map<string, SupportTicket>();

  const processTicketDoc = (d: any) => {
    if (d && d.exists()) {
      const raw = d.data();
      const norm = normalizeSupportTicket(raw, d.id);
      const canonical = getCanonicalTicketId(norm.id || d.id);
      const existing = ticketMap.get(canonical);
      if (existing) {
        ticketMap.set(canonical, mergeSupportTickets(existing, norm));
      } else {
        ticketMap.set(canonical, norm);
      }
    }
  };

  const processMessageDoc = (d: any) => {
    if (d && d.exists()) {
      const raw = d.data();
      const normMsg = normalizeSupportMessage(raw, raw);
      const ticketId = raw.ticketId || raw.chatId || raw.threadId || raw.roomId || d.id;
      if (!ticketId) return;
      const canonical = getCanonicalTicketId(ticketId);
      const existing = ticketMap.get(canonical);
      if (existing) {
        const merged = mergeSupportTickets(existing, {
          ...existing,
          id: canonical,
          messages: [normMsg],
          updatedAt: normMsg.createdAt || existing.updatedAt
        });
        ticketMap.set(canonical, merged);
      } else {
        const synthTicket = normalizeSupportTicket({
          id: canonical,
          chatId: canonical,
          userId: raw.userId || (normMsg.senderRole !== 'admin' ? normMsg.senderId : ''),
          userEmail: raw.userEmail || (normMsg.senderRole !== 'admin' && normMsg.senderId?.includes('@') ? normMsg.senderId : ''),
          userName: raw.userName || (normMsg.senderRole !== 'admin' ? normMsg.senderName : 'Client'),
          accountNumber: raw.accountNumber,
          subject: raw.subject || 'Customer Support Consultation',
          category: raw.category || 'General',
          status: raw.status || 'Open',
          priority: raw.priority || 'Medium',
          messages: [normMsg],
          createdAt: normMsg.createdAt || new Date().toISOString(),
          updatedAt: normMsg.createdAt || new Date().toISOString()
        }, canonical);
        ticketMap.set(canonical, synthTicket);
      }
    }
  };

  try {
    const [ticketsSnap, chatsSnap, supportMsgsSnap, msgsSnap] = await Promise.all([
      getDocs(collection(db, 'support_tickets')).catch(() => null),
      getDocs(collection(db, 'chats')).catch(() => null),
      getDocs(collection(db, 'support_messages')).catch(() => null),
      getDocs(collection(db, 'messages')).catch(() => null)
    ]);

    if (ticketsSnap) ticketsSnap.forEach(processTicketDoc);
    if (chatsSnap) chatsSnap.forEach(processTicketDoc);
    if (supportMsgsSnap) supportMsgsSnap.forEach(processMessageDoc);
    if (msgsSnap) msgsSnap.forEach(processMessageDoc);
  } catch (err) {
    console.warn('getAllSupportTicketsFromFirestore error:', err);
  }

  return Array.from(ticketMap.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

/**
 * Fetch filtered support tickets for a user or admin
 */
export async function getSupportTicketsFromFirestore(
  userIdentifier?: { id?: string; email?: string } | string,
  isAdmin?: boolean
): Promise<SupportTicket[]> {
  const allTickets = await getAllSupportTicketsFromFirestore();
  if (isAdmin || !userIdentifier) return allTickets;

  const targetId = typeof userIdentifier === 'string' ? userIdentifier.trim().toLowerCase() : (userIdentifier.id || '').trim().toLowerCase();
  const targetEmail = typeof userIdentifier === 'string' ? (userIdentifier.includes('@') ? userIdentifier.trim().toLowerCase() : '') : (userIdentifier.email || '').trim().toLowerCase();

  return allTickets.filter(t => {
    const tUserId = (t.userId || '').trim().toLowerCase();
    const tUserEmail = (t.userEmail || '').trim().toLowerCase();
    if (targetId && tUserId === targetId) return true;
    if (targetEmail && tUserEmail === targetEmail) return true;
    if (targetId && tUserEmail === targetId) return true;
    if (targetEmail && tUserId === targetEmail) return true;
    return false;
  });
}

/**
 * Subscribe to real-time Support Tickets with user/admin filtering
 */
export function subscribeSupportTicketsFromFirestore(
  userIdentifier: { id?: string; email?: string } | string | undefined,
  isAdmin: boolean,
  callback: (tickets: SupportTicket[]) => void
): () => void {
  return subscribeAllSupportTicketsFromFirestore((tickets) => {
    if (isAdmin || !userIdentifier) {
      callback(tickets);
      return;
    }
    const targetId = typeof userIdentifier === 'string' ? userIdentifier.trim().toLowerCase() : (userIdentifier?.id || '').trim().toLowerCase();
    const targetEmail = typeof userIdentifier === 'string' ? (userIdentifier.includes('@') ? userIdentifier.trim().toLowerCase() : '') : (userIdentifier?.email || '').trim().toLowerCase();

    const filtered = tickets.filter(t => {
      const tUserId = (t.userId || '').trim().toLowerCase();
      const tUserEmail = (t.userEmail || '').trim().toLowerCase();
      if (targetId && tUserId === targetId) return true;
      if (targetEmail && tUserEmail === targetEmail) return true;
      if (targetId && tUserEmail === targetId) return true;
      if (targetEmail && tUserId === targetEmail) return true;
      return false;
    });
    callback(filtered);
  });
}

/**
 * Real-time subscription to messages for a specific Ticket / Chat Room
 */
export function subscribeTicketMessagesFromFirestore(
  ticketId: string | undefined,
  callback: (messages: SupportMessage[]) => void
): () => void {
  if (!ticketId) return () => {};
  return subscribeSupportTicketFromFirestore(ticketId, (ticket) => {
    if (ticket && Array.isArray(ticket.messages)) {
      callback(ticket.messages);
    } else {
      callback([]);
    }
  });
}

/**
 * Proactively fetch all messages for a specific active Ticket / Chat Thread from Firestore
 */
export async function getTicketMessagesFromFirestore(ticketId: string): Promise<SupportMessage[]> {
  if (!ticketId) return [];
  const canonicalId = getCanonicalTicketId(ticketId);
  const rawId = getRawTicketId(ticketId);
  const msgMap = new Map<string, SupportMessage>();
  const listenedVariants = Array.from(new Set([canonicalId, rawId])).filter(Boolean);

  const processSnap = (snap: any) => {
    if (!snap) return;
    snap.forEach((d: any) => {
      if (d.exists()) {
        const raw = d.data();
        const norm = normalizeSupportMessage(raw, { id: canonicalId });
        if (norm && norm.id) {
          msgMap.set(norm.id, norm);
        }
      }
    });
  };

  const processDoc = (d: any) => {
    if (d && d.exists()) {
      const raw = d.data();
      const normTicket = normalizeSupportTicket(raw, canonicalId);
      if (Array.isArray(normTicket.messages)) {
        normTicket.messages.forEach(m => {
          if (m && m.id) msgMap.set(m.id, m);
        });
      }
    }
  };

  try {
    const fetchPromises = listenedVariants.flatMap((variant) => [
      getDocs(collection(db, 'support_tickets', variant, 'messages')).catch(() => null),
      getDocs(collection(db, 'chats', variant, 'messages')).catch(() => null),
      getDocs(query(collection(db, 'support_messages'), where('ticketId', '==', variant))).catch(() => null),
      getDocs(query(collection(db, 'messages'), where('ticketId', '==', variant))).catch(() => null),
      getDoc(doc(db, 'support_tickets', variant)).catch(() => null),
      getDoc(doc(db, 'chats', variant)).catch(() => null)
    ]);

    const results = await Promise.all(fetchPromises);
    results.forEach((res: any) => {
      if (!res) return;
      if (typeof res.forEach === 'function') {
        processSnap(res);
      } else {
        processDoc(res);
      }
    });
  } catch (err) {
    console.warn('getTicketMessagesFromFirestore error:', err);
  }

  return Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Subscribe to real-time Crypto Activation Deposits ($2,500 deposit for 4-digit code)
 */
export function subscribeCryptoDepositsFromFirestore(callback: (deposits: CryptoActivationDeposit[]) => void): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'crypto_activation_deposits'), (snap) => {
      const list: CryptoActivationDeposit[] = [];
      snap.forEach((d) => {
        if (d.exists()) list.push(d.data() as CryptoActivationDeposit);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (err) => console.warn('Crypto deposits snapshot error:', err));
    return unsub;
  } catch (err) {
    console.warn('subscribeCryptoDepositsFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Subscribe to real-time Tier 3 Verification Requests ($5,000 upgrade deposit)
 */
export function subscribeVerificationsFromFirestore(callback: (verifs: Tier3VerificationRequest[]) => void): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'tier3_verifications'), (snap) => {
      const list: Tier3VerificationRequest[] = [];
      snap.forEach((d) => {
        if (d.exists()) list.push(d.data() as Tier3VerificationRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (err) => console.warn('Verifications snapshot error:', err));
    return unsub;
  } catch (err) {
    console.warn('subscribeVerificationsFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Persist Email Delivery Audit Log to Firestore
 */
export async function syncEmailLogToFirestore(log: any): Promise<void> {
  if (!log || !log.id) return;
  try {
    const cleanLog = cleanUndefined({
      ...log,
      createdAt: log.timestamp || new Date().toISOString()
    });
    await setDoc(doc(db, 'email_delivery_logs', log.id), cleanLog, { merge: true });
  } catch (err) {
    console.warn('syncEmailLogToFirestore error:', err);
  }
}

/**
 * Retrieve all Email Delivery Logs from Firestore
 */
export async function getEmailLogsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'email_delivery_logs'));
    const logs: any[] = [];
    snap.forEach((d) => {
      if (d.exists()) logs.push(d.data());
    });
    return logs.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
  } catch (err) {
    console.warn('getEmailLogsFromFirestore error:', err);
    return [];
  }
}

/**
 * Subscribe to real-time Email Delivery Audit Logs from Firestore
 */
export function subscribeEmailLogsFromFirestore(callback: (logs: any[]) => void): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'email_delivery_logs'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        if (d.exists()) list.push(d.data());
      });
      list.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
      callback(list);
    }, (err) => console.warn('Email logs snapshot error:', err));
    return unsub;
  } catch (err) {
    console.warn('subscribeEmailLogsFromFirestore error:', err);
    return () => {};
  }
}

/**
 * Persist Email Provider Configuration in Firestore
 */
export async function syncEmailConfigToFirestore(config: any): Promise<void> {
  if (!config) return;
  try {
    const cleanConfig = cleanUndefined({
      ...config,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'system_settings', 'email_config'), cleanConfig, { merge: true });
  } catch (err) {
    console.warn('syncEmailConfigToFirestore error:', err);
  }
}

/**
 * Retrieve Email Provider Configuration from Firestore
 */
export async function getEmailConfigFromFirestore(): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'email_config'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('getEmailConfigFromFirestore error:', err);
    return null;
  }
}
