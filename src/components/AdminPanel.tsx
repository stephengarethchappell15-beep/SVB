import React, { useState, useEffect } from 'react';
import { User, Transaction, AuditLog, DepositPayload, CryptoActivationDeposit, Tier3VerificationRequest, SupportTicket } from '../types';
import { api } from '../services/api';
import { AdminDepositPanel } from './AdminDepositPanel';
import { AdminAuditLogs } from './AdminAuditLogs';
import { CustomerSupportPanel } from './CustomerSupportPanel';
import { 
  subscribeCryptoAddressesFromFirestore,
  subscribeAllUsersFromFirestore,
  subscribeCryptoDepositsFromFirestore,
  subscribeVerificationsFromFirestore,
  subscribeTransactionsFromFirestore,
  subscribeSupportTicketsFromFirestore,
  subscribeEmailLogsFromFirestore,
  mergeSupportTickets,
  getCanonicalTicketId
} from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { subscribeRealtimeUpdates } from '../services/realtimeBus';
import { 
  AdminAlert, 
  subscribeAdminAlerts, 
  playAdminAlertChime, 
  requestAdminNotificationPermission 
} from '../services/adminAlerts';
import { ShieldAlert, Users, Sparkles, FileText, Headphones, Search, UserCheck, Shield, DollarSign, ArrowUpRight, CheckCircle2, XCircle, Clock, Key, ArrowDownRight, Ban, ShieldCheck, UserPlus, X, Plus, Bell, Volume2, VolumeX, Radio, Zap, Check, Filter, AlertCircle, RefreshCw, Send, CheckSquare, Eye, ArrowLeft, Mail, ExternalLink } from 'lucide-react';

interface AdminPanelProps {
  adminUser: User;
  onDepositSuccess: (updatedUser: User, transaction: Transaction) => void;
  onBack?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminUser, onDepositSuccess, onBack }) => {
  const [subTab, setSubTab] = useState<'pending' | 'users' | 'funding' | 'crypto' | 'withdraw' | 'audit' | 'support' | 'verifications' | 'email'>('pending');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchFilter, setUserSearchFilter] = useState<'all' | 'account' | 'email'>('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForDeposit, setSelectedUserForDeposit] = useState<User | null>(null);

  // Create User Account Modal State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAccountPin, setNewAccountPin] = useState('1234');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);
    setCreateUserLoading(true);

    try {
      const res = await api.register({
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        password: newPassword || 'password123',
        accountPin: newAccountPin || '1234'
      });
      setCreateUserSuccess(`User account created successfully! Generated Account Number: ${res.user.accountNumber}`);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewAccountPin('1234');
      fetchUsers(searchQuery);
    } catch (err: any) {
      setCreateUserError(err.message || 'Failed to create user account.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Tier 3 Verifications State
  const [verifications, setVerifications] = useState<Tier3VerificationRequest[]>([]);
  const [loadingVerifs, setLoadingVerifs] = useState(false);

  // Crypto Deposits State
  const [cryptoDeposits, setCryptoDeposits] = useState<CryptoActivationDeposit[]>([]);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [btcAddress, setBtcAddress] = useState('1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d');
  const [usdtAddress, setUsdtAddress] = useState('0x400773d018e8ad3575458b5e8b11ff55078451c9');
  const [updatingWallets, setUpdatingWallets] = useState(false);
  const [walletMsg, setWalletMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCryptoAddresses = async () => {
    try {
      const res = await api.getCryptoAddresses();
      if (res.addresses) {
        setBtcAddress(res.addresses.BTC || '');
        setUsdtAddress(res.addresses.USDT || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCryptoAddresses();

    // Subscribe to live Firestore updates
    const unsub = subscribeCryptoAddressesFromFirestore((addrs) => {
      if (addrs.BTC) setBtcAddress(addrs.BTC);
      if (addrs.USDT) setUsdtAddress(addrs.USDT);
    });

    const handleWindowUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.BTC) setBtcAddress(e.detail.BTC);
        if (e.detail.USDT) setUsdtAddress(e.detail.USDT);
      }
    };
    window.addEventListener('crypto-addresses-updated', handleWindowUpdate);

    return () => {
      unsub();
      window.removeEventListener('crypto-addresses-updated', handleWindowUpdate);
    };
  }, []);

  const handleUpdateWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMsg(null);
    setUpdatingWallets(true);
    try {
      await api.updateCryptoAddresses({ BTC: btcAddress, USDT: usdtAddress });
      setWalletMsg({ type: 'success', text: 'Crypto deposit wallet addresses updated successfully globally!' });
    } catch (err: any) {
      setWalletMsg({ type: 'error', text: err.message || 'Failed to update wallet addresses.' });
    } finally {
      setUpdatingWallets(false);
    }
  };

  // Admin Withdraw Form State
  const [withdrawTarget, setWithdrawTarget] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // All System Transactions for Admin Cancel
  const [sysTxns, setSysTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  // Instant Queue Filter & Search State
  const [queueFilter, setQueueFilter] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [queueSearchQuery, setQueueSearchQuery] = useState<string>('');

  // Queue Action Modals State
  const [approveModalTxn, setApproveModalTxn] = useState<Transaction | null>(null);
  const [approveSenderName, setApproveSenderName] = useState<string>('');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const [rejectModalTxn, setRejectModalTxn] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Crypto & Verification Modals State
  const [approveCryptoModal, setApproveCryptoModal] = useState<CryptoActivationDeposit | null>(null);
  const [isApprovingCrypto, setIsApprovingCrypto] = useState<boolean>(false);

  const [approveVerifModal, setApproveVerifModal] = useState<Tier3VerificationRequest | null>(null);
  const [verifNotes, setVerifNotes] = useState<string>('');
  const [isApprovingVerif, setIsApprovingVerif] = useState<boolean>(false);

  const [rejectVerifModal, setRejectVerifModal] = useState<Tier3VerificationRequest | null>(null);
  const [verifRejectReason, setVerifRejectReason] = useState<string>('');
  const [isRejectingVerif, setIsRejectingVerif] = useState<boolean>(false);

  // Non-blocking In-App Toast System
  const [toastMsg, setToastMsg] = useState<{ id: string; type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToastMsg({ id, type, title, message });
    setTimeout(() => {
      setToastMsg(prev => (prev && prev.id === id ? null : prev));
    }, 4000);
  };

  // Real-Time Admin Alerts & Sound State
  const [liveAlerts, setLiveAlerts] = useState<AdminAlert[]>([]);
  const [soundMuted, setSoundMuted] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportSearchEmail, setSupportSearchEmail] = useState<string>('');

  const fetchUsers = async (query = '') => {
    try {
      setLoadingUsers(true);
      const res = await api.searchUsers(query);
      setUsers(res.users);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Instant reactive client-side & server-backed filtering for users
  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    const cleanDigits = q.replace(/[^0-9]/g, '');

    return users.filter(u => {
      if (!u) return false;
      const email = (u.email || '').toLowerCase().trim();
      const acc = (u.accountNumber || '').trim().toLowerCase();
      const accClean = acc.replace(/[^0-9]/g, '');
      const name = (u.fullName || '').toLowerCase().trim();
      const phone = (u.phone || '').replace(/[^0-9]/g, '');
      const id = (u.id || '').toLowerCase().trim();

      if (userSearchFilter === 'account') {
        return acc.includes(q) || (cleanDigits.length > 0 && accClean.includes(cleanDigits));
      }
      if (userSearchFilter === 'email') {
        return email.includes(q);
      }
      return (
        acc.includes(q) ||
        (cleanDigits.length > 0 && accClean.includes(cleanDigits)) ||
        email.includes(q) ||
        name.includes(q) ||
        (cleanDigits.length > 0 && phone.includes(cleanDigits)) ||
        id.includes(q)
      );
    });
  }, [users, searchQuery, userSearchFilter]);

  const fetchCryptoDeposits = async () => {
    try {
      setLoadingCrypto(true);
      const res = await api.getCryptoActivationDeposits();
      setCryptoDeposits(res.deposits);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingCrypto(false);
    }
  };

  const fetchVerifications = async () => {
    try {
      setLoadingVerifs(true);
      const res = await api.getVerifications();
      setVerifications(res.verifications);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingVerifs(false);
    }
  };

  const fetchSysTxns = async () => {
    try {
      setLoadingTxns(true);
      const res = await api.getAllTransactions();
      setSysTxns(res.transactions);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingTxns(false);
    }
  };

  // Debounce search query to backend search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers('');
    fetchSysTxns();
    fetchCryptoDeposits();
    fetchVerifications();
    requestAdminNotificationPermission();

    // 1. Subscribe to Live Firestore Users
    const unsubUsers = subscribeAllUsersFromFirestore((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        liveUsers.forEach(u => dbStore.saveUser(u));
        setUsers(liveUsers);
      }
    });

    // 2. Subscribe to Live Crypto Activation Deposits ($2,500 deposit for 4-digit code)
    const unsubCrypto = subscribeCryptoDepositsFromFirestore((liveDeposits) => {
      if (liveDeposits) {
        liveDeposits.forEach(d => dbStore.addCryptoDeposit(d));
        setCryptoDeposits(liveDeposits);
      }
    });

    // 3. Subscribe to Live Tier 3 Verifications
    const unsubVerifs = subscribeVerificationsFromFirestore((liveVerifs) => {
      if (liveVerifs) {
        liveVerifs.forEach(v => dbStore.addVerification(v));
        setVerifications(liveVerifs);
      }
    });

    // 4. Subscribe to Live Transactions
    const unsubTxns = subscribeTransactionsFromFirestore(null, (liveTxns) => {
      if (liveTxns) {
        liveTxns.forEach(t => dbStore.addTransaction(t));
      }
      const local = dbStore.getTransactions();
      const map = new Map<string, Transaction>();
      const mergeTxn = (t: Transaction) => {
        let existingKey: string | null = null;
        let existing: Transaction | undefined = undefined;

        for (const [k, v] of map.entries()) {
          if (
            (t.id && v.id === t.id) ||
            (t.reference && v.reference && v.reference === t.reference) ||
            (t.reference && v.id === t.reference) ||
            (t.id && v.reference && v.reference === t.id)
          ) {
            existingKey = k;
            existing = v;
            break;
          }
        }

        if (!existing || !existingKey) {
          const key = t.reference || t.id;
          map.set(key, t);
        } else {
          // If either existing or incoming has a final status (Completed, Rejected, Cancelled), preserve it over Pending!
          let finalStatus = t.status;
          if (existing.status !== 'Pending' && t.status === 'Pending') {
            finalStatus = existing.status;
          } else if (existing.status === 'Pending' && t.status !== 'Pending') {
            finalStatus = t.status;
          }
          const isNewer = new Date(t.updatedAt || t.createdAt).getTime() >= new Date(existing.updatedAt || existing.createdAt).getTime();
          map.set(existingKey, {
            ...(isNewer ? existing : t),
            ...(isNewer ? t : existing),
            status: finalStatus,
            updatedAt: t.updatedAt || existing.updatedAt || new Date().toISOString()
          });
        }
      };
      local.forEach(mergeTxn);
      if (liveTxns) liveTxns.forEach(mergeTxn);
      const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSysTxns(merged);
    });

    // 5. Subscribe to Instant Admin Alerts
    const unsubAlerts = subscribeAdminAlerts((newAlert) => {
      setLiveAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      if (newAlert.type === 'PENDING_TRANSACTION') {
        fetchSysTxns();
      }
    });

    // 6. Initialize and subscribe to Live Support Inquiries
    setSupportTickets(dbStore.getSupportTickets(undefined, true));

    const unsubSupport = subscribeSupportTicketsFromFirestore(undefined, true, (liveTickets) => {
      if (liveTickets) {
        liveTickets.forEach(t => dbStore.addSupportTicket(t));
        setSupportTickets(prev => {
          const map = new Map<string, SupportTicket>();
          dbStore.getSupportTickets(undefined, true).forEach(t => map.set(getCanonicalTicketId(t.id), t));
          prev.forEach(t => {
            const cid = getCanonicalTicketId(t.id);
            const ex = map.get(cid);
            map.set(cid, ex ? mergeSupportTickets(ex, t) : t);
          });
          liveTickets.forEach(t => {
            const cid = getCanonicalTicketId(t.id);
            const ex = map.get(cid);
            map.set(cid, ex ? mergeSupportTickets(ex, t) : t);
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        });
      }
    });

    // 7. Subscribe to Realtime Bus updates
    const unsubRealtime = subscribeRealtimeUpdates((event) => {
      if (event.type.includes('SUPPORT') || event.type.includes('TICKET')) {
        const localTickets = dbStore.getSupportTickets(undefined, true);
        setSupportTickets(prev => {
          const map = new Map<string, SupportTicket>();
          localTickets.forEach(t => map.set(getCanonicalTicketId(t.id), t));
          prev.forEach(t => {
            const cid = getCanonicalTicketId(t.id);
            const ex = map.get(cid);
            map.set(cid, ex ? mergeSupportTickets(ex, t) : t);
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        });
      }
    });

    return () => {
      unsubUsers();
      unsubCrypto();
      unsubVerifs();
      unsubTxns();
      unsubAlerts();
      unsubSupport();
      unsubRealtime();
    };
  }, []);

  useEffect(() => {
    if (subTab === 'pending' || subTab === 'withdraw') fetchSysTxns();
    if (subTab === 'crypto') fetchCryptoDeposits();
    if (subTab === 'verifications') fetchVerifications();
    if (subTab === 'email') fetchEmailStatus();
  }, [subTab]);

  // Email Service Status, Configuration & Live Dispatch State
  const [emailStatus, setEmailStatus] = useState<{
    activeProvider: string;
    senderEmail: string;
    senderName?: string;
    selectedProvider?: string;
    providersConfigured: { resend: boolean; brevo: boolean; sendgrid: boolean; gmail: boolean; smtp: boolean };
    hasCredentials?: boolean;
  } | null>(null);
  const [emailConfigForm, setEmailConfigForm] = useState({
    provider: 'system',
    senderEmail: 'notifications@svb.com',
    senderName: 'Silicon Valley Bank'
  });
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [emailConfigSuccess, setEmailConfigSuccess] = useState<string | null>(null);
  const [emailConfigError, setEmailConfigError] = useState<string | null>(null);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);

  const [testEmailRecipient, setTestEmailRecipient] = useState('stephengarethchappell15@gmail.com');
  const [testEmailType, setTestEmailType] = useState<'welcome' | 'deposit' | 'rejected' | 'security'>('deposit');
  const [testEmailSubject, setTestEmailSubject] = useState('Official Silicon Valley Bank Notification');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchEmailStatus = async () => {
    try {
      const res = await api.getEmailStatus();
      if (res) setEmailStatus(res);
    } catch (e) {
      console.warn('Failed to fetch notification status:', e);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const res = await api.getEmailConfig();
      if (res) {
        setEmailConfigForm(prev => ({
          ...prev,
          provider: 'system',
          senderEmail: res.senderEmail || 'notifications@svb.com',
          senderName: res.senderName || 'Silicon Valley Bank'
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch notification config:', e);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setLoadingEmailLogs(true);
      const res = await api.getEmailLogs();
      if (res && res.logs) {
        setEmailLogs(res.logs);
      }
    } catch (e) {
      console.warn('Failed to fetch notification logs:', e);
    } finally {
      setLoadingEmailLogs(false);
    }
  };

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmailConfig(true);
    setEmailConfigSuccess(null);
    setEmailConfigError(null);

    try {
      const payload = {
        provider: 'system',
        senderEmail: (emailConfigForm.senderEmail || 'notifications@svb.com').trim(),
        senderName: (emailConfigForm.senderName || 'Silicon Valley Bank').trim()
      };

      const res = await api.updateEmailConfig(payload);
      const successMsg = res?.message || 'Notification settings saved successfully.';
      setEmailConfigSuccess(successMsg);
      showToast('success', 'Settings Updated', successMsg);
      await fetchEmailStatus();
      await fetchEmailLogs();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save notification settings.';
      setEmailConfigError(errorMsg);
      showToast('error', 'Configuration Failed', errorMsg);
    } finally {
      setSavingEmailConfig(false);
    }
  };

  useEffect(() => {
    if (subTab === 'email') {
      fetchEmailStatus();
      fetchEmailConfig();
      fetchEmailLogs();

      const unsub = subscribeEmailLogsFromFirestore((logs) => {
        if (logs && logs.length > 0) {
          setEmailLogs(logs);
        }
      });
      return () => unsub();
    }
  }, [subTab]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient) {
      showToast('error', 'Validation Error', 'Recipient email address is required.');
      return;
    }
    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.sendTestEmail({
        toEmail: testEmailRecipient.trim(),
        subject: testEmailSubject.trim(),
        type: testEmailType
      });
      if (res?.success === false) {
        throw new Error(res.error || 'Notification delivery rejected.');
      }
      setTestEmailResult({ success: true, message: res?.message || `Notification processed for ${testEmailRecipient}` });
      showToast('success', 'Notification Sent', `Notification processed for ${testEmailRecipient}`);
      await fetchEmailLogs();
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to send test notification.';
      setTestEmailResult({ success: false, message: errorMsg });
      showToast('error', 'Dispatch Error', errorMsg);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleApproveVerif = (verif: Tier3VerificationRequest) => {
    setApproveVerifModal(verif);
    setVerifNotes('Verified against government database and KYC tier 3 requirements.');
  };

  const handleConfirmApproveVerif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveVerifModal) return;
    const v = approveVerifModal;
    const notes = verifNotes.trim() || 'Tier 3 Identity Verified';

    // Optimistic Update
    setVerifications(prev => prev.map(item => item.id === v.id ? { ...item, status: 'Approved', adminNotes: notes } : item));
    showToast('success', 'Tier 3 Verified', `Approved identity verification for ${v.userName}.`);
    setApproveVerifModal(null);

    try {
      setIsApprovingVerif(true);
      await api.approveVerification(v.id, notes);
      fetchVerifications();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Approval Error', err.message || 'Approval failed on backend.');
    } finally {
      setIsApprovingVerif(false);
    }
  };

  const handleRejectVerif = (verif: Tier3VerificationRequest) => {
    setRejectVerifModal(verif);
    setVerifRejectReason('Document unreadable or compliance criteria not met.');
  };

  const handleConfirmRejectVerif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectVerifModal) return;
    const v = rejectVerifModal;
    const reason = verifRejectReason.trim() || 'Verification rejected by compliance';

    // Optimistic Update
    setVerifications(prev => prev.map(item => item.id === v.id ? { ...item, status: 'Rejected', adminNotes: reason } : item));
    showToast('info', 'Verification Rejected', `Rejected Tier 3 request for ${v.userName}.`);
    setRejectVerifModal(null);

    try {
      setIsRejectingVerif(true);
      await api.rejectVerification(v.id, reason);
      fetchVerifications();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message || 'Rejection failed.');
    } finally {
      setIsRejectingVerif(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`)) return;

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
    showToast('success', 'Role Updated', `User role changed to ${nextRole.toUpperCase()}.`);

    try {
      await api.toggleRole(userId, nextRole);
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Role Update Failed', err.message || 'Failed to update role');
      fetchUsers(searchQuery);
    }
  };

  const handleApproveCrypto = (dep: CryptoActivationDeposit) => {
    setApproveCryptoModal(dep);
  };

  const handleConfirmApproveCrypto = async () => {
    if (!approveCryptoModal) return;
    const dep = approveCryptoModal;

    // Optimistic update
    setCryptoDeposits(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'Approved', amountUSD: 2500 } : d));
    setUsers(prev => prev.map(u => u.id === dep.userId ? { ...u, transferCodeApproved: true, balance: (u.balance || 0) + 2500 } : u));
    showToast('success', 'Crypto Deposit Approved', `Issued 4-Digit Code and credited $2,500 to ${dep.userName}.`);
    setApproveCryptoModal(null);

    try {
      setIsApprovingCrypto(true);
      const res = await api.approveCryptoActivationDeposit(dep.id);
      showToast('success', 'Code Activated', `Security Code: [ ${res.code} ] assigned to ${res.user.fullName}.`);
      fetchCryptoDeposits();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Crypto Approval Failed', err.message || 'Approval failed');
      fetchCryptoDeposits();
    } finally {
      setIsApprovingCrypto(false);
    }
  };

  const handleRejectCrypto = async (depId: string) => {
    // Optimistic update
    setCryptoDeposits(prev => prev.map(d => d.id === depId ? { ...d, status: 'Rejected' } : d));
    showToast('info', 'Deposit Rejected', 'Crypto activation deposit was rejected.');

    try {
      await api.rejectCryptoActivationDeposit(depId);
      fetchCryptoDeposits();
    } catch (err: any) {
      showToast('error', 'Rejection Failed', err.message || 'Rejection failed');
      fetchCryptoDeposits();
    }
  };

  const handleExecuteAdminWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMsg(null);
    setWithdrawLoading(true);

    try {
      const res = await api.adminWithdraw({
        bankName: 'Silicon Valley Bank SVB Review Direct',
        routingNumber: '121000358',
        accountNumber: withdrawTarget.trim(),
        accountHolderName: 'SVB Review Withdrawal',
        amount: Number(withdrawAmount),
        note: withdrawNote.trim() || 'SVB Review initiated debit'
      });
      setWithdrawMsg({ type: 'success', text: `Successfully debited $${Number(withdrawAmount).toFixed(2)} from user ${res.updatedUser.fullName}.` });
      showToast('success', 'Withdrawal Complete', `Debited $${Number(withdrawAmount).toFixed(2)} from ${res.updatedUser.fullName}.`);
      setWithdrawAmount('');
      setWithdrawNote('');
      fetchUsers(searchQuery);
    } catch (err: any) {
      setWithdrawMsg({ type: 'error', text: err.message || 'Withdrawal failed.' });
      showToast('error', 'Withdrawal Failed', err.message || 'Withdrawal failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleOpenApproveModal = (t: Transaction) => {
    setApproveModalTxn(t);
    setApproveSenderName(t.senderName || 'Federal Wire Transfer / SVB Treasury');
  };

  const handleConfirmApproveTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalTxn) return;
    const txn = approveModalTxn;
    const finalSenderName = approveSenderName.trim() || 'Federal Wire Transfer / SVB Treasury';

    // 1. Instant Synchronous dbStore Update (prevents Firestore onSnapshot race condition)
    dbStore.updateTransaction(txn.id, { status: 'Completed', senderName: finalSenderName, updatedAt: new Date().toISOString() });
    if (txn.reference) {
      dbStore.updateTransaction(txn.reference, { status: 'Completed', senderName: finalSenderName, updatedAt: new Date().toISOString() });
    }

    // 2. Instant Optimistic UI Update in Queue & State
    setSysTxns(prev => prev.map(t => 
      (t.id === txn.id || (txn.reference && t.reference === txn.reference) || (t.reference && t.reference === txn.id) || (txn.id && t.id === txn.reference))
        ? { ...t, status: 'Completed', senderName: finalSenderName, updatedAt: new Date().toISOString() }
        : t
    ));

    // Optimistically update user balance if relevant
    setUsers(prev => prev.map(u => {
      if (u.accountNumber === txn.recipientAccountNumber || u.email === txn.recipientEmail || u.email === txn.userEmail || u.accountNumber === txn.accountNumber) {
        const newBal = (u.balance || 0) + (txn.amount || 0);
        return { ...u, balance: newBal, ledgerBalance: newBal };
      }
      return u;
    }));

    showToast('success', 'Transaction Approved', `Ref #${txn.reference} ($${txn.amount.toLocaleString()}) approved and funds credited.`);
    setApproveModalTxn(null);

    // 3. Async Non-blocking Backend & Firestore Dispatch
    try {
      setIsApproving(true);
      await api.approveTransaction(txn.id, finalSenderName);
      await fetchSysTxns();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Approval Error', err.message || 'Failed to approve transaction.');
      fetchSysTxns();
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenRejectModal = (t: Transaction) => {
    setRejectModalTxn(t);
    setRejectReason('SVB Compliance & Treasury Risk Clearance');
  };

  const handleConfirmRejectTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTxn) return;
    const txn = rejectModalTxn;
    const reason = rejectReason.trim() || 'Declined by Administrator';

    // 1. Instant Synchronous dbStore Update (prevents Firestore onSnapshot race condition)
    dbStore.updateTransaction(txn.id, { status: 'Rejected', updatedAt: new Date().toISOString() });
    if (txn.reference) {
      dbStore.updateTransaction(txn.reference, { status: 'Rejected', updatedAt: new Date().toISOString() });
    }

    // 2. Instant Optimistic UI Update in Queue & State
    setSysTxns(prev => prev.map(t => 
      (t.id === txn.id || (txn.reference && t.reference === txn.reference) || (t.reference && t.reference === txn.id) || (txn.id && t.id === txn.reference))
        ? { ...t, status: 'Rejected', updatedAt: new Date().toISOString() }
        : t
    ));

    // Optimistically refund sender's balance ONLY if it was a debit/transfer (NOT deposit)
    const isDebit = txn.type === 'Withdrawal' || txn.type === 'Wire Withdrawal' || txn.type === 'Transfer' || txn.type === 'Wire Transfer' || txn.type === 'Bill Pay';
    if (isDebit) {
      setUsers(prev => prev.map(u => {
        if (u.accountNumber === txn.accountNumber || u.email === txn.userEmail) {
          const newBal = (u.balance || 0) + (txn.amount || 0);
          return { ...u, balance: newBal, ledgerBalance: newBal };
        }
        return u;
      }));
    }

    showToast('info', 'Transaction Rejected', `Ref #${txn.reference} rejected. ${isDebit ? 'Funds refunded to client.' : ''}`);
    setRejectModalTxn(null);

    // 3. Async Non-blocking Backend & Firestore Dispatch
    try {
      setIsRejecting(true);
      await api.rejectTransaction(txn.id, reason);
      await fetchSysTxns();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message || 'Failed to reject transaction.');
      fetchSysTxns();
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancelTxn = async (txnId: string) => {
    const target = sysTxns.find(t => t.id === txnId || t.reference === txnId);
    
    // 1. Instant Synchronous dbStore Update
    dbStore.updateTransaction(txnId, { status: 'Cancelled', updatedAt: new Date().toISOString() });
    if (target?.reference) {
      dbStore.updateTransaction(target.reference, { status: 'Cancelled', updatedAt: new Date().toISOString() });
    }

    // 2. Instant Optimistic UI Update
    setSysTxns(prev => prev.map(t => 
      (t.id === txnId || (target?.reference && t.reference === target.reference) || (t.reference && t.reference === txnId))
        ? { ...t, status: 'Cancelled', updatedAt: new Date().toISOString() } 
        : t
    ));
    showToast('info', 'Transaction Cancelled', `Transfer ${target?.reference || txnId} has been cancelled.`);

    try {
      await api.adminCancelTransaction(txnId);
      await fetchSysTxns();
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Cancellation Error', err.message || 'Cancellation failed.');
      fetchSysTxns();
    }
  };

  const handleRegenerateCode = async (userId: string, userName: string) => {
    if (!confirm(`Regenerate a new 4-Digit Security Code for ${userName}?`)) return;
    try {
      const res = await api.regenerateFourDigitCode(userId);
      showToast('success', 'Code Generated', `New 4-Digit Code [ ${res.code} ] generated for ${userName}.`);
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Generation Failed', err.message || 'Regeneration failed.');
    }
  };

  const handleRevokeCode = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to cancel and revoke the 4-Digit Code authorization for ${userName}?`)) return;
    // Optimistic Update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, transferCodeApproved: false } : u));
    showToast('info', 'Code Revoked', `4-Digit Security Code authorization revoked for ${userName}.`);

    try {
      await api.revokeFourDigitCode(userId);
      fetchUsers(searchQuery);
    } catch (err: any) {
      showToast('error', 'Revocation Failed', err.message || 'Revocation failed.');
      fetchUsers(searchQuery);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1.5 text-xs font-semibold shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">System SVB Review Operation Portal</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30">
                  Restricted Access
                </span>
                {/* Real-time sync badge */}
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time Sync Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged in as <span className="text-slate-200 font-semibold">{adminUser.fullName}</span> ({adminUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Alert Chime Toggle */}
            <button
              onClick={() => {
                setSoundMuted(!soundMuted);
                if (soundMuted) playAdminAlertChime();
              }}
              title={soundMuted ? 'Unmute Audio Alert Chime' : 'Mute Audio Alert Chime'}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                soundMuted 
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundMuted ? 'Muted' : 'Chime On'}</span>
            </button>

            {/* Test Sound Chime */}
            <button
              onClick={() => playAdminAlertChime()}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center gap-1"
              title="Test Instant Audio Alert"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Alert</span>
            </button>
          </div>
        </div>

        {/* Real-Time Live Alert Banner / Toast */}
        {liveAlerts.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/50 rounded-2xl p-4 shadow-2xl relative overflow-hidden animate-pulse-subtle">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 border border-amber-500/30">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                      ⚡ Instant Admin Alert
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(liveAlerts[0].timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{liveAlerts[0].title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{liveAlerts[0].message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {liveAlerts[0].actionSubTab && (
                  <button
                    onClick={() => setSubTab(liveAlerts[0].actionSubTab!)}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black hover:bg-amber-400 transition-all shadow-md flex items-center gap-1"
                  >
                    <span>Review Now</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setLiveAlerts([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                  title="Dismiss Alerts"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSubTab('pending')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                subTab === 'pending' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Queue</span>
              {sysTxns.filter(t => t.status === 'Pending').length > 0 && (
                <span className="bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full animate-pulse ml-0.5">
                  {sysTxns.filter(t => t.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory</span>
            </button>

            <button
              onClick={() => setSubTab('funding')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'funding' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SVB Review Deposit</span>
            </button>

            <button
              onClick={() => setSubTab('crypto')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                subTab === 'crypto' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Crypto 4-Digit Approvals</span>
              {cryptoDeposits.filter(d => d.status === 'Pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setSubTab('verifications')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                subTab === 'verifications' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tier 3 Identity Reviews</span>
              {verifications.filter(v => v.status === 'Pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setSubTab('withdraw')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'withdraw' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Withdraw / Cancel</span>
            </button>

            <button
              onClick={() => setSubTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>

            <button
              onClick={() => setSubTab('support')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                subTab === 'support' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Support Helpdesk</span>
              {(() => {
                const pendingTickets = supportTickets.filter(t => {
                  if (t.status === 'Resolved' || t.status === 'Closed') return false;
                  if (t.status === 'Open') return true;
                  const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
                  return lastMsg ? lastMsg.senderRole === 'user' : true;
                });
                if (pendingTickets.length === 0) return null;
                return (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingTickets.length}
                  </span>
                );
              })()}
            </button>

            <button
              onClick={() => setSubTab('email')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'email' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Service</span>
            </button>
          </div>
        </div>

      {/* Sub-Tab 0: Pending Transactions Review Queue */}
      {subTab === 'pending' && (() => {
        const pendingCount = sysTxns.filter(t => t.status === 'Pending').length;
        const completedCount = sysTxns.filter(t => t.status === 'Completed').length;
        const rejectedCount = sysTxns.filter(t => t.status === 'Rejected' || t.status === 'Cancelled').length;
        const totalCount = sysTxns.length;

        // Apply filters and search query
        const filteredTxns = sysTxns.filter(t => {
          if (queueFilter === 'pending' && t.status !== 'Pending') return false;
          if (queueFilter === 'completed' && t.status !== 'Completed') return false;
          if (queueFilter === 'rejected' && t.status !== 'Rejected' && t.status !== 'Cancelled') return false;
          
          if (queueSearchQuery.trim()) {
            const q = queueSearchQuery.toLowerCase().trim();
            const refMatch = t.reference?.toLowerCase().includes(q);
            const emailMatch = t.userEmail?.toLowerCase().includes(q);
            const nameMatch = t.senderName?.toLowerCase().includes(q) || t.recipientName?.toLowerCase().includes(q);
            const accMatch = t.accountNumber?.includes(q) || t.recipientAccountNumber?.includes(q);
            const descMatch = t.description?.toLowerCase().includes(q);
            const amtMatch = t.amount?.toString().includes(q);
            return refMatch || emailMatch || nameMatch || accMatch || descMatch || amtMatch;
          }
          return true;
        });

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    Transaction Review & Authorization Queue
                  </h3>
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {pendingCount} Pending
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Instantly approve, verify, or decline wire transfers, payments, and deposits. Approved records credit recipient balances immediately.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Instant Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    placeholder="Search ref, account, email, amount..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  {queueSearchQuery && (
                    <button 
                      onClick={() => setQueueSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchSysTxns}
                  disabled={loadingTxns}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTxns ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Queue Filter Segmented Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setQueueFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  queueFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Clearance</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  queueFilter === 'pending' ? 'bg-slate-900 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setQueueFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  queueFilter === 'completed'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed / Approved</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  queueFilter === 'completed' ? 'bg-slate-900 text-emerald-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {completedCount}
                </span>
              </button>

              <button
                onClick={() => setQueueFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  queueFilter === 'rejected'
                    ? 'bg-rose-500 text-white font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected / Cancelled</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  queueFilter === 'rejected' ? 'bg-slate-900 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {rejectedCount}
                </span>
              </button>

              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  queueFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>All Records</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  queueFilter === 'all' ? 'bg-slate-900 text-cyan-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {totalCount}
                </span>
              </button>
            </div>

            {loadingTxns ? (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Loading transaction queue...</p>
              </div>
            ) : filteredTxns.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-60" />
                  <p className="font-semibold text-slate-300">
                    {queueFilter === 'pending' ? 'No pending transactions in the clearance queue.' : 'No transactions matching this filter.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {queueSearchQuery ? 'Try modifying your search criteria.' : 'Transactions will automatically appear here in real-time as users submit transfers.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Responsive Card Layout for Mobile & Tablets (lg:hidden) */}
                <div className="block lg:hidden space-y-4">
                  {filteredTxns.map((t) => (
                    <div
                      key={t.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all hover:border-slate-700"
                    >
                      {/* Top Header: Reference, Date & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {t.reference}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {t.status === 'Pending' && (
                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 shrink-0">
                            <Clock className="w-3 h-3 animate-spin text-amber-400" /> Pending Review
                          </span>
                        )}
                        {t.status === 'Completed' && (
                          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed / Approved
                          </span>
                        )}
                        {(t.status === 'Rejected' || t.status === 'Cancelled') && (
                          <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 shrink-0">
                            <XCircle className="w-3 h-3 text-rose-400" /> {t.status}
                          </span>
                        )}
                      </div>

                      {/* Transaction Amount & Client Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount</div>
                          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                            ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client Account</div>
                          <div className="font-semibold text-white text-xs mt-0.5 truncate">{t.senderName || t.userEmail}</div>
                          <div className="text-[11px] text-slate-400 font-mono">Acc #{t.accountNumber}</div>
                        </div>
                      </div>

                      {/* Details & Destination */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Transfer Type:</span>
                          <span className="font-semibold text-white">{t.type}</span>
                        </div>
                        {t.description && (
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-400 shrink-0">Description/Memo:</span>
                            <span className="text-slate-300 text-right">{t.description}</span>
                          </div>
                        )}
                        {t.recipientAccountNumber && (
                          <div className="flex items-center justify-between gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/15 text-[11px]">
                            <span className="text-slate-400">Recipient:</span>
                            <span className="text-emerald-400 font-mono font-semibold">
                              {t.recipientAccountNumber} {t.recipientName ? `(${t.recipientName})` : ''}
                            </span>
                          </div>
                        )}
                        {t.destinationBank && (
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-400">Destination Bank:</span>
                            <span className="text-cyan-400 font-medium">
                              {t.destinationBank} ({t.destinationCountry || 'US'})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons for Pending Items */}
                      {t.status === 'Pending' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/80">
                          <button
                            onClick={() => handleOpenApproveModal(t)}
                            className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer active:scale-[0.98] transition-all"
                            title="Approve transaction and credit recipient account"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Approve & Credit</span>
                          </button>

                          <button
                            onClick={() => handleOpenRejectModal(t)}
                            className="w-full py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
                            title="Reject transaction and refund user balance"
                          >
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>Reject & Refund</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (hidden on mobile, visible on lg) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Reference / ID</th>
                        <th className="py-3 px-3">Client User</th>
                        <th className="py-3 px-3">Type & Details</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Review Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filteredTxns.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-amber-400 font-semibold whitespace-nowrap">
                            {t.reference}
                          </td>

                          <td className="py-3.5 px-3 font-medium">
                            <div className="font-semibold text-white">{t.senderName || t.userEmail}</div>
                            <div className="text-[11px] text-slate-400">Acc #{t.accountNumber} ({t.userEmail})</div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-white">{t.type}</div>
                            <div className="text-[11px] text-slate-400">{t.description}</div>
                            {t.recipientAccountNumber && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Recipient Acc: {t.recipientAccountNumber} {t.recipientName ? `(${t.recipientName})` : ''}</div>
                            )}
                            {t.destinationBank && (
                              <div className="text-[10px] text-cyan-400 mt-0.5">Bank: {t.destinationBank} ({t.destinationCountry || 'US'})</div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                            ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {t.status === 'Pending' && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                <Clock className="w-3 h-3 animate-spin text-amber-400" /> Pending Review
                              </span>
                            )}
                            {t.status === 'Completed' && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                              </span>
                            )}
                            {(t.status === 'Rejected' || t.status === 'Cancelled') && (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                <XCircle className="w-3 h-3 text-rose-400" /> {t.status}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            {t.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenApproveModal(t)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer shrink-0"
                                  title="Approve transaction and credit recipient account"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Approve & Credit
                                </button>

                                <button
                                  onClick={() => handleOpenRejectModal(t)}
                                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer shrink-0"
                                  title="Reject transaction and refund user balance"
                                >
                                  <XCircle className="w-4 h-4" /> Reject & Refund
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No action required</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Sub-Tab 1: User Directory & Search */}
      {subTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Registered User Directory & Accounts
                </h3>
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                  {users.length} Total Clients
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly search and locate client profiles by 10-digit account number or email address.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by account #, email, name..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setCreateUserError(null);
                  setCreateUserSuccess(null);
                  setShowCreateUserModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Quick Search Mode Filter Chips & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter by:
              </span>
              <button
                onClick={() => setUserSearchFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  userSearchFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Attributes
              </button>
              <button
                onClick={() => setUserSearchFilter('account')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  userSearchFilter === 'account'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Account Number (#)</span>
              </button>
              <button
                onClick={() => setUserSearchFilter('email')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  userSearchFilter === 'email'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>Email Address (@)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">
                Showing <strong className="text-white font-mono">{filteredUsers.length}</strong> of <strong className="text-white font-mono">{users.length}</strong> clients
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-amber-400 hover:underline text-[11px] font-semibold ml-2"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">User Client</th>
                  <th className="py-3 px-3">Account #</th>
                  <th className="py-3 px-3">Balance</th>
                  <th className="py-3 px-3">4-Digit Code</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                        <span>Searching registered clients...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Search className="w-8 h-8 text-slate-600" />
                        <p className="font-semibold text-slate-300">
                          {searchQuery ? `No user accounts found matching "${searchQuery}"` : 'No registered users found.'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {searchQuery ? 'Try typing a 10-digit account number (e.g. 1084920148) or email address.' : 'Newly registered accounts will automatically display here.'}
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
                          >
                            Clear Search Query
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isNewAccount = u.createdAt && (Date.now() - new Date(u.createdAt).getTime() < 24 * 60 * 60 * 1000);
                    return (
                      <tr key={u.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-3.5 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{u.fullName}</span>
                            {isNewAccount && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{u.email}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold text-xs">
                          {u.accountNumber}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-white">
                          ${u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-3 font-mono">
                          {u.transferCodeApproved && u.fourDigitCode ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded">
                              {u.fourDigitCode}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Not Issued ($200 Req)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {u.role === 'admin' ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              SVB Review
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedUserForDeposit(u);
                              setSubTab('funding');
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" /> Deposit
                          </button>

                          <button
                            onClick={() => {
                              setWithdrawTarget(u.accountNumber);
                              setSubTab('withdraw');
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <ArrowDownRight className="w-3 h-3" /> Withdraw
                          </button>

                          <button
                            onClick={() => handleRegenerateCode(u.id, u.fullName)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            title="Regenerate 4-Digit Security Code"
                          >
                            <Key className="w-3 h-3" /> Code
                          </button>

                          <button
                            onClick={() => handleRevokeCode(u.id, u.fullName)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            title="Cancel and Revoke 4-Digit Security Code"
                          >
                            <XCircle className="w-3 h-3" /> Revoke
                          </button>

                          <button
                            onClick={() => {
                              setSupportSearchEmail(u.email);
                              setSubTab('support');
                            }}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            title="Search & Message User Support Tickets"
                          >
                            <Headphones className="w-3 h-3" /> Support
                          </button>

                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors"
                          >
                            Toggle Role
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Deposit Funding Panel */}
      {subTab === 'funding' && (
        <AdminDepositPanel
          currentUser={adminUser}
          preselectedUser={selectedUserForDeposit}
          onDepositSuccess={onDepositSuccess}
        />
      )}

      {/* Sub-Tab 3: Crypto Activation Deposit Approvals */}
      {subTab === 'crypto' && (
        <div className="space-y-6">
          {/* Admin Managed Wallet Addresses */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Manage Official Crypto Deposit Wallet Addresses (SVB Review Only)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update the Bitcoin (BTC) and Tether (USDT) treasury wallet addresses displayed to clients during deposit.
                </p>
              </div>
            </div>

            {walletMsg && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                walletMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{walletMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWallets} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bitcoin (BTC) Treasury Wallet Address</label>
                <input
                  type="text"
                  value={btcAddress}
                  onChange={(e) => setBtcAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-amber-400 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tether (USDT) Treasury Wallet Address</label>
                <input
                  type="text"
                  value={usdtAddress}
                  onChange={(e) => setUsdtAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-amber-400 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingWallets}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  {updatingWallets ? 'Saving Addresses...' : 'Save Deposit Wallet Addresses'}
                </button>
              </div>
            </form>
          </div>

          {/* Crypto Activation Deposit Approvals */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                $2,500 Crypto Activation Deposit Requests & 4-Digit Security Code Authorization
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review BTC / USDT deposit proof submitted by users to issue 4-Digit Security Codes for outgoing transfers.
              </p>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Account #</th>
                  <th className="py-3 px-3">Crypto Method</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Proof Screenshot & Tx Hash</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">SVB Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loadingCrypto ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">Loading activation deposit requests...</td>
                  </tr>
                ) : cryptoDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No crypto activation deposit requests found.</td>
                  </tr>
                ) : (
                  cryptoDeposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{dep.userName}</div>
                        <div className="text-[11px] text-slate-400">{dep.userEmail}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                        {dep.accountNumber}
                      </td>

                      <td className="py-3 px-3 font-semibold text-amber-400">
                        {dep.cryptoMethod} ({dep.network || 'Mainnet'})
                      </td>

                      <td className="py-3 px-3 font-bold text-white">
                        ${dep.amountUSD}.00 USD
                      </td>

                      <td className="py-3 px-3 max-w-xs space-y-1">
                        {dep.proofImage && (
                          <a href={dep.proofImage} target="_blank" rel="noreferrer" className="block">
                            <img src={dep.proofImage} alt="Payment Proof" className="w-16 h-12 object-cover rounded border border-slate-700 hover:border-amber-400 transition-all" />
                          </a>
                        )}
                        <div className="font-mono text-[11px] truncate text-slate-400">
                          {dep.txHash || dep.proofNote || 'No Tx hash provided'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {dep.status === 'Pending' && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                        {dep.status === 'Approved' && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Approved ({dep.generatedCode})
                          </span>
                        )}
                        {dep.status === 'Rejected' && (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right space-x-2">
                        {dep.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveCrypto(dep)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Issue Code
                            </button>
                            <button
                              onClick={() => handleRejectCrypto(dep.id)}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Action Complete</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Sub-Tab 4: Admin Withdrawal & Transaction Cancellation */}
      {subTab === 'withdraw' && (
        <div className="space-y-6">
          {/* Admin Withdrawal Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ArrowDownRight className="w-5 h-5 text-rose-400" />
              SVB Review Account Debit / Withdrawal Tool
            </h3>
            <p className="text-xs text-slate-400">
              Only SVB Review team members are authorized to execute manual debit/withdrawals from client bank accounts.
            </p>

            {withdrawMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                withdrawMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {withdrawMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{withdrawMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAdminWithdraw} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Account Number or Email</label>
                <input
                  type="text"
                  required
                  value={withdrawTarget}
                  onChange={(e) => setWithdrawTarget(e.target.value)}
                  placeholder="e.g. 1084920148 or alex.wright@svb.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Debit Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Debit Memo / Audit Note</label>
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="e.g. Fee adjustment, system correction"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {withdrawLoading ? 'Processing Account Debit...' : 'Execute SVB Review Account Debit'}
              </button>
            </form>
          </div>

          {/* Admin Cancel Transaction Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Ban className="w-5 h-5 text-amber-400" />
              Cancel Outgoing Transfers & Transactions
            </h3>
            <p className="text-xs text-slate-400">
              Only SVB Review team members can cancel executed or pending transfers across the bank network.
            </p>

            {loadingTxns ? (
              <div className="text-center py-8 text-slate-500">Loading system transactions...</div>
            ) : sysTxns.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No transactions recorded.</div>
            ) : (
              <>
                {/* Mobile Cards for Transactions */}
                <div className="block lg:hidden space-y-3">
                  {sysTxns.map((t) => (
                    <div key={t.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold text-xs">{t.reference}</span>
                          <span className="text-[11px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          (t.status === 'Cancelled' || t.status === 'Rejected') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">User Account</div>
                          <div className="font-semibold text-white truncate">{t.userEmail}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Amount & Type</div>
                          <div className="font-bold text-emerald-400 font-mono">${t.amount.toFixed(2)} ({t.type})</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                        {t.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleOpenApproveModal(t)}
                              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Credit
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(t)}
                              className="flex-1 py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject & Refund
                            </button>
                          </>
                        ) : t.status !== 'Cancelled' && t.status !== 'Rejected' ? (
                          <>
                            <button
                              onClick={() => handleOpenRejectModal(t)}
                              className="flex-1 py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject & Refund
                            </button>
                            <button
                              onClick={() => handleCancelTxn(t.id)}
                              className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic py-1">{t.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Reference</th>
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {sysTxns.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3 px-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-mono text-amber-400">{t.reference}</td>
                          <td className="py-3 px-3">{t.userEmail}</td>
                          <td className="py-3 px-3 font-semibold">{t.type}</td>
                          <td className="py-3 px-3 font-bold text-white">${t.amount.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              (t.status === 'Cancelled' || t.status === 'Rejected') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            {t.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleOpenApproveModal(t)}
                                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Approve & Credit Recipient"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Credit
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(t)}
                                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Reject & Refund Sender"
                                >
                                  <XCircle className="w-3 h-3" /> Reject & Refund
                                </button>
                              </>
                            ) : t.status !== 'Cancelled' && t.status !== 'Rejected' ? (
                              <>
                                <button
                                  onClick={() => handleOpenRejectModal(t)}
                                  className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Reject & Refund User"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject & Refund
                                </button>
                                <button
                                  onClick={() => handleCancelTxn(t.id)}
                                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">{t.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Tier 3 Identity Verification Requests */}
      {subTab === 'verifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Tier 3 VIP Identity Verification Requests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review submitted identity verification documents and approve or reject client Tier 3 upgrades.
              </p>
            </div>
            <button
              onClick={fetchVerifications}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-colors border border-slate-700"
            >
              Refresh List
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Account #</th>
                  <th className="py-3 px-3">Document Type</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loadingVerifs ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">Loading verification requests...</td>
                  </tr>
                ) : verifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No Tier 3 verification requests submitted yet.</td>
                  </tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{v.userName}</div>
                        <div className="text-[11px] text-slate-400">{v.userEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">{v.accountNumber}</td>
                      <td className="py-3 px-3 font-semibold text-cyan-400">{v.documentType}</td>
                      <td className="py-3 px-3 text-slate-300">{v.country}</td>
                      <td className="py-3 px-3">
                        {v.status === 'Pending' && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                        {v.status === 'Approved' && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Approved Tier 3
                          </span>
                        )}
                        {v.status === 'Rejected' && (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <div className="flex items-center justify-end gap-1.5 mb-1.5">
                          {v.documentUrl && (
                            <a
                              href={v.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                              title="View Identity Document"
                            >
                              <FileText className="w-3 h-3 text-cyan-400" /> ID Card
                            </a>
                          )}
                          {v.paymentSlipUrl && (
                            <a
                              href={v.paymentSlipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="View $5,000 Payment Slip"
                            >
                              <DollarSign className="w-3 h-3 text-emerald-400" /> $5k Slip
                            </a>
                          )}
                        </div>
                        {v.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveVerif(v)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve Tier 3
                            </button>
                            <button
                              onClick={() => handleRejectVerif(v)}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">{v.adminNotes || v.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Audit Logs */}
      {subTab === 'audit' && (
        <AdminAuditLogs adminUser={adminUser} />
      )}

      {/* Sub-Tab 6: Global Support Ticket Manager */}
      {subTab === 'support' && (
        <CustomerSupportPanel user={adminUser} initialUserEmail={supportSearchEmail} />
      )}

      {/* Sub-Tab 7: Notification Dispatcher & Audit Logs */}
      {subTab === 'email' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">System Notification Center</h3>
                  <p className="text-xs text-slate-400">Official Sender: <span className="text-amber-400 font-semibold">{emailConfigForm.senderEmail || 'notifications@svb.com'}</span></p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchEmailStatus();
                  fetchEmailConfig();
                  fetchEmailLogs();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status & Logs</span>
              </button>
            </div>
          </div>

          {/* Email Infrastructure Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active System Service</span>
              <div className="flex items-center gap-2 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white">{emailStatus?.activeProvider || 'SVB System Notifications'}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">
                Audit logging and ledger notification system active.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Configured Sender Address</span>
              <div className="flex items-center gap-2 pt-1">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-amber-300 break-all">{emailConfigForm.senderEmail || 'notifications@svb.com'}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">Used for receipts, alerts, approvals & rejections.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Delivery Resilience</span>
              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Non-Blocking Async Dispatch</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">Banking transactions execute immediately with background ledger logging.</p>
            </div>
          </div>

          {/* Notification Configuration Settings */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Sender Information & Branding</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure default sender headers and banking notification metadata.
                </p>
              </div>
            </div>

            {emailConfigSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{emailConfigSuccess}</span>
              </div>
            )}

            {emailConfigError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{emailConfigError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmailConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Sender Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailConfigForm.senderEmail}
                    onChange={(e) => setEmailConfigForm(prev => ({ ...prev, senderEmail: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                    placeholder="notifications@svb.com"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Sender Name</label>
                  <input
                    type="text"
                    required
                    value={emailConfigForm.senderName}
                    onChange={(e) => setEmailConfigForm(prev => ({ ...prev, senderName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    placeholder="Silicon Valley Bank"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingEmailConfig}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {savingEmailConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Notification Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Test Notification Dispatch Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>Send Test Notification</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch an official SVB notification to verify logging, receipt structure, and audit trail records.
              </p>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="stephengarethchappell15@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Transactional Template Type</label>
                  <select
                    value={testEmailType}
                    onChange={(e: any) => setTestEmailType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="deposit">Deposit Credited & 4-Digit Transfer Code Issued</option>
                    <option value="rejected">Transaction Rejected & Refund Processed</option>
                    <option value="welcome">New Account Registration & Welcome</option>
                    <option value="security">Security Alert / One-Time Authorization Code</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Custom Subject Line (Optional)</label>
                <input
                  type="text"
                  value={testEmailSubject}
                  onChange={(e) => setTestEmailSubject(e.target.value)}
                  placeholder="Official Silicon Valley Bank Notification"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {testEmailResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  testEmailResult.success 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}>
                  {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{testEmailResult.message}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={sendingTestEmail}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {sendingTestEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Notification...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Test Notification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Outbound Email Delivery Audit Logs Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Outbound Delivery Audit History</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time log of all banking notifications dispatched to client inboxes across the platform.
                </p>
              </div>
              <button
                onClick={fetchEmailLogs}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Subject / Event</th>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Delivery Status</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {loadingEmailLogs ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">Loading delivery logs...</td>
                    </tr>
                  ) : emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">No email delivery attempts logged yet.</td>
                    </tr>
                  ) : (
                    emailLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {log.recipient}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white">{log.subject}</span>
                          <span className="block text-[10px] text-slate-400 uppercase">{log.type || log.eventType || 'Transactional'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-300 font-medium whitespace-nowrap">
                          {log.provider}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            log.status === 'delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {log.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span className="capitalize">{log.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px] text-slate-400 font-mono">
                          {log.messageId ? (
                            <span className="text-emerald-400/90 truncate block max-w-[150px] ml-auto" title={log.messageId}>
                              {log.messageId}
                            </span>
                          ) : log.error ? (
                            <span className="text-rose-400/90 truncate block max-w-[150px] ml-auto" title={log.error}>
                              {log.error}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create User Account Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Create New User Account</h3>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{createUserError}</span>
              </div>
            )}

            {createUserSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{createUserSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. eleanor@techcorp.io"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">4-Digit Account PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newAccountPin}
                    onChange={(e) => setNewAccountPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={createUserLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {createUserLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Transaction Modal */}
      {approveModalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Approve & Credit Transaction</h3>
              </div>
              <button
                onClick={() => setApproveModalTxn(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Overview Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Reference</span>
                <span className="font-mono text-amber-400 font-bold text-xs">{approveModalTxn.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Amount to Credit</span>
                <span className="font-mono text-emerald-400 font-bold text-base">
                  ${approveModalTxn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Transfer Type</span>
                <span className="text-xs font-semibold text-white">{approveModalTxn.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Client / Sender</span>
                <span className="text-xs text-slate-300 truncate">{approveModalTxn.senderName || approveModalTxn.userEmail}</span>
              </div>
              {approveModalTxn.recipientAccountNumber && (
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-xs text-slate-400 font-medium">Recipient Account</span>
                  <span className="font-mono text-emerald-400 font-semibold text-xs">
                    {approveModalTxn.recipientAccountNumber} {approveModalTxn.recipientName ? `(${approveModalTxn.recipientName})` : ''}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmApproveTxn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sender Legal Name / Remitter Memo *
                </label>
                <input
                  type="text"
                  required
                  value={approveSenderName}
                  onChange={(e) => setApproveSenderName(e.target.value)}
                  placeholder="e.g. Federal Wire Transfer / SVB Treasury"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This remitter name will display on the recipient's transaction statement and ledger.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveModalTxn(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isApproving ? 'Authorizing & Crediting...' : 'Confirm & Credit Funds'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Transaction Modal */}
      {rejectModalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Decline / Reject Transaction</h3>
              </div>
              <button
                onClick={() => setRejectModalTxn(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Overview Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Reference</span>
                <span className="font-mono text-amber-400 font-bold text-xs">{rejectModalTxn.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Transfer Amount</span>
                <span className="font-mono text-rose-400 font-bold text-sm">
                  ${rejectModalTxn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Sender</span>
                <span className="text-xs text-slate-300">{rejectModalTxn.senderName || rejectModalTxn.userEmail}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-semibold">Refund Policy:</p>
              <p className="text-[11px] text-rose-300/90">
                Rejecting this transaction will mark it as Declined and instantly refund the debit balance back to the sender's account.
              </p>
            </div>

            <form onSubmit={handleConfirmRejectTxn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rejection Reason / Compliance Note
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete beneficiary information, compliance clearance"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalTxn(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isRejecting ? 'Processing Rejection...' : 'Reject & Refund'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Crypto Deposit Modal */}
      {approveCryptoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Approve Crypto Activation Deposit</h3>
              </div>
              <button
                onClick={() => setApproveCryptoModal(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Client:</span><span className="font-semibold text-white">{approveCryptoModal.userName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Account:</span><span className="font-mono text-emerald-400">{approveCryptoModal.accountNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Method:</span><span className="text-amber-400 font-semibold">{approveCryptoModal.cryptoMethod} ({approveCryptoModal.network || 'Mainnet'})</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount:</span><span className="font-bold text-white font-mono">${approveCryptoModal.amountUSD}.00 USD</span></div>
              {approveCryptoModal.txHash && (
                <div className="flex justify-between"><span className="text-slate-400">Tx Hash:</span><span className="font-mono text-[10px] text-slate-300 truncate max-w-xs">{approveCryptoModal.txHash}</span></div>
              )}
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              Approving this deposit will issue a unique 4-Digit Security Code to <strong>{approveCryptoModal.userName}</strong> and credit <strong>$2,500.00</strong> to their active SVB balance.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setApproveCryptoModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproveCrypto}
                disabled={isApprovingCrypto}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApprovingCrypto ? 'Issuing Code...' : 'Approve & Issue 4-Digit Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Tier 3 Verification Modal */}
      {approveVerifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Approve Tier 3 Identity Verification</h3>
              </div>
              <button
                onClick={() => setApproveVerifModal(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Client:</span><span className="font-semibold text-white">{approveVerifModal.userName}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Account:</span><span className="font-mono text-emerald-400">{approveVerifModal.accountNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Document Type:</span><span className="text-cyan-400 font-semibold">{approveVerifModal.documentType} ({approveVerifModal.country})</span></div>
            </div>

            <form onSubmit={handleConfirmApproveVerif} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Compliance Verification Notes</label>
                <input
                  type="text"
                  value={verifNotes}
                  onChange={(e) => setVerifNotes(e.target.value)}
                  placeholder="e.g. Identity verified against government database"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveVerifModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApprovingVerif}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isApprovingVerif ? 'Verifying...' : 'Confirm Tier 3 Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Tier 3 Verification Modal */}
      {rejectVerifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Decline Tier 3 Identity Verification</h3>
              </div>
              <button
                onClick={() => setRejectVerifModal(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectVerif} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rejection Reason</label>
                <input
                  type="text"
                  value={verifRejectReason}
                  onChange={(e) => setVerifRejectReason(e.target.value)}
                  placeholder="e.g. Document expired or unreadable"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectVerifModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejectingVerif}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isRejectingVerif ? 'Rejecting...' : 'Reject Verification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Alert System */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
            toastMsg.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10'
              : toastMsg.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-500/10'
              : 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10'
          }`}>
            <div className="shrink-0 mt-0.5">
              {toastMsg.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toastMsg.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
              {toastMsg.type === 'info' && <AlertCircle className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{toastMsg.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toastMsg.message}</p>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-white shrink-0 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
