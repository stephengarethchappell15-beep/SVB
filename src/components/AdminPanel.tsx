import React, { useState, useEffect } from 'react';
import { User, Transaction, AuditLog, DepositPayload, CryptoActivationDeposit, Tier3VerificationRequest } from '../types';
import { api } from '../services/api';
import { AdminDepositPanel } from './AdminDepositPanel';
import { AdminAuditLogs } from './AdminAuditLogs';
import { CustomerSupportPanel } from './CustomerSupportPanel';
import { 
  subscribeCryptoAddressesFromFirestore,
  subscribeAllUsersFromFirestore,
  subscribeCryptoDepositsFromFirestore,
  subscribeVerificationsFromFirestore,
  subscribeTransactionsFromFirestore
} from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { 
  AdminAlert, 
  subscribeAdminAlerts, 
  playAdminAlertChime, 
  requestAdminNotificationPermission 
} from '../services/adminAlerts';
import { ShieldAlert, Users, Sparkles, FileText, Headphones, Search, UserCheck, Shield, DollarSign, ArrowUpRight, CheckCircle2, XCircle, Clock, Key, ArrowDownRight, Ban, ShieldCheck, UserPlus, X, Plus, Bell, Volume2, VolumeX, Radio, Zap, Check, AlertCircle } from 'lucide-react';
import { BackButton } from './BackButton';
import { useNavigation } from '../context/NavigationContext';

interface AdminPanelProps {
  adminUser: User;
  onDepositSuccess: (updatedUser: User, transaction: Transaction) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminUser, onDepositSuccess }) => {
  const { currentSubTab, setSubTab: navSetSubTab } = useNavigation();
  const [subTab, setSubTabState] = useState<'pending' | 'users' | 'funding' | 'crypto' | 'withdraw' | 'audit' | 'support' | 'verifications'>('pending');

  const setSubTab = (newTab: 'pending' | 'users' | 'funding' | 'crypto' | 'withdraw' | 'audit' | 'support' | 'verifications') => {
    setSubTabState(newTab);
    navSetSubTab(newTab);
  };

  useEffect(() => {
    if (currentSubTab && ['pending', 'users', 'funding', 'crypto', 'withdraw', 'audit', 'support', 'verifications'].includes(currentSubTab)) {
      setSubTabState(currentSubTab as any);
    }
  }, [currentSubTab]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [pendingQueueSearch, setPendingQueueSearch] = useState('');

  // Workflow Protection & Confirmation State
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  const [actionCompleteMsg, setActionCompleteMsg] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  // Status Filter for Pending Queue
  const [pendingFilter, setPendingFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // Status Filter for Crypto Deposits
  const [cryptoFilter, setCryptoFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // Status Filter for Tier 3 Verifications
  const [verifFilter, setVerifFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // Real-Time Admin Alerts & Sound State
  const [liveAlerts, setLiveAlerts] = useState<AdminAlert[]>([]);
  const [soundMuted, setSoundMuted] = useState(false);

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
      setSysTxns(res.transactions || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingTxns(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchQuery);
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
      const isFinal = (st?: string) =>
        st === 'Completed' || st === 'Approved' || st === 'Rejected' || st === 'Cancelled' || st === 'Failed';

      const addOrMerge = (txn: Transaction) => {
        if (!txn || !txn.id) return;
        const existing = map.get(txn.id) || Array.from(map.values()).find(t => t.reference && txn.reference && t.reference === txn.reference);
        if (existing) {
          const keepStatus = isFinal(existing.status) && txn.status === 'Pending'
            ? existing.status
            : (txn.status || existing.status);
          map.set(existing.id, { ...existing, ...txn, status: keepStatus });
        } else {
          map.set(txn.id, txn);
        }
      };

      local.forEach(addOrMerge);
      if (liveTxns) liveTxns.forEach(addOrMerge);
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

    return () => {
      unsubUsers();
      unsubCrypto();
      unsubVerifs();
      unsubTxns();
      unsubAlerts();
    };
  }, [searchQuery]);

  useEffect(() => {
    if (subTab === 'pending' || subTab === 'withdraw') fetchSysTxns();
    if (subTab === 'crypto') fetchCryptoDeposits();
    if (subTab === 'verifications') fetchVerifications();
  }, [subTab]);

  const handleApproveVerif = async (verifId: string) => {
    if (processingIds[verifId]) return;

    const target = verifications.find(v => v.id === verifId);
    if (target && target.status === 'Approved') {
      alert('This Tier 3 verification has already been approved.');
      return;
    }
    if (target && target.status === 'Rejected') {
      alert('This Tier 3 verification has already been rejected.');
      return;
    }

    const notes = prompt('Enter compliance approval notes (optional):');
    if (notes === null) return;

    setProcessingIds(prev => ({ ...prev, [verifId]: true }));
    setVerifications(prev => prev.map(v => v.id === verifId ? { ...v, status: 'Approved', updatedAt: new Date().toISOString() } : v));

    try {
      await api.approveVerification(verifId, notes);
      setActionCompleteMsg({
        id: verifId,
        text: `Action Complete: Tier 3 VIP Upgrade Approved for ${target?.userName || 'client'}.`,
        type: 'success'
      });
      await Promise.all([
        fetchVerifications(),
        fetchUsers(searchQuery)
      ]);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
      await fetchVerifications();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[verifId];
        return next;
      });
    }
  };

  const handleRejectVerif = async (verifId: string) => {
    if (processingIds[verifId]) return;

    const target = verifications.find(v => v.id === verifId);
    if (target && (target.status === 'Approved' || target.status === 'Rejected')) {
      alert(`This verification request has already been ${target.status.toLowerCase()}.`);
      return;
    }

    const notes = prompt('Enter rejection reason (optional):');
    if (notes === null) return;

    setProcessingIds(prev => ({ ...prev, [verifId]: true }));
    setVerifications(prev => prev.map(v => v.id === verifId ? { ...v, status: 'Rejected', updatedAt: new Date().toISOString() } : v));

    try {
      await api.rejectVerification(verifId, notes);
      setActionCompleteMsg({
        id: verifId,
        text: `Action Complete: Tier 3 Verification Rejected.`,
        type: 'success'
      });
      await Promise.all([
        fetchVerifications(),
        fetchUsers(searchQuery)
      ]);
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
      await fetchVerifications();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[verifId];
        return next;
      });
    }
  };

  const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`)) return;

    try {
      await api.toggleRole(userId, nextRole);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleApproveCrypto = async (depId: string) => {
    if (processingIds[depId]) return;

    const target = cryptoDeposits.find(d => d.id === depId);
    if (target && target.status === 'Approved') {
      alert('This crypto deposit has already been approved.');
      return;
    }
    if (target && target.status === 'Rejected') {
      alert('This crypto deposit has already been rejected.');
      return;
    }

    setProcessingIds(prev => ({ ...prev, [depId]: true }));
    // Optimistically update crypto deposits state
    setCryptoDeposits(prev => prev.map(d => d.id === depId ? { ...d, status: 'Approved', updatedAt: new Date().toISOString() } : d));

    try {
      const res = await api.approveCryptoActivationDeposit(depId);
      setActionCompleteMsg({
        id: depId,
        text: `Action Complete: Approved & Issued 4-Digit Code [ ${res.code} ] to ${res.user.fullName}. $2,500 credited to balance.`,
        type: 'success'
      });
      await Promise.all([
        fetchCryptoDeposits(),
        fetchSysTxns(),
        fetchUsers(searchQuery)
      ]);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
      await fetchCryptoDeposits();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[depId];
        return next;
      });
    }
  };

  const handleRejectCrypto = async (depId: string) => {
    if (processingIds[depId]) return;

    const target = cryptoDeposits.find(d => d.id === depId);
    if (target && (target.status === 'Approved' || target.status === 'Rejected')) {
      alert(`This deposit has already been ${target.status.toLowerCase()}.`);
      return;
    }

    const reason = prompt('Enter rejection reason or explanatory note for client (optional):');
    if (reason === null) return;

    setProcessingIds(prev => ({ ...prev, [depId]: true }));
    setCryptoDeposits(prev => prev.map(d => d.id === depId ? { ...d, status: 'Rejected', updatedAt: new Date().toISOString() } : d));

    try {
      await api.rejectCryptoActivationDeposit(depId, reason || undefined);
      setActionCompleteMsg({
        id: depId,
        text: `Action Complete: Crypto activation deposit rejected. Notice dispatched to client.`,
        type: 'success'
      });
      await Promise.all([
        fetchCryptoDeposits(),
        fetchSysTxns()
      ]);
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
      await fetchCryptoDeposits();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[depId];
        return next;
      });
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
      setWithdrawAmount('');
      setWithdrawNote('');
      fetchUsers(searchQuery);
    } catch (err: any) {
      setWithdrawMsg({ type: 'error', text: err.message || 'Withdrawal failed.' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleApproveTxn = async (txnId: string, defaultSenderName?: string) => {
    if (processingIds[txnId]) return;

    const txn = sysTxns.find(t => t.id === txnId || (t.reference && t.reference === txnId));
    if (txn && (txn.status === 'Approved' || txn.status === 'Completed')) {
      alert('This transaction has already been approved.');
      return;
    }
    if (txn && (txn.status === 'Rejected' || txn.status === 'Cancelled')) {
      alert('This transaction has already been rejected/cancelled.');
      return;
    }

    const isDeposit = txn && (((txn.type || '').toLowerCase().includes('deposit')) || ((txn.description || '').toLowerCase().includes('deposit')) || ((txn.description || '').toLowerCase().includes('verification')));
    
    let senderName = defaultSenderName || (isDeposit ? "Silicon Valley Bank Treasury / Crypto Clearing" : "Federal Wire Transfer / SVB Treasury");
    if (!isDeposit && (!defaultSenderName || defaultSenderName.trim() === '')) {
      const input = prompt("Enter Sender's Full Name (required before crediting recipient account):", "Federal Wire Transfer / SVB Treasury");
      if (input === null) return; // user cancelled prompt
      if (!input.trim()) {
        alert("Sender's name is required before crediting funds.");
        return;
      }
      senderName = input.trim();
    }

    setProcessingIds(prev => ({ ...prev, [txnId]: true }));

    // Optimistically update local sysTxns status to Approved for all matching records immediately
    const matchesTxn = (t: Transaction) => t.id === txnId || (t.reference && t.reference === txnId) || (txn && t.reference && txn.reference && t.reference === txn.reference);
    setSysTxns(prev => prev.map(t => matchesTxn(t) ? { ...t, status: 'Approved', senderName, updatedAt: new Date().toISOString() } : t));

    try {
      await api.approveTransaction(txnId, senderName);
      setActionCompleteMsg({
        id: txnId,
        text: `Action Complete: Reference ${txn?.reference || txnId} Approved & Credited successfully!`,
        type: 'success'
      });
      await Promise.all([
        fetchSysTxns(),
        fetchUsers(searchQuery),
        fetchCryptoDeposits()
      ]);
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
      await fetchSysTxns();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[txnId];
        return next;
      });
    }
  };

  const handleCancelTxn = async (txnId: string) => {
    if (processingIds[txnId]) return;
    if (!confirm('Are you sure you want to cancel this transfer/transaction? User funds will be adjusted.')) return;
    
    const txn = sysTxns.find(t => t.id === txnId || (t.reference && t.reference === txnId));
    if (txn && (txn.status === 'Rejected' || txn.status === 'Cancelled')) {
      alert('This transaction has already been cancelled.');
      return;
    }

    setProcessingIds(prev => ({ ...prev, [txnId]: true }));
    const matchesTxn = (t: Transaction) => t.id === txnId || (t.reference && t.reference === txnId) || (txn && t.reference && txn.reference && t.reference === txn.reference);
    setSysTxns(prev => prev.map(t => matchesTxn(t) ? { ...t, status: 'Rejected', updatedAt: new Date().toISOString() } : t));

    try {
      await api.adminCancelTransaction(txnId);
      setActionCompleteMsg({
        id: txnId,
        text: `Action Complete: Transaction ${txn?.reference || txnId} Cancelled.`,
        type: 'success'
      });
      await Promise.all([
        fetchSysTxns(),
        fetchUsers(searchQuery),
        fetchCryptoDeposits()
      ]);
    } catch (err: any) {
      alert(err.message || 'Cancellation failed.');
      await fetchSysTxns();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[txnId];
        return next;
      });
    }
  };

  const handleRejectTxn = async (txnId: string) => {
    if (processingIds[txnId]) return;

    const txn = sysTxns.find(t => t.id === txnId || (t.reference && t.reference === txnId));
    if (txn && (txn.status === 'Approved' || txn.status === 'Completed')) {
      alert('This transaction has already been approved and cannot be rejected.');
      return;
    }
    if (txn && (txn.status === 'Rejected' || txn.status === 'Cancelled')) {
      alert('This transaction has already been rejected/cancelled.');
      return;
    }

    const reason = prompt('Enter cancellation/rejection reason (optional):', 'Cancelled / Declined by SVB Review');
    if (reason === null) return; // user cancelled prompt

    setProcessingIds(prev => ({ ...prev, [txnId]: true }));

    // Optimistically update local sysTxns status to Rejected immediately
    const matchesTxn = (t: Transaction) => t.id === txnId || (t.reference && t.reference === txnId) || (txn && t.reference && txn.reference && t.reference === txn.reference);
    setSysTxns(prev => prev.map(t => matchesTxn(t) ? { ...t, status: 'Rejected', updatedAt: new Date().toISOString() } : t));

    try {
      await api.rejectTransaction(txnId, reason.trim() || 'Cancelled / Declined by SVB Review');
      setActionCompleteMsg({
        id: txnId,
        text: `Action Complete: Reference ${txn?.reference || txnId} Rejected / Cancelled.`,
        type: 'success'
      });
      await Promise.all([
        fetchSysTxns(),
        fetchUsers(searchQuery),
        fetchCryptoDeposits()
      ]);
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
      await fetchSysTxns();
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[txnId];
        return next;
      });
    }
  };

  const handleRegenerateCode = async (userId: string, userName: string) => {
    if (!confirm(`Regenerate a new 4-Digit Security Code for ${userName}?`)) return;
    try {
      const res = await api.regenerateFourDigitCode(userId);
      alert(`New 4-Digit Code [ ${res.code} ] successfully generated for ${userName}.`);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Regeneration failed.');
    }
  };

  const handleRevokeCode = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to cancel and revoke the 4-Digit Code authorization for ${userName}?`)) return;
    try {
      await api.revokeFourDigitCode(userId);
      alert(`4-Digit Security Code authorization for ${userName} has been cancelled and revoked.`);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Revocation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton variant="admin" />
      </div>

      {/* Admin Top Banner */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subTab === 'support' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Support Helpdesk</span>
            </button>
          </div>
        </div>

      {/* Sub-Tab 0: Pending Transactions SVB Review Queue */}
      {subTab === 'pending' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          {actionCompleteMsg && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              actionCompleteMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {actionCompleteMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="text-xs font-semibold">{actionCompleteMsg.text}</span>
              </div>
              <button
                onClick={() => setActionCompleteMsg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Transaction Queue & Compliance Review
                  </h3>
                </div>
                <div className="bg-amber-500/20 text-amber-300 text-xs font-black uppercase px-3 py-1 rounded-full border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                  <span className="text-sm font-black">{sysTxns.filter(t => t.status === 'Pending').length}</span>
                  <span>PENDING</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Review and manage all pending user transfers, wire withdrawals, bill payments, and code authorizations requiring compliance clearance.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={pendingQueueSearch}
                  onChange={(e) => setPendingQueueSearch(e.target.value)}
                  placeholder="Filter by ref, user, acc #..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>

              <button
                onClick={fetchSysTxns}
                disabled={loadingTxns}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              >
                <Clock className={`w-3.5 h-3.5 ${loadingTxns ? 'animate-spin text-amber-400' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>
          </div>

          {/* Workflow Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
            <button
              onClick={() => setPendingFilter('Pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pendingFilter === 'Pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                pendingFilter === 'Pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {sysTxns.filter(t => t.status === 'Pending').length}
              </span>
            </button>

            <button
              onClick={() => setPendingFilter('Approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pendingFilter === 'Approved'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                pendingFilter === 'Approved' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {sysTxns.filter(t => t.status === 'Approved' || t.status === 'Completed').length}
              </span>
            </button>

            <button
              onClick={() => setPendingFilter('Rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pendingFilter === 'Rejected'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                pendingFilter === 'Rejected' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {sysTxns.filter(t => t.status === 'Rejected' || t.status === 'Cancelled').length}
              </span>
            </button>

            <button
              onClick={() => setPendingFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pendingFilter === 'All'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Records</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {sysTxns.length}
              </span>
            </button>
          </div>

          {loadingTxns ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Loading transactions queue...
            </div>
          ) : (() => {
            const filtered = sysTxns.filter(t => {
              // Status filter
              if (pendingFilter === 'Pending' && t.status !== 'Pending') return false;
              if (pendingFilter === 'Approved' && (t.status !== 'Approved' && t.status !== 'Completed')) return false;
              if (pendingFilter === 'Rejected' && (t.status !== 'Rejected' && t.status !== 'Cancelled')) return false;

              // Search query
              if (!pendingQueueSearch.trim()) return true;
              const q = pendingQueueSearch.toLowerCase().trim();
              return (
                (t.reference && t.reference.toLowerCase().includes(q)) ||
                (t.id && t.id.toLowerCase().includes(q)) ||
                (t.senderName && t.senderName.toLowerCase().includes(q)) ||
                (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
                (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
                (t.type && t.type.toLowerCase().includes(q)) ||
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.recipientName && t.recipientName.toLowerCase().includes(q)) ||
                (t.recipientAccountNumber && t.recipientAccountNumber.toLowerCase().includes(q))
              );
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
                    <p className="font-semibold text-slate-300 text-sm">
                      {pendingFilter === 'Pending'
                        ? 'All caught up! No pending transactions in the review queue.'
                        : `No transactions found in ${pendingFilter} view.`}
                    </p>
                    <p className="text-xs text-slate-500">Items move automatically between tabs upon admin action.</p>
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Mobile View: Clean Card Layout */}
                <div className="block md:hidden space-y-4">
                  {filtered.map((t) => {
                    const isPending = t.status === 'Pending';
                    const isApproved = t.status === 'Approved' || t.status === 'Completed';
                    const isRejected = t.status === 'Rejected' || t.status === 'Cancelled';
                    const isBusy = processingIds[t.id];

                    return (
                      <div key={t.id} className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <span className="font-mono text-xs text-amber-400 font-bold">{t.reference}</span>
                          {isPending && (
                            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin text-amber-400" /> Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" /> Rejected / Cancelled
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">{t.senderName || t.userEmail}</p>
                            <p className="text-[11px] text-slate-400">Acc #{t.accountNumber} ({t.userEmail})</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black font-mono text-emerald-400">
                              ${(Number(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-xl p-2.5 text-[11px] space-y-1 border border-slate-800/50">
                          <div className="text-slate-200 font-semibold">{t.type} • {t.description}</div>
                          {t.recipientAccountNumber && (
                            <div className="text-emerald-400 font-mono text-[10px]">
                              Recipient Acc: {t.recipientAccountNumber} {t.recipientName ? `(${t.recipientName})` : ''}
                            </div>
                          )}
                          {t.destinationBank && (
                            <div className="text-cyan-400 text-[10px]">
                              Bank: {t.destinationBank} ({t.destinationCountry || 'US'})
                            </div>
                          )}
                          <div className="text-slate-500 text-[10px]">
                            Submitted: {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {isPending ? (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => handleApproveTxn(t.id, t.senderName)}
                              disabled={isBusy}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {isBusy ? 'Processing...' : 'Approve & Credit'}
                            </button>

                            <button
                              onClick={() => handleRejectTxn(t.id)}
                              disabled={isBusy}
                              className="w-full bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              {isBusy ? 'Processing...' : 'Reject / Cancel'}
                            </button>
                          </div>
                        ) : isApproved ? (
                          <div className="pt-1">
                            <span className="w-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Action Complete: Approved
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <span className="w-full bg-rose-500/15 text-rose-400 border border-rose-500/30 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                              <XCircle className="w-4 h-4" /> Action Complete: Rejected
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Width Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Submission Date</th>
                        <th className="py-3 px-3">Reference / ID</th>
                        <th className="py-3 px-3">Client User</th>
                        <th className="py-3 px-3">Type & Details</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Review Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filtered.map((t) => {
                        const isPending = t.status === 'Pending';
                        const isApproved = t.status === 'Approved' || t.status === 'Completed';
                        const isRejected = t.status === 'Rejected' || t.status === 'Cancelled';
                        const isBusy = processingIds[t.id];

                        return (
                          <tr key={t.id} className="hover:bg-slate-950/50 transition-colors">
                            <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>

                            <td className="py-3 px-3 font-mono text-amber-400 font-semibold whitespace-nowrap">
                              {t.reference}
                            </td>

                            <td className="py-3 px-3 font-medium">
                              <div className="font-semibold text-white">{t.senderName || t.userEmail}</div>
                              <div className="text-[11px] text-slate-400">Acc #{t.accountNumber} ({t.userEmail})</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-white">{t.type}</div>
                              <div className="text-[11px] text-slate-400">{t.description}</div>
                              {t.recipientAccountNumber && (
                                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Recipient Acc: {t.recipientAccountNumber} {t.recipientName ? `(${t.recipientName})` : ''}</div>
                              )}
                              {t.destinationBank && (
                                <div className="text-[10px] text-cyan-400 mt-0.5">Bank: {t.destinationBank} ({t.destinationCountry || 'US'})</div>
                              )}
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                              ${(Number(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              {isPending && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                  <Clock className="w-3 h-3 animate-spin text-amber-400" /> Pending Review
                                </span>
                              )}
                              {isApproved && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
                                </span>
                              )}
                              {isRejected && (
                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 w-fit">
                                  <XCircle className="w-3 h-3 text-rose-400" /> Rejected / Cancelled
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleApproveTxn(t.id, t.senderName)}
                                    disabled={isBusy}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer"
                                    title="Approve transaction and credit recipient account"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isBusy ? 'Processing...' : 'Approve & Credit'}
                                  </button>

                                  <button
                                    onClick={() => handleRejectTxn(t.id)}
                                    disabled={isBusy}
                                    className="bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Reject transaction and refund user balance"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    {isBusy ? 'Processing...' : 'Reject / Cancel'}
                                  </button>
                                </>
                              ) : isApproved ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Action Complete: Approved
                                </span>
                              ) : (
                                <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> Action Complete: Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Sub-Tab 1: User Directory & Search */}
      {subTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Registered User Directory & Accounts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Search clients by email, 10-digit account number, or name.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email, account #..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
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
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="py-3 px-3 font-medium">
                        <div className="font-semibold text-white">{u.fullName}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                        {u.accountNumber}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-white">
                        ${(Number(u.balance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {u.transferCodeApproved && u.fourDigitCode ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded">
                            {u.fourDigitCode}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Not Issued (Activation Req)</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
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

                      <td className="py-3 px-3 text-right space-x-2">
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
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors"
                        >
                          Toggle Role
                        </button>
                      </td>
                    </tr>
                  ))
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

            {/* Crypto Workflow Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
              <button
                onClick={() => setCryptoFilter('Pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  cryptoFilter === 'Pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Review</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  cryptoFilter === 'Pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {cryptoDeposits.filter(d => d.status === 'Pending').length}
                </span>
              </button>

              <button
                onClick={() => setCryptoFilter('Approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  cryptoFilter === 'Approved'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved History</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  cryptoFilter === 'Approved' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {cryptoDeposits.filter(d => d.status === 'Approved').length}
                </span>
              </button>

              <button
                onClick={() => setCryptoFilter('Rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  cryptoFilter === 'Rejected'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected History</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  cryptoFilter === 'Rejected' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {cryptoDeposits.filter(d => d.status === 'Rejected').length}
                </span>
              </button>

              <button
                onClick={() => setCryptoFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  cryptoFilter === 'All'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>All Requests</span>
                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {cryptoDeposits.length}
                </span>
              </button>
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
                  ) : (() => {
                    const filteredCrypto = cryptoDeposits.filter(dep => {
                      if (cryptoFilter === 'Pending') return dep.status === 'Pending';
                      if (cryptoFilter === 'Approved') return dep.status === 'Approved';
                      if (cryptoFilter === 'Rejected') return dep.status === 'Rejected';
                      return true;
                    });

                    if (filteredCrypto.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            No {cryptoFilter.toLowerCase()} crypto activation deposit requests found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredCrypto.map((dep) => {
                      const isPending = dep.status === 'Pending';
                      const isApproved = dep.status === 'Approved';
                      const isBusy = processingIds[dep.id];

                      return (
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
                            {isPending && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 animate-spin" /> Pending Review
                              </span>
                            )}
                            {isApproved && (
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
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleApproveCrypto(dep.id)}
                                  disabled={isBusy}
                                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-3 py-1 rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {isBusy ? 'Processing...' : 'Approve & Issue Code'}
                                </button>
                                <button
                                  onClick={() => handleRejectCrypto(dep.id)}
                                  disabled={isBusy}
                                  className="bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  {isBusy ? 'Processing...' : 'Reject / Cancel'}
                                </button>
                              </>
                            ) : isApproved ? (
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Action Complete: Code Issued
                              </span>
                            ) : (
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Action Complete: Rejected
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
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

            <div className="overflow-x-auto">
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
                  {loadingTxns ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">Loading system transactions...</td>
                    </tr>
                  ) : sysTxns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">No transactions recorded.</td>
                    </tr>
                  ) : (
                    sysTxns.map((t) => {
                      const isBusy = processingIds[t.id];
                      return (
                      <tr key={t.id} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-3 px-3 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-mono text-amber-400">{t.reference}</td>
                        <td className="py-3 px-3">{t.userEmail}</td>
                        <td className="py-3 px-3 font-semibold">{t.type}</td>
                        <td className="py-3 px-3 font-bold text-white">${(Number(t.amount) || 0).toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (t.status === 'Completed' || t.status === 'Approved') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            (t.status === 'Cancelled' || t.status === 'Rejected') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          {t.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveTxn(t.id, t.senderName)}
                                disabled={isBusy}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                                title="Approve & Credit Recipient (Requires Sender Name)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> {isBusy ? 'Processing...' : 'Approve & Credit'}
                              </button>
                              <button
                                onClick={() => handleRejectTxn(t.id)}
                                disabled={isBusy}
                                className="bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                                title="Reject & Refund Sender"
                              >
                                <XCircle className="w-3 h-3" /> {isBusy ? 'Processing...' : 'Reject & Refund'}
                              </button>
                            </>
                          ) : t.status !== 'Cancelled' && t.status !== 'Rejected' ? (
                            <>
                              <button
                                onClick={() => handleRejectTxn(t.id)}
                                disabled={isBusy}
                                className="bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                                title="Reject & Refund User"
                              >
                                <XCircle className="w-3 h-3" /> Reject & Refund
                              </button>
                              <button
                                onClick={() => handleCancelTxn(t.id)}
                                disabled={isBusy}
                                className="bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">{t.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

          {/* Verifications Workflow Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
            <button
              onClick={() => setVerifFilter('Pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                verifFilter === 'Pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                verifFilter === 'Pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {verifications.filter(v => v.status === 'Pending').length}
              </span>
            </button>

            <button
              onClick={() => setVerifFilter('Approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                verifFilter === 'Approved'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                verifFilter === 'Approved' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {verifications.filter(v => v.status === 'Approved').length}
              </span>
            </button>

            <button
              onClick={() => setVerifFilter('Rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                verifFilter === 'Rejected'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                verifFilter === 'Rejected' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {verifications.filter(v => v.status === 'Rejected').length}
              </span>
            </button>

            <button
              onClick={() => setVerifFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                verifFilter === 'All'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Requests</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {verifications.length}
              </span>
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
                ) : (() => {
                  const filteredVerifs = verifications.filter(v => {
                    if (verifFilter === 'Pending') return v.status === 'Pending';
                    if (verifFilter === 'Approved') return v.status === 'Approved';
                    if (verifFilter === 'Rejected') return v.status === 'Rejected';
                    return true;
                  });

                  if (filteredVerifs.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          No {verifFilter.toLowerCase()} Tier 3 verification requests found.
                        </td>
                      </tr>
                    );
                  }

                  return filteredVerifs.map((v) => {
                    const isPending = v.status === 'Pending';
                    const isApproved = v.status === 'Approved';
                    const isBusy = processingIds[v.id];

                    return (
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
                          {isPending && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 animate-spin" /> Pending Review
                            </span>
                          )}
                          {isApproved && (
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
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveVerif(v.id)}
                                disabled={isBusy}
                                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 px-3 py-1 rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isBusy ? 'Processing...' : 'Upgrade Approval'}
                              </button>
                              <button
                                onClick={() => handleRejectVerif(v.id)}
                                disabled={isBusy}
                                className="bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {isBusy ? 'Processing...' : 'Reject / Cancel'}
                              </button>
                            </>
                          ) : isApproved ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Action Complete: Approved
                            </span>
                          ) : (
                            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Action Complete: Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
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
        <CustomerSupportPanel user={adminUser} />
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
    </div>
  );
};
