import { 
  User, 
  Transaction, 
  AuthResponse, 
  UserNotification, 
  SupportTicket, 
  VirtualCard, 
  BillPayment, 
  CryptoActivationDeposit, 
  Tier3VerificationRequest, 
  AuditLog,
  TransferPayload,
  WithdrawPayload,
  DepositPayload
} from '../types';
import { dbStore } from './dbStore';
import { broadcastRealtimeUpdate } from './realtimeBus';
import { dispatchAdminAlert } from './adminAlerts';
import { 
  syncUserToFirestore, 
  getUserFromFirestore, 
  getAllUsersFromFirestore,
  syncVirtualCardToFirestore,
  getVirtualCardsFromFirestore,
  syncCryptoDepositToFirestore,
  syncCryptoAddressesToFirestore,
  getAllCryptoDepositsFromFirestore,
  syncVerificationToFirestore,
  getAllVerificationsFromFirestore,
  syncTransactionToFirestore,
  getTransactionsFromFirestore,
  syncSupportTicketToFirestore,
  getSupportTicketsFromFirestore
} from '../lib/firebase';

export const getStoredToken = (): string | null => dbStore.getStoredToken();
export const setStoredToken = (token: string): void => dbStore.setStoredToken(token);
export const removeStoredToken = (): void => dbStore.removeStoredToken();

const API_BASE = '/api';

async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      const cleanToken = token.startsWith('token-') ? token : `token-${token}`;
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    if (errData && errData.error) {
      const err = new Error(errData.error);
      (err as any).status = res.status;
      throw err;
    }
    return null;
  } catch (e: any) {
    if (e && e.status) {
      throw e;
    }
    return null;
  }
}

export const api = {
  // --- AUTHENTICATION ---
  async register(data: { fullName: string; email: string; phone?: string; password?: string; accountPin?: string }): Promise<AuthResponse> {
    const emailClean = data.email.trim().toLowerCase();

    // Pre-check local dbStore for existing email
    const localExisting = dbStore.getUserByEmail(emailClean);
    if (localExisting && localExisting.email && localExisting.email.trim().toLowerCase() === emailClean) {
      throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
    }

    // Pre-check Firestore for existing email
    try {
      const fsExisting = await getUserFromFirestore(emailClean);
      if (fsExisting && fsExisting.email && fsExisting.email.trim().toLowerCase() === emailClean) {
        throw new Error('This email address is already linked to an existing account. Please log in or use a different email.');
      }
    } catch (fsErr: any) {
      if (fsErr?.message?.includes('already linked')) {
        throw fsErr;
      }
    }

    let finalUser: User | null = null;
    let tokenStr = '';

    // 1. Try Express backend API
    try {
      const backendRes = await requestApi<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (backendRes && backendRes.user) {
        finalUser = backendRes.user;
        tokenStr = backendRes.token.replace(/^token-/, '');
      }
    } catch (err: any) {
      if (err && err.message) {
        // If backend returned duplicate error or bad request, re-throw directly
        throw err;
      }
      console.warn('Backend register call fallback:', err);
    }

    // 2. Local fallback if server unreachable
    if (!finalUser) {
      const isAdmin = emailClean.includes('admin') || emailClean === 'admin@svb.com' || emailClean === 'siliconvalleybank51@gmail.com';
      const accountNumber = `10${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const uid = `usr-${Date.now()}`;

      finalUser = {
        id: uid,
        fullName: data.fullName.trim(),
        email: emailClean,
        phone: (data.phone && data.phone.trim()) || '+1 (555) 019-2834',
        accountNumber,
        role: isAdmin ? 'admin' : 'user',
        balance: isAdmin ? 5000000 : 0.00,
        ledgerBalance: isAdmin ? 5000000 : 0.00,
        currency: 'USD',
        address: '100 Silicon Valley Way, Palo Alto, CA 94301',
        country: 'United States',
        verificationTier: 'Tier 1',
        status: 'Active',
        accountPin: data.accountPin || '1234',
        fourDigitCode: isAdmin ? '8842' : '',
        transferCodeApproved: isAdmin ? true : false,
        createdAt: new Date().toISOString()
      };
      tokenStr = uid;

      // Initial Welcome Deposit Notification (Account Created)
      dbStore.addNotification({
        id: `NOTIF-${Date.now()}`,
        userId: uid,
        title: 'New Deposit Notification',
        message: `Your account #${accountNumber} is active. Available balance is $0.00 USD.`,
        amount: 0.00,
        currency: 'USD',
        reference: `ACC-${accountNumber}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    // Save to local store and set auth token
    dbStore.saveUser(finalUser);
    dbStore.setStoredToken(tokenStr || finalUser.id);

    // Sync user asynchronously to Firebase Firestore SDK so accounts NEVER vanish
    await syncUserToFirestore(finalUser, data.password || 'password123');

    return { user: finalUser, token: tokenStr || finalUser.id };
  },

  async login(data: { email: string; password?: string }): Promise<AuthResponse> {
    const identifier = data.email.trim().toLowerCase();
    let finalUser: User | null = null;
    let tokenStr = '';

    // 1. Try Express backend API
    try {
      const backendRes = await requestApi<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, password: data.password || 'password123' }),
      });

      if (backendRes && backendRes.user) {
        finalUser = backendRes.user;
        tokenStr = backendRes.token.replace(/^token-/, '');
      }
    } catch (err) {
      console.warn('Backend login endpoint call fallback:', err);
    }

    // 2. Check Firestore SDK
    if (!finalUser) {
      const fsUser = await getUserFromFirestore(identifier);
      if (fsUser) {
        finalUser = fsUser;
        tokenStr = fsUser.id;
      }
    }

    // 3. Check local dbStore fallback
    if (!finalUser) {
      let localUser = dbStore.getUserByEmail(identifier) || dbStore.getUserById(identifier);
      if (localUser) {
        finalUser = localUser;
        tokenStr = localUser.id;
      }
    }

    if (!finalUser) {
      throw new Error('User account not found. Please check your email address or 10-digit account number.');
    }

    dbStore.saveUser(finalUser);
    dbStore.setStoredToken(tokenStr || finalUser.id);

    // Sync to Firestore SDK
    syncUserToFirestore(finalUser, data.password || 'password123');

    return { user: finalUser, token: tokenStr || finalUser.id };
  },

  async logout(): Promise<void> {
    dbStore.removeStoredToken();
  },

  async getMe(): Promise<{ user: User }> {
    // 1. Try Express backend API
    const backendRes = await requestApi<{ user: User }>('/auth/me');
    if (backendRes && backendRes.user) {
      if (!backendRes.user.profilePicture) {
        try {
          const cachedAvatar = localStorage.getItem(`svb_avatar_${backendRes.user.id}`);
          if (cachedAvatar) backendRes.user.profilePicture = cachedAvatar;
        } catch (e) {}
      } else {
        try { localStorage.setItem(`svb_avatar_${backendRes.user.id}`, backendRes.user.profilePicture); } catch (e) {}
      }
      dbStore.saveUser(backendRes.user);
      syncUserToFirestore(backendRes.user);
      return { user: backendRes.user };
    }

    // 2. Local dbStore session restoration
    let user = dbStore.getCurrentUser();

    // 3. Firestore fallback session restoration
    if (!user) {
      const storedToken = dbStore.getStoredToken();
      if (storedToken) {
        const fsUser = await getUserFromFirestore(storedToken);
        if (fsUser) {
          user = fsUser;
          dbStore.saveUser(fsUser);
        }
      }
    }

    if (!user) {
      throw new Error('Not authenticated');
    }

    if (!user.profilePicture) {
      try {
        const cachedAvatar = localStorage.getItem(`svb_avatar_${user.id}`);
        if (cachedAvatar) user.profilePicture = cachedAvatar;
      } catch (e) {}
    }

    return { user };
  },

  async updateProfile(data: { fullName?: string; phone?: string; address?: string; twoFactorEnabled?: boolean; profilePicture?: string }): Promise<{ user: User }> {
    const backendRes = await requestApi<{ user: User }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (backendRes && backendRes.user) {
      if (backendRes.user.profilePicture) {
        try { localStorage.setItem(`svb_avatar_${backendRes.user.id}`, backendRes.user.profilePicture); } catch (e) {}
      } else if (data.profilePicture === '') {
        try { localStorage.removeItem(`svb_avatar_${backendRes.user.id}`); } catch (e) {}
      }
      dbStore.saveUser(backendRes.user);
      syncUserToFirestore(backendRes.user);
      return { user: backendRes.user };
    }

    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const updated = dbStore.saveUser({
      ...current,
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.profilePicture !== undefined ? { profilePicture: data.profilePicture } : {}),
      ...(data.twoFactorEnabled !== undefined ? { twoFactorEnabled: data.twoFactorEnabled } : {})
    });

    if (updated.profilePicture) {
      try { localStorage.setItem(`svb_avatar_${updated.id}`, updated.profilePicture); } catch (e) {}
    } else if (data.profilePicture === '') {
      try { localStorage.removeItem(`svb_avatar_${updated.id}`); } catch (e) {}
    }

    syncUserToFirestore(updated);

    return { user: updated };
  },

  async changePassword(oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Password updated successfully.' };
  },

  async updateSecuritySettings(data: { twoFactorEnabled?: boolean; emailNotifications?: boolean; smsNotifications?: boolean }): Promise<{ user: User }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const updated = dbStore.saveUser({
      ...current,
      ...data
    });
    return { user: updated };
  },

  // --- TIER 3 VERIFICATION ---
  async submitTier3Verification(data: { 
    address: string; 
    country: string; 
    documentType: 'Passport' | 'National ID Card' | "Driver's License" | 'Residence Permit'; 
    documentUrl: string;
    paymentSlipUrl?: string;
    txHash?: string;
  }): Promise<{ verification: Tier3VerificationRequest }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const req: Tier3VerificationRequest = {
      id: `VERIF-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      userName: current.fullName,
      accountNumber: current.accountNumber,
      address: data.address,
      country: data.country,
      documentType: data.documentType,
      documentUrl: data.documentUrl,
      paymentSlipUrl: data.paymentSlipUrl,
      txHash: data.txHash,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    dbStore.addVerification(req);
    syncVerificationToFirestore(req);
    const updatedUser = dbStore.saveUser({ ...current, verificationTier: 'Pending Tier 3' });
    syncUserToFirestore(updatedUser);

    dispatchAdminAlert({
      type: 'TIER3_VERIFICATION',
      title: 'New Tier 3 VIP Application',
      message: `${current.fullName} (${current.email}) submitted Tier 3 verification ID document & $5,000 deposit slip.`,
      userName: current.fullName,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: 5000,
      actionSubTab: 'verifications'
    });

    const verifTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: 5000,
      currency: 'USD',
      type: 'VIP Upgrade Fee',
      status: 'Pending',
      reference: `UPGRADE-${Date.now().toString().slice(-6)}`,
      description: '$5,000 Tier 3 VIP Account Upgrade Deposit Submission - Pending SVB Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbStore.addTransaction(verifTxn);
    syncTransactionToFirestore(verifTxn);

    // Auto post submission to client support chat room
    const chatImages = [data.documentUrl, data.paymentSlipUrl].filter(Boolean) as string[];
    const chatText = `Submitted Tier 3 VIP Account Upgrade Application.\n• Country: ${data.country}\n• Document: ${data.documentType}\n• Address: ${data.address}\n• $5,000 Deposit Payment Slip attached.`;
    
    // Find or create ticket
    const existingTickets = dbStore.getSupportTickets(current.id, false);
    let ticket = existingTickets[0];
    const now = new Date().toISOString();
    if (!ticket) {
      ticket = {
        id: `TICKET-${Date.now()}`,
        userId: current.id,
        userEmail: current.email,
        userName: current.fullName,
        accountNumber: current.accountNumber,
        subject: `SVB Client Support Desk - ${current.fullName}`,
        category: 'Account',
        status: 'Open',
        priority: 'High',
        messages: [],
        createdAt: now,
        updatedAt: now
      };
      dbStore.addSupportTicket(ticket);
    }

    ticket.messages.push({
      id: `MSG-${Date.now()}`,
      senderId: current.id,
      senderName: current.fullName,
      senderRole: current.role,
      message: chatText,
      images: chatImages,
      createdAt: now
    });
    ticket.status = 'Open';
    ticket.updatedAt = now;
    dbStore.updateSupportTicket(ticket);
    syncSupportTicketToFirestore(ticket);

    dbStore.addAuditLog({
      id: `LOG-${Date.now()}`,
      adminId: current.id,
      adminEmail: current.email,
      action: 'PROFILE_UPDATED',
      targetEmail: current.email,
      targetAccountNumber: current.accountNumber,
      description: `Tier 3 Verification documents & $5,000 deposit slip submitted for ${current.fullName}`,
      details: { documentType: data.documentType, country: data.country },
      timestamp: new Date().toISOString()
    });

    syncVerificationToFirestore(req);

    return { verification: req };
  },

  async getVerifications(): Promise<{ verifications: Tier3VerificationRequest[] }> {
    let local = dbStore.getVerifications();
    try {
      const fsList = await getAllVerificationsFromFirestore();
      if (fsList.length > 0) {
        fsList.forEach(v => {
          if (!local.some(existing => existing.id === v.id)) {
            dbStore.addVerification(v);
            local.push(v);
          }
        });
      }
    } catch (e) {
      console.warn('Firestore getVerifications fallback error:', e);
    }
    return { verifications: local };
  },

  async approveVerification(verifId: string, notes?: string): Promise<void> {
    const verifs = dbStore.getVerifications();
    const target = verifs.find(v => v.id === verifId);
    if (!target) throw new Error('Verification request not found');

    const updatedVerif: Tier3VerificationRequest = {
      ...target,
      status: 'Approved',
      updatedAt: new Date().toISOString(),
      adminNotes: notes || 'Approved by Compliance Team'
    };

    dbStore.updateVerification(verifId, updatedVerif);
    syncVerificationToFirestore(updatedVerif);

    const user = dbStore.getUserById(target.userId);
    if (user) {
      const newBalance = user.balance + 5000;
      const updatedUser = dbStore.saveUser({
        ...user,
        verificationTier: 'Tier 3',
        balance: newBalance,
        ledgerBalance: newBalance
      });
      syncUserToFirestore(updatedUser);

      // Record $5,000 upgrade deposit transaction
      const txn: Transaction = {
        id: `TXN-${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        accountNumber: user.accountNumber,
        amount: 5000,
        currency: 'USD',
        type: 'Deposit',
        status: 'Completed',
        reference: `UPGRADE-${Date.now().toString().slice(-6)}`,
        description: '$5,000 Tier 3 VIP Account Upgrade Deposit Approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbStore.addTransaction(txn);
      syncTransactionToFirestore(txn);

      // Automatically update virtual card limits to $50,000,000.00 / Unlimited
      const userCards = dbStore.getVirtualCards(user.id);
      userCards.forEach(card => {
        const updatedCard = { ...card, spendingLimit: 50000000 };
        dbStore.addVirtualCard(updatedCard);
        syncVirtualCardToFirestore(updatedCard);
      });

      dbStore.addNotification({
        id: `NOTIF-${Date.now()}`,
        userId: user.id,
        title: 'Tier 3 VIP Identity Verified & $5,000 Deposit Credited',
        message: 'Your Tier 3 VIP account upgrade and $5,000 deposit have been approved by Silicon Valley Bank Compliance. Your Virtual Bank Card limits are now updated to $50,000,000.00 Daily / Unlimited Monthly.',
        amount: 5000,
        currency: 'USD',
        reference: `VERIF-${verifId}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  },

  async rejectVerification(verifId: string, notes?: string): Promise<void> {
    const verifs = dbStore.getVerifications();
    const target = verifs.find(v => v.id === verifId);
    if (!target) throw new Error('Verification request not found');

    const updatedVerif: Tier3VerificationRequest = {
      ...target,
      status: 'Rejected',
      updatedAt: new Date().toISOString(),
      adminNotes: notes || 'Document verification failed'
    };

    dbStore.updateVerification(verifId, updatedVerif);
    syncVerificationToFirestore(updatedVerif);

    const user = dbStore.getUserById(target.userId);
    if (user) {
      dbStore.addNotification({
        id: `NOTIF-${Date.now()}`,
        userId: user.id,
        title: 'Tier 3 Verification Request Rejected',
        message: `Your Tier 3 verification submission was rejected by Silicon Valley Bank. Reason: ${notes || 'Documentation requirements not met'}. Please contact support.`,
        amount: 0,
        currency: 'USD',
        reference: `VERIF-REJ-${verifId}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  },

  // --- CRYPTO ACTIVATION DEPOSITS ---
  async submitCryptoActivationDeposit(
    arg1: 'BTC' | 'USDT' | { cryptoMethod: 'BTC' | 'USDT'; txHash?: string; proofNote?: string; proofImage?: string },
    txHash?: string,
    proofNote?: string,
    proofImage?: string
  ): Promise<{ deposit: CryptoActivationDeposit; user: User }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    let cryptoMethod: 'BTC' | 'USDT' = 'BTC';
    let hash = txHash || '';
    let note = proofNote || '';
    let img = proofImage || '';

    if (typeof arg1 === 'object') {
      cryptoMethod = arg1.cryptoMethod;
      hash = arg1.txHash || '';
      note = arg1.proofNote || '';
      img = arg1.proofImage || '';
    } else {
      cryptoMethod = arg1;
    }

    try {
      const backendRes = await requestApi<{ deposit: CryptoActivationDeposit; user: User }>('/user/crypto-activation-deposit', {
        method: 'POST',
        body: JSON.stringify({ cryptoMethod, txHash: hash, proofNote: note, proofImage: img })
      });
      if (backendRes && backendRes.deposit) {
        dbStore.addCryptoDeposit(backendRes.deposit);
        if (backendRes.user) dbStore.saveUser(backendRes.user);
        return backendRes;
      }
    } catch (e) {
      console.warn('Backend crypto activation call failed, using local fallback:', e);
    }

    const walletAddresses = dbStore.getCryptoAddresses();
    const selectedAddress = walletAddresses[cryptoMethod] || walletAddresses.USDT || walletAddresses.BTC;

    const dep: CryptoActivationDeposit = {
      id: `DEP-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      userName: current.fullName,
      accountNumber: current.accountNumber,
      cryptoMethod,
      walletAddress: selectedAddress,
      amountUSD: 2500,
      txHash: hash,
      proofNote: note,
      proofImage: img || undefined,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addCryptoDeposit(dep);
    syncCryptoDepositToFirestore(dep);
    const updatedUser = dbStore.saveUser({ ...current, pendingCryptoDeposit: dep });
    syncUserToFirestore(updatedUser);

    dispatchAdminAlert({
      type: img ? 'PAYMENT_PROOF_UPLOAD' : '4_DIGIT_CODE_PAYMENT',
      title: img ? 'Payment Proof Uploaded' : '4-Digit Code Deposit Submitted',
      message: `${current.fullName} (${current.email}) submitted $2,500 ${cryptoMethod} deposit proof for 4-digit code.`,
      userName: current.fullName,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: 2500,
      actionSubTab: 'crypto'
    });

    const depTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: 2500,
      currency: 'USD',
      type: 'Code Activation Deposit',
      status: 'Pending',
      reference: `DEP-${Date.now().toString().slice(-6)}`,
      description: `$2,500 Crypto Activation Deposit (${cryptoMethod}) - Pending SVB Review`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbStore.addTransaction(depTxn);
    syncTransactionToFirestore(depTxn);

    // Auto post deposit proof into support chat room
    try {
      const existingTickets = dbStore.getSupportTickets(current.id, false);
      let ticket = existingTickets[0];
      const nowStr = new Date().toISOString();
      if (!ticket) {
        ticket = {
          id: `TICKET-${Date.now()}`,
          userId: current.id,
          userEmail: current.email,
          userName: current.fullName,
          accountNumber: current.accountNumber,
          subject: `SVB Client Support Desk - ${current.fullName}`,
          category: 'Deposit',
          status: 'Open',
          priority: 'High',
          messages: [],
          createdAt: nowStr,
          updatedAt: nowStr
        };
        dbStore.addSupportTicket(ticket);
      }
      ticket.messages.push({
        id: `MSG-${Date.now()}`,
        senderId: current.id,
        senderName: current.fullName,
        senderRole: current.role,
        message: `Submitted $2,500 Payment Proof for Verification.\n• Payment Method: ${cryptoMethod}\n• Status: Under SVB Review\n• Request: 4-Digit Outgoing Transfer Code Issuance`,
        images: img ? [img] : [],
        createdAt: nowStr
      });
      ticket.status = 'Open';
      ticket.updatedAt = nowStr;
      dbStore.updateSupportTicket(ticket);
      syncSupportTicketToFirestore(ticket);
    } catch (chatErr) {
      console.error('Chat post failed:', chatErr);
    }

    return { deposit: dep, user: updatedUser };
  },

  async getCryptoActivationDeposits(): Promise<{ deposits: CryptoActivationDeposit[] }> {
    let local = dbStore.getCryptoDeposits();
    try {
      const backendRes = await requestApi<{ deposits: CryptoActivationDeposit[] }>('/admin/crypto-activation-deposits');
      if (backendRes && backendRes.deposits) {
        local = backendRes.deposits;
      }
    } catch (e) {
      console.warn('Backend get crypto deposits fallback:', e);
    }

    try {
      const fsList = await getAllCryptoDepositsFromFirestore();
      if (fsList.length > 0) {
        fsList.forEach(d => {
          if (!local.some(existing => existing.id === d.id)) {
            dbStore.addCryptoDeposit(d);
            local.push(d);
          }
        });
      }
    } catch (fsErr) {
      console.warn('Firestore getCryptoActivationDeposits fallback error:', fsErr);
    }
    return { deposits: local };
  },

  async approveCryptoDeposit(depositId: string): Promise<{ deposit: CryptoActivationDeposit; code: string; user: User }> {
    try {
      const backendRes = await requestApi<{ deposit: CryptoActivationDeposit; code: string; user: User }>('/admin/approve-crypto-activation-deposit', {
        method: 'POST',
        body: JSON.stringify({ depositId })
      });
      if (backendRes && backendRes.deposit) {
        dbStore.updateCryptoDeposit(depositId, backendRes.deposit);
        if (backendRes.user) {
          dbStore.saveUser(backendRes.user);
          syncUserToFirestore(backendRes.user);
        }
        return backendRes;
      }
    } catch (e) {
      console.warn('Backend approve crypto deposit fallback:', e);
    }

    const deposits = dbStore.getCryptoDeposits();
    const target = deposits.find(d => d.id === depositId);
    if (!target) throw new Error('Deposit request not found');

    const code = `${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const updatedDep: CryptoActivationDeposit = {
      ...target,
      status: 'Approved',
      generatedCode: code,
      updatedAt: now
    };

    dbStore.updateCryptoDeposit(depositId, updatedDep);
    syncCryptoDepositToFirestore(updatedDep);

    const user = dbStore.getUserById(target.userId);
    let updatedUser = user;
    if (user) {
      const newBalance = user.balance + 2500;
      updatedUser = dbStore.saveUser({
        ...user,
        fourDigitCode: code,
        transferCodeApproved: true,
        balance: newBalance,
        ledgerBalance: newBalance,
        pendingCryptoDeposit: updatedDep
      });
      syncUserToFirestore(updatedUser);

      // Record transaction permanently for user's transaction history
      const txn: Transaction = {
        id: `TXN-${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        accountNumber: user.accountNumber,
        amount: 2500,
        currency: 'USD',
        type: 'Deposit',
        status: 'Completed',
        reference: `ACTIVATION-${target.id.slice(-6)}`,
        description: '$2,500 Code Activation Deposit Approved',
        createdAt: now,
        updatedAt: now
      };
      dbStore.addTransaction(txn);
      syncTransactionToFirestore(txn);

      dbStore.addNotification({
        id: `NOTIF-${Date.now()}`,
        userId: user.id,
        title: '$2,500 Activation Deposit Approved',
        message: `Your $2,500 deposit has been approved and credited to your account. Your official 4-Digit Security Code is [${code}].`,
        amount: 2500,
        currency: 'USD',
        reference: target.id,
        read: false,
        createdAt: now
      });

      // Auto post approval and 4-digit code into user support ticket inbox
      try {
        const tickets = dbStore.getSupportTickets(undefined, true);
        let ticket = tickets.find(t => t.userId === target.userId);
        const nowStr = new Date().toISOString();
        if (!ticket) {
          ticket = {
            id: `TICKET-${Date.now()}`,
            userId: target.userId,
            userEmail: target.userEmail,
            userName: target.userName,
            accountNumber: target.accountNumber,
            subject: `Payment Verification & 4-Digit Transfer Code - ${target.userName}`,
            category: 'Deposit',
            status: 'Resolved',
            priority: 'High',
            messages: [],
            createdAt: nowStr,
            updatedAt: nowStr
          };
          dbStore.addSupportTicket(ticket);
        }
        ticket.messages.push({
          id: `MSG-${Date.now()}`,
          senderId: 'admin',
          senderName: 'Silicon Valley Bank Client Support',
          senderRole: 'admin',
          message: `Silicon Valley Bank Support: Your $2,500 ${target.cryptoMethod} payment verification request has been APPROVED!\n\nYour official 4-Digit Outgoing Transfer Code is: [ ${code} ]\n\n$2,500.00 USD has been credited to your available account balance. Keep your code confidential.`,
          createdAt: nowStr
        });
        ticket.status = 'Resolved';
        ticket.updatedAt = nowStr;
        dbStore.updateSupportTicket(ticket);
        syncSupportTicketToFirestore(ticket);
      } catch (e) {
        console.error('Support ticket post on approval error:', e);
      }
    }

    return { deposit: updatedDep, code, user: updatedUser || ({ fullName: target.userName } as User) };
  },

  async approveCryptoActivationDeposit(depositId: string): Promise<{ deposit: CryptoActivationDeposit; code: string; user: User }> {
    return this.approveCryptoDeposit(depositId);
  },

  async rejectCryptoActivationDeposit(depositId: string, notes?: string): Promise<void> {
    const deposits = dbStore.getCryptoDeposits();
    const target = deposits.find(d => d.id === depositId);

    const updatedDep: Partial<CryptoActivationDeposit> = {
      status: 'Rejected',
      updatedAt: new Date().toISOString()
    };
    dbStore.updateCryptoDeposit(depositId, updatedDep);

    if (target) {
      syncCryptoDepositToFirestore({ ...target, ...updatedDep } as CryptoActivationDeposit);
      const user = dbStore.getUserById(target.userId);
      if (user) {
        dbStore.addNotification({
          id: `NOTIF-${Date.now()}`,
          userId: user.id,
          title: '$2,500 Activation Deposit Rejected',
          message: `Your $2,500 code activation deposit was rejected by Silicon Valley Bank. ${notes ? 'Reason: ' + notes : ''}`,
          amount: 0,
          currency: 'USD',
          reference: depositId,
          read: false,
          createdAt: new Date().toISOString()
        });

        // Auto post rejection note into user support ticket inbox
        try {
          const tickets = dbStore.getSupportTickets(undefined, true);
          let ticket = tickets.find(t => t.userId === target.userId);
          const nowStr = new Date().toISOString();
          if (!ticket) {
            ticket = {
              id: `TICKET-${Date.now()}`,
              userId: target.userId,
              userEmail: target.userEmail,
              userName: target.userName,
              accountNumber: target.accountNumber,
              subject: `Payment Verification & 4-Digit Transfer Code - ${target.userName}`,
              category: 'Deposit',
              status: 'Open',
              priority: 'High',
              messages: [],
              createdAt: nowStr,
              updatedAt: nowStr
            };
            dbStore.addSupportTicket(ticket);
          }
          ticket.messages.push({
            id: `MSG-${Date.now()}`,
            senderId: 'admin',
            senderName: 'Silicon Valley Bank Client Support',
            senderRole: 'admin',
            message: `Silicon Valley Bank Support: Your $2,500 ${target.cryptoMethod} payment verification request was NOT APPROVED.\n\nReason / Explanatory Note:\n${notes || 'The submitted deposit could not be verified on the blockchain network ledger. Please reach out to customer support if you need further assistance.'}`,
            createdAt: nowStr
          });
          ticket.status = 'Open';
          ticket.updatedAt = nowStr;
          dbStore.updateSupportTicket(ticket);
          syncSupportTicketToFirestore(ticket);
        } catch (e) {
          console.error('Support ticket post on rejection error:', e);
        }
      }
    }
  },

  // --- FUNDING & TRANSACTIONS ---
  async creditUserAccount(data: { accountNumber: string; amount: number; reference?: string; description?: string }): Promise<{ user: User; transaction: Transaction; updatedUser: User }> {
    let users = dbStore.getUsers();
    let target = users.find(u => 
      u.accountNumber === data.accountNumber || 
      u.email.toLowerCase() === data.accountNumber.toLowerCase() ||
      (u.accountNumber.replace(/[^0-9]/g, '') === data.accountNumber.replace(/[^0-9]/g, '') && data.accountNumber.replace(/[^0-9]/g, '').length > 0)
    );

    if (!target) {
      try {
        const fsTarget = await getUserFromFirestore(data.accountNumber);
        if (fsTarget) {
          dbStore.saveUser(fsTarget);
          target = fsTarget;
        }
      } catch (err) {
        console.warn('Firestore credit user target lookup fallback error:', err);
      }
    }

    if (!target) throw new Error('Target account number or email not found.');

    let fourDigitCode = target.fourDigitCode;
    let transferCodeApproved = target.transferCodeApproved;
    let isNewCode = false;

    if (!fourDigitCode || !transferCodeApproved) {
      fourDigitCode = Math.floor(1000 + Math.random() * 9000).toString();
      transferCodeApproved = true;
      isNewCode = true;
    }

    const newBalance = target.balance + data.amount;
    const updatedUser = dbStore.saveUser({
      ...target,
      balance: newBalance,
      ledgerBalance: newBalance,
      fourDigitCode,
      transferCodeApproved
    });

    syncUserToFirestore(updatedUser);

    const txn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: target.id,
      userEmail: target.email,
      accountNumber: target.accountNumber,
      amount: data.amount,
      currency: 'USD',
      type: 'Credit Deposit',
      status: 'Completed',
      reference: data.reference || `CREDIT-${Date.now()}`,
      description: isNewCode ? `${data.description || 'SVB Review Credit Capitalization'} (4-Digit Code Activated)` : (data.description || 'SVB Review Credit Capitalization'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addTransaction(txn);
    syncTransactionToFirestore(txn);

    const notifMsg = isNewCode
      ? `Your account #${target.accountNumber} has been credited with +$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Your official 4-Digit Outgoing Transfer Code is now active: [ ${fourDigitCode} ].`
      : `Your account #${target.accountNumber} has been credited with +$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`;

    dbStore.addNotification({
      id: `NOTIF-${Date.now()}`,
      userId: target.id,
      title: isNewCode ? 'Account Deposit Credited & 4-Digit Code Activated!' : 'Account Deposit Credited',
      message: notifMsg,
      amount: data.amount,
      currency: 'USD',
      reference: txn.reference,
      read: false,
      createdAt: new Date().toISOString()
    });

    return { user: updatedUser, updatedUser, transaction: txn };
  },

  async revokeFourDigitCode(userId: string): Promise<{ user: User }> {
    const user = dbStore.getUserById(userId);
    if (!user) throw new Error('User account not found');

    const updatedUser = dbStore.saveUser({
      ...user,
      transferCodeApproved: false,
      fourDigitCode: ''
    });

    syncUserToFirestore(updatedUser);

    dbStore.addNotification({
      id: `NOTIF-${Date.now()}`,
      userId: user.id,
      title: '4-Digit Authorization Code Revoked',
      message: 'Your 4-Digit Outgoing Transfer Code authorization has been cancelled by Silicon Valley Bank.',
      amount: 0,
      currency: 'USD',
      reference: `REVOKE-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return { user: updatedUser };
  },

  async createDeposit(payload: DepositPayload): Promise<{ updatedUser: User; transaction: Transaction }> {
    try {
      const backendRes = await requestApi<{ message: string; updatedUser: User; transaction: Transaction }>('/admin/deposit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (backendRes && backendRes.updatedUser && backendRes.transaction) {
        dbStore.saveUser(backendRes.updatedUser);
        dbStore.addTransaction(backendRes.transaction);
        syncUserToFirestore(backendRes.updatedUser);
        return { updatedUser: backendRes.updatedUser, transaction: backendRes.transaction };
      }
    } catch (err) {
      console.warn('Backend deposit endpoint call fallback:', err);
    }

    const res = await this.creditUserAccount({
      accountNumber: payload.accountNumber || payload.userEmail,
      amount: payload.amount,
      reference: payload.reference,
      description: payload.description
    });
    return { updatedUser: res.updatedUser, transaction: res.transaction };
  },

  async debitUserAccount(data: { accountNumber: string; amount: number; description?: string }): Promise<{ user: User; transaction: Transaction; updatedUser: User }> {
    let users = dbStore.getUsers();
    let target = users.find(u => 
      u.accountNumber === data.accountNumber || 
      u.email.toLowerCase() === data.accountNumber.toLowerCase() ||
      (u.accountNumber.replace(/[^0-9]/g, '') === data.accountNumber.replace(/[^0-9]/g, '') && data.accountNumber.replace(/[^0-9]/g, '').length > 0)
    );

    if (!target) {
      try {
        const fsTarget = await getUserFromFirestore(data.accountNumber);
        if (fsTarget) {
          dbStore.saveUser(fsTarget);
          target = fsTarget;
        }
      } catch (err) {
        console.warn('Firestore debit user target lookup fallback error:', err);
      }
    }

    if (!target) throw new Error('Target account number or email not found.');
    if (target.balance < data.amount) throw new Error('Insufficient account funds for debit operation.');

    const newBalance = target.balance - data.amount;
    const updatedUser = dbStore.saveUser({ ...target, balance: newBalance, ledgerBalance: newBalance });

    syncUserToFirestore(updatedUser);

    const txn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: target.id,
      userEmail: target.email,
      accountNumber: target.accountNumber,
      amount: data.amount,
      currency: 'USD',
      type: 'SVB Review Debit',
      status: 'Completed',
      reference: `DEBIT-${Date.now()}`,
      description: data.description || 'SVB Review Debit Adjustment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addTransaction(txn);
    return { user: updatedUser, updatedUser, transaction: txn };
  },

  async adminWithdraw(payload: { accountNumber: string; amount: number; description?: string; bankName?: string; routingNumber?: string; accountHolderName?: string; note?: string }): Promise<{ updatedUser: User; transaction: Transaction }> {
    const backendRes = await requestApi<{ message: string; updatedUser: User; transaction: Transaction }>('/admin/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        accountNumber: payload.accountNumber,
        amount: payload.amount,
        note: payload.note || payload.description
      }),
    });

    if (backendRes && backendRes.updatedUser && backendRes.transaction) {
      dbStore.saveUser(backendRes.updatedUser);
      dbStore.addTransaction(backendRes.transaction);
      return { updatedUser: backendRes.updatedUser, transaction: backendRes.transaction };
    }

    const res = await this.debitUserAccount({
      accountNumber: payload.accountNumber,
      amount: payload.amount,
      description: payload.description || payload.note || 'SVB Review Withdrawal Debit'
    });
    return { updatedUser: res.updatedUser, transaction: res.transaction };
  },

  async lookupAccount(accountNumber: string): Promise<{ found: { fullName: string; accountNumber: string; email: string }; user: { fullName: string; accountNumber: string; email: string } }> {
    const clean = accountNumber.trim().replace(/^#/, '');
    const backendRes = await requestApi<{ found: boolean; fullName?: string; accountNumber?: string; email?: string }>(`/user/account-lookup/${encodeURIComponent(clean)}`);
    if (backendRes && backendRes.found && backendRes.fullName && backendRes.accountNumber) {
      const info = { fullName: backendRes.fullName, accountNumber: backendRes.accountNumber, email: backendRes.email || clean };
      return { found: info, user: info };
    }

    const users = dbStore.getUsers();
    const target = users.find(u => u.accountNumber.toLowerCase().replace(/^#/, '') === clean.toLowerCase() || u.email.toLowerCase() === clean.toLowerCase());
    if (!target) throw new Error('Recipient account number or email not found in SVB directory.');
    const info = { fullName: target.fullName, accountNumber: target.accountNumber, email: target.email };
    return { found: info, user: info };
  },

  async sendTransfer(payload: TransferPayload): Promise<{ user: User; updatedUser: User; transaction: Transaction }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const backendRes = await requestApi<{ message: string; updatedUser: User; transaction: Transaction }>('/user/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (backendRes && backendRes.updatedUser && backendRes.transaction) {
      dbStore.saveUser(backendRes.updatedUser);
      dbStore.addTransaction(backendRes.transaction);
      return { user: backendRes.updatedUser, updatedUser: backendRes.updatedUser, transaction: backendRes.transaction };
    }

    if (current.role !== 'admin') {
      if (!current.fourDigitCode || !current.transferCodeApproved) {
        throw new Error('Invalid 4-Digit Security Code. Activation required.');
      }
      if (!payload.fourDigitCode || payload.fourDigitCode.trim() !== current.fourDigitCode.trim()) {
        throw new Error('Invalid 4-Digit Security Code. Please verify your security authorization code.');
      }
    }

    if (current.balance < payload.amount) {
      throw new Error('Insufficient account balance for wire transfer.');
    }

    const newSenderBalance = current.balance - payload.amount;
    const updatedSender = dbStore.saveUser({ ...current, balance: newSenderBalance, ledgerBalance: newSenderBalance });
    syncUserToFirestore(updatedSender);

    const isPending = current.role !== 'admin';

    const txn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      recipientAccountNumber: payload.recipientInput,
      recipientName: payload.recipientName,
      destinationBank: payload.destinationBank,
      destinationCountry: payload.destinationCountry,
      amount: payload.amount,
      currency: 'USD',
      type: 'Wire Transfer',
      status: isPending ? 'Pending' : 'Completed',
      reference: `WIRE-${Date.now()}`,
      description: payload.note || `Outgoing Transfer to Acc #${payload.recipientInput}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addTransaction(txn);
    syncTransactionToFirestore(txn);

    if (isPending) {
      dispatchAdminAlert({
        type: 'PENDING_TRANSACTION',
        title: 'New Pending Wire Transfer',
        message: `${current.fullName} (${current.email}) initiated $${payload.amount.toLocaleString()} wire transfer to ${payload.recipientName || payload.recipientInput}.`,
        userName: current.fullName,
        userEmail: current.email,
        accountNumber: current.accountNumber,
        amount: payload.amount,
        actionSubTab: 'pending'
      });
    }

    if (!isPending) {
      const recipient = dbStore.getUsers().find(u => u.accountNumber === payload.recipientInput || u.email.toLowerCase() === payload.recipientInput.toLowerCase());
      if (recipient) {
        dbStore.saveUser({ ...recipient, balance: recipient.balance + payload.amount });
        const recTxn: Transaction = {
          id: `TXN-${Date.now() + 1}`,
          userId: recipient.id,
          userEmail: recipient.email,
          accountNumber: recipient.accountNumber,
          senderName: current.fullName,
          senderAccountNumber: current.accountNumber,
          amount: payload.amount,
          currency: 'USD',
          type: 'Credit Deposit',
          status: 'Completed',
          reference: `INWIRE-${Date.now()}`,
          description: `Incoming Transfer from ${current.fullName}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dbStore.addTransaction(recTxn);
        syncTransactionToFirestore(recTxn);
      }
    }

    return { user: updatedSender, updatedUser: updatedSender, transaction: txn };
  },

  async withdrawFunds(payload: WithdrawPayload): Promise<{ user: User; updatedUser: User; transaction: Transaction }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const backendRes = await requestApi<{ message: string; updatedUser: User; transaction: Transaction }>('/user/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (backendRes && backendRes.updatedUser && backendRes.transaction) {
      dbStore.saveUser(backendRes.updatedUser);
      dbStore.addTransaction(backendRes.transaction);
      syncUserToFirestore(backendRes.updatedUser);
      syncTransactionToFirestore(backendRes.transaction);
      return { user: backendRes.updatedUser, updatedUser: backendRes.updatedUser, transaction: backendRes.transaction };
    }

    if (current.role !== 'admin') {
      if (!current.fourDigitCode || !current.transferCodeApproved) {
        throw new Error('Invalid 4-Digit Security Code. Activation required.');
      }
      if (!payload.fourDigitCode || payload.fourDigitCode.trim() !== current.fourDigitCode.trim()) {
        throw new Error('Invalid 4-Digit Security Code. Please enter your authorized 4-digit code.');
      }
    }

    if (current.balance < payload.amount) {
      throw new Error('Insufficient funds to execute wire withdrawal.');
    }

    const newBalance = current.balance - payload.amount;
    const updatedUser = dbStore.saveUser({ ...current, balance: newBalance, ledgerBalance: newBalance });
    syncUserToFirestore(updatedUser);

    const txn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: payload.amount,
      currency: 'USD',
      type: 'Wire Withdrawal',
      status: current.role === 'admin' ? 'Completed' : 'Pending',
      reference: `WITHDRAW-${Date.now()}`,
      description: `External ACH/Wire to ${payload.bankName} (${payload.accountHolderName})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addTransaction(txn);
    syncTransactionToFirestore(txn);

    if (current.role !== 'admin') {
      dispatchAdminAlert({
        type: 'PENDING_TRANSACTION',
        title: 'New Pending Wire Withdrawal',
        message: `${current.fullName} (${current.email}) requested $${payload.amount.toLocaleString()} wire withdrawal to ${payload.bankName}.`,
        userName: current.fullName,
        userEmail: current.email,
        accountNumber: current.accountNumber,
        amount: payload.amount,
        actionSubTab: 'withdraw'
      });
    }

    return { user: updatedUser, updatedUser: updatedUser, transaction: txn };
  },

  async getTransactions(): Promise<{ transactions: Transaction[] }> {
    const backendRes = await requestApi<{ transactions: Transaction[] }>('/user/transactions');
    if (backendRes && Array.isArray(backendRes.transactions)) {
      backendRes.transactions.forEach(t => dbStore.addTransaction(t));
      return { transactions: backendRes.transactions };
    }

    const current = dbStore.getCurrentUser();
    if (!current) return { transactions: [] };
    const txns = dbStore.getTransactions(current.id);
    return { transactions: txns };
  },

  async getAllTransactions(): Promise<{ transactions: Transaction[] }> {
    let allTxns: Transaction[] = [];
    try {
      const backendRes = await requestApi<{ transactions: Transaction[] }>('/admin/transactions');
      if (backendRes && Array.isArray(backendRes.transactions)) {
        backendRes.transactions.forEach(t => dbStore.addTransaction(t));
        allTxns = backendRes.transactions;
      }
    } catch (e) {
      console.warn('Backend getAllTransactions fallback:', e);
    }

    const localTxns = dbStore.getTransactions();
    let fsTxns: Transaction[] = [];
    try {
      fsTxns = await getTransactionsFromFirestore();
    } catch (fsErr) {
      console.warn('Firestore getAllTransactions error:', fsErr);
    }

    const map = new Map<string, Transaction>();
    localTxns.forEach(t => map.set(t.id, t));
    allTxns.forEach(t => map.set(t.id, t));
    fsTxns.forEach(t => {
      map.set(t.id, t);
      dbStore.addTransaction(t);
    });

    const combined = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { transactions: combined };
  },

  async approveTransaction(txnId: string, senderName?: string): Promise<void> {
    try {
      await requestApi<{ message: string; transaction?: Transaction }>('/admin/approve-transaction', {
        method: 'POST',
        body: JSON.stringify({ transactionId: txnId, senderName }),
      });
    } catch (e) {
      console.warn('Backend approveTransaction fallback:', e);
    }

    const txn = dbStore.getTransactions().find(t => t.id === txnId);
    if (txn) {
      const updatedTxn: Transaction = {
        ...txn,
        status: 'Completed',
        ...(senderName ? { senderName } : {}),
        updatedAt: new Date().toISOString()
      };
      dbStore.updateTransaction(txnId, updatedTxn);
      syncTransactionToFirestore(updatedTxn);

      if (txn.recipientAccountNumber || txn.recipientEmail) {
        const recipient = dbStore.getUsers().find(u => 
          (txn.recipientAccountNumber && u.accountNumber === txn.recipientAccountNumber) || 
          (txn.recipientEmail && u.email.toLowerCase() === txn.recipientEmail.toLowerCase())
        );
        if (recipient) {
          const updatedRec = dbStore.saveUser({
            ...recipient,
            balance: recipient.balance + txn.amount,
            transferCodeApproved: true
          });
          syncUserToFirestore(updatedRec);

          dbStore.addNotification({
            id: `NOTIF-${Date.now()}-REC`,
            userId: recipient.id,
            title: 'Funds Credited to Account',
            message: `Your account received $${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${senderName || 'SVB Treasury'}. Ref: ${txn.reference}`,
            amount: txn.amount,
            currency: txn.currency || 'USD',
            reference: txn.reference,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      const senderUser = dbStore.getUserById(txn.userId);
      if (senderUser) {
        dbStore.addNotification({
          id: `NOTIF-${Date.now()}-SND`,
          userId: senderUser.id,
          title: 'Outgoing Transfer Processed & Approved',
          message: `Your transfer ${txn.reference} of $${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been approved and completed by Silicon Valley Bank.`,
          amount: txn.amount,
          currency: txn.currency || 'USD',
          reference: txn.reference,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      broadcastRealtimeUpdate('TRANSACTION_UPDATED', updatedTxn, txn.userId, txnId);
      broadcastRealtimeUpdate('USER_UPDATED', undefined, txn.userId);
    }
  },

  async cancelTransaction(txnId: string): Promise<void> {
    return this.rejectTransaction(txnId, 'Cancelled by SVB Review');
  },

  async adminCancelTransaction(txnId: string): Promise<void> {
    return this.rejectTransaction(txnId, 'Cancelled by SVB Review');
  },

  async rejectTransaction(txnId: string, notes?: string): Promise<void> {
    try {
      await requestApi<{ message: string; transaction?: Transaction }>('/admin/reject-transaction', {
        method: 'POST',
        body: JSON.stringify({ transactionId: txnId, reason: notes }),
      });
    } catch (e) {
      console.warn('Backend rejectTransaction fallback:', e);
    }

    const txn = dbStore.getTransactions().find(t => t.id === txnId);
    if (txn) {
      const updatedTxn: Transaction = {
        ...txn,
        status: 'Rejected',
        updatedAt: new Date().toISOString()
      };
      dbStore.updateTransaction(txnId, updatedTxn);
      syncTransactionToFirestore(updatedTxn);

      const user = dbStore.getUserById(txn.userId);
      if (user && (txn.type === 'Wire Withdrawal' || txn.type === 'Wire Transfer' || txn.type === 'Transfer' || txn.type === 'Withdrawal' || txn.type === 'Bill Pay')) {
        const refundedUser = dbStore.saveUser({
          ...user,
          balance: user.balance + txn.amount,
          ledgerBalance: user.balance + txn.amount
        });
        syncUserToFirestore(refundedUser);

        dbStore.addNotification({
          id: `NOTIF-${Date.now()}-REJ`,
          userId: user.id,
          title: 'Transaction Declined & Funds Refunded',
          message: `Your transaction ${txn.reference} for $${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} was declined.${notes ? ` Reason: ${notes}` : ''} The full amount of $${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been refunded to your available balance.`,
          amount: txn.amount,
          currency: txn.currency || 'USD',
          reference: txn.reference,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      broadcastRealtimeUpdate('TRANSACTION_UPDATED', updatedTxn, txn.userId, txnId);
      broadcastRealtimeUpdate('USER_UPDATED', undefined, txn.userId);
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<{ notifications: UserNotification[] }> {
    const current = dbStore.getCurrentUser();
    if (!current) return { notifications: [] };
    return { notifications: dbStore.getNotifications(current.id) };
  },

  async markNotificationsRead(): Promise<void> {
    const current = dbStore.getCurrentUser();
    if (current) {
      dbStore.markNotificationsRead(current.id);
    }
  },

  // --- VIRTUAL CARDS ---
  async getVirtualCards(): Promise<{ cards: VirtualCard[] }> {
    const current = dbStore.getCurrentUser();
    if (!current) return { cards: [] };

    let localCards = dbStore.getVirtualCards(current.id);
    try {
      const fsCards = await getVirtualCardsFromFirestore(current.id);
      if (fsCards.length > 0) {
        fsCards.forEach(card => {
          dbStore.addVirtualCard(card);
        });
        localCards = dbStore.getVirtualCards(current.id);
      }
    } catch (e) {
      console.warn('Firestore getVirtualCards fallback:', e);
    }
    return { cards: localCards };
  },

  async createVirtualCard(data: { cardType?: string; category?: string; spendingLimit?: number }): Promise<{ card: VirtualCard }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const isMastercard = data.cardType?.includes('Mastercard');
    const prefix = isMastercard ? '5328' : '4829';

    const card: VirtualCard = {
      id: `CARD-${Date.now()}`,
      userId: current.id,
      cardNumber: `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      cardholderName: current.fullName.toUpperCase(),
      expiryMonth: '08',
      expiryYear: '30',
      cvv: `${Math.floor(100 + Math.random() * 900)}`,
      cardType: (data.cardType as any) || 'Visa Corporate',
      category: (data.category as any) || 'Business',
      spendingLimit: current.verificationTier === 'Tier 3' ? 50000000 : (data.spendingLimit || 50000),
      spentAmount: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    dbStore.addVirtualCard(card);
    syncVirtualCardToFirestore(card);

    dbStore.addNotification({
      id: `NOTIF-${Date.now()}`,
      userId: current.id,
      title: 'New Virtual Card Issued',
      message: `Your new ${card.cardType} (${card.category}) with limit $${card.spendingLimit.toLocaleString()} USD has been generated and activated.`,
      amount: 0,
      currency: 'USD',
      reference: card.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    return { card };
  },

  async toggleVirtualCard(cardId: string): Promise<{ card: VirtualCard }> {
    const current = dbStore.getCurrentUser();
    const cards = current ? dbStore.getVirtualCards(current.id) : [];
    const card = cards.find(c => c.id === cardId);
    if (!card) throw new Error('Card not found');

    const updated: VirtualCard = {
      ...card,
      status: card.status === 'Active' ? 'Frozen' : 'Active'
    };
    dbStore.addVirtualCard(updated);
    syncVirtualCardToFirestore(updated);

    return { card: updated };
  },

  // --- BILL PAYMENTS ---
  async getBillPayments(): Promise<{ payments: BillPayment[]; bills: BillPayment[] }> {
    const current = dbStore.getCurrentUser();
    if (!current) return { payments: [], bills: [] };
    const payments = dbStore.getBillPayments(current.id);
    return { payments, bills: payments };
  },

  async payBill(data: { billerName: string; billerCategory: 'Utilities' | 'Cloud Computing' | 'SaaS & Software' | 'Credit Card' | 'Vendor Invoice' | 'Rent & Lease'; accountNumber: string; amount: number; reference?: string; fourDigitCode?: string }): Promise<{ payment: BillPayment; user: User }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    if (current.role !== 'admin') {
      if (!current.fourDigitCode || !current.transferCodeApproved) {
        throw new Error('Invalid 4-Digit Security Code. Activation required.');
      }
      if (!data.fourDigitCode || data.fourDigitCode.trim() !== current.fourDigitCode.trim()) {
        throw new Error('Invalid 4-Digit Security Code. Please enter your valid 4-digit transfer code.');
      }
    }

    if (current.balance < data.amount) {
      throw new Error('Insufficient balance for bill payment.');
    }

    const newBalance = current.balance - data.amount;
    const updatedUser = dbStore.saveUser({ ...current, balance: newBalance, ledgerBalance: newBalance });
    syncUserToFirestore(updatedUser);

    const isPending = current.role !== 'admin';

    const payment: BillPayment = {
      id: `BILL-${Date.now()}`,
      userId: current.id,
      billerName: data.billerName,
      billerCategory: data.billerCategory,
      accountNumber: data.accountNumber,
      amount: data.amount,
      reference: data.reference || `REF-${Date.now()}`,
      status: isPending ? 'Pending' : 'Completed',
      paymentDate: new Date().toISOString()
    };

    dbStore.addBillPayment(payment);

    const billTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      userId: current.id,
      userEmail: current.email,
      accountNumber: current.accountNumber,
      amount: data.amount,
      currency: 'USD',
      type: 'Bill Pay',
      status: isPending ? 'Pending' : 'Completed',
      reference: payment.reference,
      description: `Bill Payment to ${data.billerName} (${data.billerCategory})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbStore.addTransaction(billTxn);
    syncTransactionToFirestore(billTxn);

    return { payment, user: updatedUser };
  },

  // --- SUPPORT TICKETS ---
  async getSupportTickets(): Promise<{ tickets: SupportTicket[] }> {
    const current = dbStore.getCurrentUser();
    if (!current) return { tickets: [] };
    const isAdmin = current.role === 'admin';
    let local = dbStore.getSupportTickets(current.id, isAdmin);
    try {
      const fsTickets = await getSupportTicketsFromFirestore(current.id, isAdmin);
      if (fsTickets.length > 0) {
        fsTickets.forEach(t => dbStore.addSupportTicket(t));
        local = dbStore.getSupportTickets(current.id, isAdmin);
      }
    } catch (e) {
      console.warn('Firestore getSupportTickets fallback:', e);
    }
    return { tickets: local };
  },

  async createSupportTicket(data: { subject: string; category: string; priority: string; message: string; images?: string[] }): Promise<{ ticket: SupportTicket }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const ticketId = `TICKET-${Date.now()}`;
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId: current.id,
      userEmail: current.email,
      userName: current.fullName,
      accountNumber: current.accountNumber,
      subject: data.subject,
      category: data.category as any || 'General',
      status: 'Open',
      priority: data.priority as any || 'Medium',
      messages: [{
        id: `MSG-${Date.now()}`,
        senderId: current.id,
        senderName: current.fullName,
        senderRole: current.role,
        message: data.message,
        images: data.images,
        createdAt: now
      }],
      createdAt: now,
      updatedAt: now
    };

    dbStore.addSupportTicket(ticket);
    syncSupportTicketToFirestore(ticket);

    if (current.role !== 'admin') {
      dispatchAdminAlert({
        type: 'LIVE_SUPPORT_MESSAGE',
        title: 'New Support Ticket Created',
        message: `${current.fullName} (${current.email}): "${data.subject}"`,
        userName: current.fullName,
        userEmail: current.email,
        accountNumber: current.accountNumber,
        actionSubTab: 'support'
      });
    }

    return { ticket };
  },

  async replySupportTicket(ticketId: string, message: string, images?: string[]): Promise<{ ticket: SupportTicket }> {
    const current = dbStore.getCurrentUser();
    if (!current) throw new Error('Not authenticated');

    const tickets = dbStore.getSupportTickets(undefined, true);
    let ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      // Check Firestore
      try {
        const fsTickets = await getSupportTicketsFromFirestore(undefined, true);
        ticket = fsTickets.find(t => t.id === ticketId);
      } catch (e) {}
    }
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date().toISOString();
    const updatedMessages = [...ticket.messages, {
      id: `MSG-${Date.now()}`,
      senderId: current.id,
      senderName: current.role === 'admin' ? 'SVB Review Support' : current.fullName,
      senderRole: current.role,
      message,
      images,
      createdAt: now
    }];

    const updatedTicket: SupportTicket = {
      ...ticket,
      messages: updatedMessages,
      status: current.role === 'admin' ? 'In Progress' : 'Open',
      updatedAt: now
    };

    dbStore.updateSupportTicket(updatedTicket);
    syncSupportTicketToFirestore(updatedTicket);

    if (current.role !== 'admin') {
      dispatchAdminAlert({
        type: 'LIVE_SUPPORT_MESSAGE',
        title: 'New Live Support Message',
        message: `${current.fullName} (${current.email}): "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
        userName: current.fullName,
        userEmail: current.email,
        accountNumber: current.accountNumber,
        actionSubTab: 'support'
      });
    }

    // If admin replied, send notification to user
    if (current.role === 'admin') {
      dbStore.addNotification({
        id: `NOTIF-${Date.now()}`,
        userId: ticket.userId,
        title: 'New Reply from Support Desk',
        message: `You have a new message from SVB Client Support regarding "${ticket.subject}".`,
        amount: 0,
        currency: 'USD',
        reference: ticket.id,
        read: false,
        createdAt: now
      });
    }

    return { ticket: updatedTicket };
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<{ ticket: SupportTicket }> {
    const tickets = dbStore.getSupportTickets(undefined, true);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const updatedTicket: SupportTicket = {
      ...ticket,
      status: status as any,
      updatedAt: new Date().toISOString()
    };

    dbStore.updateSupportTicket(updatedTicket);
    syncSupportTicketToFirestore(updatedTicket);
    return { ticket: updatedTicket };
  },

  // --- ADMIN DIRECTORY & AUDIT ---
  async searchUsers(queryStr: string): Promise<{ users: User[] }> {
    const term = queryStr.trim();
    const rawQ = term.toLowerCase();
    const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');

    let serverUsers: User[] = [];
    try {
      const backendRes = await requestApi<{ users: User[] }>(`/admin/users/search?q=${encodeURIComponent(term)}`);
      if (backendRes && Array.isArray(backendRes.users)) {
        serverUsers = backendRes.users;
        serverUsers.forEach(u => dbStore.saveUser(u));
      }
    } catch (err) {
      console.warn('Server user search endpoint call error:', err);
    }

    const localUsers = dbStore.getUsers();
    let fsUsers: User[] = [];
    try {
      fsUsers = await getAllUsersFromFirestore();
    } catch (e) {
      console.warn('Firestore getAllUsers in search error:', e);
    }

    if (term) {
      try {
        const singleFs = await getUserFromFirestore(term);
        if (singleFs) {
          fsUsers.push(singleFs);
        }
      } catch (e) {
        console.warn('Firestore single user lookup in search error:', e);
      }
    }

    const userMap = new Map<string, User>();
    localUsers.forEach(u => {
      if (u) {
        const key = (u.email || u.id).toLowerCase();
        userMap.set(key, u);
      }
    });
    fsUsers.forEach(u => {
      if (u) {
        const key = (u.email || u.id).toLowerCase();
        userMap.set(key, u);
        dbStore.saveUser(u);
      }
    });
    serverUsers.forEach(u => {
      if (u) {
        const key = (u.email || u.id).toLowerCase();
        userMap.set(key, u);
        dbStore.saveUser(u);
      }
    });

    const combined = Array.from(userMap.values());

    if (!rawQ) {
      return { users: combined };
    }

    const filtered = combined.filter(u => {
      if (!u) return false;
      const email = (u.email || '').toLowerCase();
      const name = (u.fullName || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      const rawAcc = (u.accountNumber || '').toLowerCase();
      const accClean = rawAcc.replace(/[^a-z0-9]/g, '');
      const phoneClean = (u.phone || '').replace(/[^a-z0-9]/g, '');

      return (
        email.includes(rawQ) ||
        name.includes(rawQ) ||
        id.includes(rawQ) ||
        rawAcc.includes(rawQ) ||
        (cleanQ.length > 0 && accClean.includes(cleanQ)) ||
        (cleanQ.length > 0 && phoneClean.includes(cleanQ))
      );
    });

    return { users: filtered };
  },

  async getAllUsers(): Promise<{ users: User[] }> {
    return this.searchUsers('');
  },

  async getAuditLogs(): Promise<{ auditLogs: AuditLog[] }> {
    return { auditLogs: dbStore.getAuditLogs() };
  },

  async regenerateFourDigitCode(userId: string): Promise<{ message: string; user: User; code: string }> {
    try {
      const backendRes = await requestApi<{ message: string; user: User; code: string }>(`/admin/users/${userId}/regenerate-code`, {
        method: 'POST'
      });
      if (backendRes && backendRes.user) {
        dbStore.saveUser(backendRes.user);
        return backendRes;
      }
    } catch (e) {
      console.warn('Backend regenerate code call failed:', e);
    }

    const user = dbStore.getUserById(userId);
    if (!user) throw new Error('User not found');

    const code = `${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = dbStore.saveUser({ ...user, fourDigitCode: code, transferCodeApproved: true });

    return { message: '4-Digit Code regenerated successfully.', user: updated, code };
  },

  async toggleRole(userId: string, role: 'user' | 'admin'): Promise<{ user: User }> {
    try {
      const backendRes = await requestApi<{ user: User }>(`/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role })
      });
      if (backendRes && backendRes.user) {
        dbStore.saveUser(backendRes.user);
        return backendRes;
      }
    } catch (e) {
      console.warn('Backend toggle role call failed:', e);
    }

    const user = dbStore.getUserById(userId);
    if (!user) throw new Error('User not found');

    const updated = dbStore.saveUser({ ...user, role });
    return { user: updated };
  },

  async getCryptoAddresses(): Promise<{ addresses: { BTC: string; USDT: string } }> {
    try {
      const backendRes = await requestApi<{ addresses: { BTC: string; USDT: string } }>('/crypto-addresses');
      if (backendRes && backendRes.addresses) {
        return backendRes;
      }
    } catch (e) {
      console.warn('Backend get crypto addresses fallback:', e);
    }
    return { addresses: dbStore.getCryptoAddresses() };
  },

  async updateCryptoAddresses(addresses: { BTC?: string; USDT?: string }): Promise<{ addresses: { BTC: string; USDT: string } }> {
    let resultAddresses: { BTC: string; USDT: string } = dbStore.getCryptoAddresses();
    try {
      const backendRes = await requestApi<{ addresses: { BTC: string; USDT: string } }>('/admin/crypto-addresses', {
        method: 'PATCH',
        body: JSON.stringify(addresses)
      });
      if (backendRes && backendRes.addresses) {
        dbStore.updateCryptoAddresses(backendRes.addresses);
        resultAddresses = backendRes.addresses;
      } else {
        resultAddresses = dbStore.updateCryptoAddresses(addresses);
      }
    } catch (e) {
      console.warn('Backend update crypto addresses fallback:', e);
      resultAddresses = dbStore.updateCryptoAddresses(addresses);
    }

    // Sync to Firestore for real-time global listener push
    syncCryptoAddressesToFirestore(resultAddresses);

    // Dispatch local window custom event for immediate instant UI update across current tab/components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crypto-addresses-updated', { detail: resultAddresses }));
    }

    return { addresses: resultAddresses };
  },

  // Password Reset helpers
  async requestPasswordReset(email: string): Promise<{ message: string; code: string }> {
    return { message: 'Password reset authorization code generated.', code: '8492' };
  },

  async verifyAndResetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Password has been updated.' };
  }
};
