import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SidebarNav } from './components/SidebarNav';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { SendPanel } from './components/SendPanel';
import { WithdrawPanel } from './components/WithdrawPanel';
import { ReceivePanel } from './components/ReceivePanel';
import { ProfilePanel } from './components/ProfilePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { CustomerSupportPanel } from './components/CustomerSupportPanel';
import { AdminPanel } from './components/AdminPanel';
import { TransactionHistory } from './components/TransactionHistory';
import { ReceiptModal } from './components/ReceiptModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { VirtualCardsPanel } from './components/VirtualCardsPanel';
import { BillPayPanel } from './components/BillPayPanel';
import { Homepage } from './components/Homepage';
import { LegalModal, LegalDocType } from './components/LegalModal';
import { SupportChatWidget } from './components/SupportChatWidget';
import { api, getStoredToken, removeStoredToken } from './services/api';
import { dbStore } from './services/dbStore';
import { subscribeRealtimeUpdates } from './services/realtimeBus';
import { subscribeUserFromFirestore, subscribeTransactionsFromFirestore, subscribeAllUsersFromFirestore, syncAllDefaultTicketsToFirestore } from './lib/firebase';
import { subscribeAdminAlerts, AdminAlert } from './services/adminAlerts';
import { calculateUserBalance } from './utils/balance';
import { User, Transaction, UserNotification } from './types';
import { ShieldCheck, Building2, ShieldAlert, Bell, ArrowUpRight, X, ArrowLeft, LayoutGrid } from 'lucide-react';
import { deduplicateTransactions } from './utils/transactions';

type NavTabType = 'home' | 'dashboard' | 'cards' | 'bills' | 'deposit' | 'withdraw' | 'send' | 'receive' | 'history' | 'profile' | 'settings' | 'support' | 'admin';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabType>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashTab = window.location.hash.replace('#', '') as NavTabType;
      const validTabs: NavTabType[] = ['home', 'dashboard', 'cards', 'bills', 'deposit', 'withdraw', 'send', 'receive', 'history', 'profile', 'settings', 'support', 'admin'];
      if (validTabs.includes(hashTab)) return hashTab;
    }
    return 'dashboard';
  });
  const [navHistory, setNavHistory] = useState<NavTabType[]>(['dashboard']);

  
  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  // Modals & Drawers
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [receiptTxn, setReceiptTxn] = useState<Transaction | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalDocType>('privacy');
  const [globalAdminAlert, setGlobalAdminAlert] = useState<AdminAlert | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      const unsub = subscribeAdminAlerts((alert) => {
        setGlobalAdminAlert(alert);
      });
      return () => unsub();
    }
  }, [user?.role]);

  const openLegalDoc = (doc: LegalDocType) => {
    setLegalTab(doc);
    setShowLegalModal(true);
  };

  const [loading, setLoading] = useState(true);

  // Initialize session or default demo user
  const initSession = async () => {
    setLoading(true);
    try {
      // Seed user immediately from dbStore to prevent landing page flashes
      const localUser = dbStore.getCurrentUser();
      if (localUser) {
        setUser(localUser);
        if (localUser.role === 'admin' && activeTab === 'home') {
          setActiveTab('admin');
        }
      }

      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
            if (res.user.role === 'admin' && activeTab === 'home') {
              setActiveTab('admin');
            }
          }
        } catch (apiErr) {
          console.warn('api.getMe error, preserving local session:', apiErr);
          const fallbackUser = dbStore.getCurrentUser();
          if (fallbackUser) {
            setUser(fallbackUser);
          }
        }
      }
    } catch (err) {
      console.warn('Session restoration error:', err);
      const fallbackUser = dbStore.getCurrentUser();
      if (fallbackUser) {
        setUser(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
    const unsubAllUsers = subscribeAllUsersFromFirestore((allFsUsers) => {
      allFsUsers.forEach(u => {
        if (u && u.email) {
          dbStore.cacheUser(u);
        }
      });
    });

    // Ensure all default & local support tickets (including ifuu1@gmail.com) are synced to Firestore
    try {
      const allLocalTickets = dbStore.getSupportTickets(undefined, true);
      if (allLocalTickets && allLocalTickets.length > 0) {
        syncAllDefaultTicketsToFirestore(allLocalTickets).catch(() => null);
      }
    } catch (e) {
      console.warn('Initial support tickets Firestore sync warning:', e);
    }

    return () => unsubAllUsers();
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch data when user or activeTab changes
  const fetchData = async () => {
    if (!user) return;

    try {
      if (user.role === 'admin') {
        const txnsRes = await api.getAllTransactions();
        if (txnsRes?.transactions) setTransactions(txnsRes.transactions);
      } else {
        const txnsRes = await api.getTransactions();
        if (txnsRes?.transactions) setTransactions(txnsRes.transactions);
      }

      const notifsRes = await api.getNotifications();
      if (notifsRes?.notifications) setNotifications(notifsRes.notifications);
    } catch (err) {
      console.warn('Data fetch warning:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Stable 10s background sync
    
    // Instant cross-tab / same-tab realtime event bus listener
    const unsubRealtimeBus = subscribeRealtimeUpdates(() => {
      fetchData();
      refreshUser();
    });

    return () => {
      clearInterval(interval);
      unsubRealtimeBus();
    };
  }, [user?.id, activeTab]);

  // Real-time Firestore snapshot listeners (instantly sync balance & transactions across sessions without logging out)
  useEffect(() => {
    if (!user?.id) return;

    const unsubUser = subscribeUserFromFirestore(user.id, user.email, (updatedUser) => {
      setUser(prev => {
        if (!prev) return updatedUser;
        const currentTxns = dbStore.getTransactions(updatedUser.id);
        const { availableBalance, ledgerBalance } = calculateUserBalance(updatedUser, currentTxns);
        const merged = { 
          ...prev, 
          ...updatedUser,
          balance: Math.max(prev.balance || 0, updatedUser.balance || 0, availableBalance),
          ledgerBalance: Math.max(prev.ledgerBalance || 0, updatedUser.ledgerBalance || 0, ledgerBalance)
        };
        dbStore.saveUser(merged, true);
        return merged;
      });
    });

    const unsubTxns = subscribeTransactionsFromFirestore(
      user.role === 'admin' ? null : user,
      (fsTxns) => {
        fsTxns.forEach(t => dbStore.addTransaction(t));
        const mergedTxns = dbStore.getTransactions(user.role === 'admin' ? undefined : user.id);
        setTransactions(mergedTxns);
        
        // Reconcile user balance whenever new transactions are received
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const { availableBalance, ledgerBalance } = calculateUserBalance(prevUser, mergedTxns);
          const reconciled = { 
            ...prevUser, 
            balance: Math.max(prevUser.balance || 0, availableBalance), 
            ledgerBalance: Math.max(prevUser.ledgerBalance || 0, ledgerBalance) 
          };
          dbStore.saveUser(reconciled, true);
          return reconciled;
        });
      }
    );

    return () => {
      unsubUser();
      unsubTxns();
    };
  }, [user?.id, user?.email, user?.role]);

  const navigateToTab = (newTab: NavTabType, pushHistory = true) => {
    if (newTab === activeTab) return;
    if (pushHistory && typeof window !== 'undefined') {
      setNavHistory(prev => [...prev, newTab]);
      const targetHash = newTab === 'dashboard' ? '' : `#${newTab}`;
      window.history.pushState({ tab: newTab }, '', window.location.pathname + targetHash);
    }
    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateBack = () => {
    // If a transaction receipt modal is open, cleanly close it first
    if (receiptTxn) {
      setReceiptTxn(null);
      return;
    }
    if (showNotifDrawer) {
      setShowNotifDrawer(false);
      return;
    }
    if (showLegalModal) {
      setShowLegalModal(false);
      return;
    }

    if (typeof window !== 'undefined' && window.history.state && window.history.state.tab) {
      window.history.back();
    } else {
      setNavHistory(prev => {
        if (prev.length > 1) {
          const nextStack = [...prev];
          nextStack.pop();
          const prevTab = nextStack[nextStack.length - 1];
          setActiveTab(prevTab || 'dashboard');
          const targetHash = prevTab === 'dashboard' ? '' : `#${prevTab}`;
          if (typeof window !== 'undefined') {
            window.history.replaceState({ tab: prevTab || 'dashboard' }, '', window.location.pathname + targetHash);
          }
          return nextStack;
        } else {
          setActiveTab('dashboard');
          if (typeof window !== 'undefined') {
            window.history.replaceState({ tab: 'dashboard' }, '', window.location.pathname);
          }
          return ['dashboard'];
        }
      });
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (receiptTxn) {
        setReceiptTxn(null);
      }
      let targetTab: any = e.state?.tab;
      if (!targetTab && typeof window !== 'undefined' && window.location.hash) {
        targetTab = window.location.hash.replace('#', '');
      }
      const validTabs: NavTabType[] = ['home', 'dashboard', 'cards', 'bills', 'deposit', 'withdraw', 'send', 'receive', 'history', 'profile', 'settings', 'support', 'admin'];
      if (validTabs.includes(targetTab)) {
        if (targetTab === 'home' && (user || dbStore.getStoredToken())) {
          setActiveTab('dashboard');
        } else {
          setActiveTab(targetTab);
        }
      } else {
        setActiveTab((user || dbStore.getStoredToken()) ? 'dashboard' : 'home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, receiptTxn]);

  const getTabLabel = (tab: NavTabType): string => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'cards': return 'Card Program & Virtual Cards';
      case 'bills': return 'Bill Pay Services';
      case 'deposit': return 'Account Deposits';
      case 'withdraw': return 'Wire Withdrawal';
      case 'send': return 'International Transfer & Wire';
      case 'receive': return 'Account Details & Direct Deposit';
      case 'history': return 'Transaction Records & History';
      case 'profile': return 'User Profile';
      case 'settings': return 'Account Settings & Integrations';
      case 'support': return 'Customer Support & Service Desk';
      case 'admin': return 'SVB Review Operations Portal';
      default: return tab;
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigateToTab('home');
    setShowAuthModal(true);
  };

  const handleQuickSwitch = async (email: string) => {
    setLoading(true);
    try {
      const pass = email === 'admin@svb.com' ? 'admin123' : 'user123';
      const res = await api.login({ email, password: pass });
      setUser(res.user);
      navigateToTab('dashboard');
    } catch (err) {
      console.error('Quick switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSuccess = (updatedUser: User, transaction: Transaction) => {
    if (user && updatedUser.id === user.id) {
      setUser(updatedUser);
    }
    fetchData();
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-[#0284c7] selection:text-white flex flex-col transition-colors duration-200 ${theme === 'light' ? 'light-mode bg-[#f1f3f5] text-slate-800' : 'dark-mode bg-[#0f172a] text-slate-100'}`}>
      
      {/* Top SVB Go Branding Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        unreadNotifsCount={unreadCount}
        onOpenNotifications={() => setShowNotifDrawer(true)}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthModal(true)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Layout Container with Sidebar */}
      <div className="flex-1 flex w-full min-h-[calc(100vh-64px)]">
        
        {/* Left Vertical Navigation Sidebar */}
        {user && activeTab !== 'home' && (
          <SidebarNav
            user={user}
            activeTab={activeTab}
            setActiveTab={navigateToTab}
            onOpenFraudControl={() => openLegalDoc('privacy')}
          />
        )}

        {/* Right Main Content Area */}
        <main className="flex-1 bg-transparent px-3 sm:px-6 py-5 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          
          {/* Functional Back Button & Breadcrumbs Navigation Bar */}
          {user && activeTab !== 'dashboard' && activeTab !== 'home' && (
            <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-200/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-16 z-30 py-2.5 px-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNavigateBack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#002b49] dark:text-slate-200 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm group"
                  title="Return to previous screen"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <button onClick={() => navigateToTab('dashboard')} className="hover:text-[#002b49] dark:hover:text-white transition-colors">
                    Dashboard
                  </button>
                  <span>/</span>
                  <span className="text-[#002b49] dark:text-white font-bold">{getTabLabel(activeTab)}</span>
                </div>
              </div>
              <button
                onClick={() => navigateToTab('dashboard')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#002b49] dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 text-slate-500 animate-pulse">
              <Building2 className="w-10 h-10 text-[#00a3e0]" />
              <p className="text-xs font-semibold">Connecting to Silicon Valley Bank Core Ledger...</p>
            </div>
          ) : activeTab === 'home' || !user ? (
            <Homepage
              onOpenAuth={() => setShowAuthModal(true)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <UserDashboard
                  user={user}
                  transactions={transactions}
                  notifications={notifications}
                  onOpenReceipt={(txn) => setReceiptTxn(txn)}
                  onNavigateTab={navigateToTab}
                  onNavigateToAdmin={() => navigateToTab('admin')}
                  onUserUpdated={(updated) => setUser(updated)}
                />
              )}

              {activeTab === 'cards' && (
                <VirtualCardsPanel
                  user={user}
                  onRefreshUser={refreshUser}
                />
              )}

              {activeTab === 'bills' && (
                <BillPayPanel
                  user={user}
                  onRefreshUser={refreshUser}
                />
              )}

              {activeTab === 'send' && (
                <SendPanel
                  user={user}
                  onSuccess={(updatedUser, txn) => {
                    setUser(updatedUser);
                    setReceiptTxn(txn);
                    fetchData();
                  }}
                  onNavigateTab={navigateToTab}
                />
              )}

              {activeTab === 'withdraw' && (
                <WithdrawPanel
                  user={user}
                  onSuccess={(updatedUser, txn) => {
                    setUser(updatedUser);
                    setReceiptTxn(txn);
                    fetchData();
                  }}
                  onNavigateTab={navigateToTab}
                />
              )}

              {activeTab === 'receive' && (
                <ReceivePanel user={user} />
              )}

              {activeTab === 'history' && (
                <TransactionHistory
                  transactions={transactions}
                  onOpenReceipt={(txn) => setReceiptTxn(txn)}
                  isAdmin={user.role === 'admin'}
                />
              )}

              {activeTab === 'profile' && (
                <ProfilePanel
                  user={user}
                  onUpdateUser={(updated) => setUser(updated)}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPanel
                  user={user}
                  onUpdateUser={(updated) => setUser(updated)}
                />
              )}

              {activeTab === 'support' && (
                <CustomerSupportPanel user={user} />
              )}

              {(activeTab === 'admin' || activeTab === 'deposit') && user.role === 'admin' && (
                <AdminPanel
                  adminUser={user}
                  onDepositSuccess={handleDepositSuccess}
                />
              )}

              {(activeTab === 'admin' || activeTab === 'deposit') && user.role !== 'admin' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-sm">
                  <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="text-lg font-bold text-[#002b49]">Access Denied: SVB Review Privilege Required</h3>
                  <p className="text-xs text-slate-500">
                    The SVB Review Operation Portal is strictly restricted to verified SVB Review authorization. Standard client accounts do not have permission to view or execute SVB Review actions.
                  </p>
                  <button
                    onClick={() => navigateToTab('dashboard')}
                    className="bg-[#002b49] hover:bg-[#001f35] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-400 font-medium">
            <button onClick={() => openLegalDoc('privacy')} className="hover:text-cyan-400 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => openLegalDoc('terms')} className="hover:text-cyan-400 transition-colors">Terms of Service</button>
            <span>•</span>
            <button onClick={() => openLegalDoc('about')} className="hover:text-cyan-400 transition-colors">About Us</button>
            <span>•</span>
            <button onClick={() => openLegalDoc('contact')} className="hover:text-cyan-400 transition-colors">Contact Us</button>
            <span>•</span>
            <button onClick={() => openLegalDoc('disclaimer')} className="hover:text-cyan-400 transition-colors">Disclaimer</button>
            <span>•</span>
            <button onClick={() => openLegalDoc('cookies')} className="hover:text-cyan-400 transition-colors">Cookie Policy</button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900 pt-4">
            <p>© 2026 Silicon Valley Bank (SVB) Core Banking Platform.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Banking SSL Encrypted</span>
              <span>•</span>
              <span>FDIC Insured Coverage</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Floating Admin Alert Toast Banner */}
      {globalAdminAlert && user?.role === 'admin' && activeTab !== 'admin' && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-slate-900/95 backdrop-blur-md border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-white animate-bounce-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 border border-amber-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  ⚡ Instant Admin Alert
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(globalAdminAlert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mt-1 truncate">{globalAdminAlert.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{globalAdminAlert.message}</p>
            </div>
            <button
              onClick={() => setGlobalAdminAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setActiveTab('admin');
                setGlobalAdminAlert(null);
              }}
              className="px-3.5 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black hover:bg-amber-400 transition-all flex items-center gap-1 shadow-lg"
            >
              <span>Open SVB Review Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Support Chat Widget for Logged In Client Users */}
      {user && user.role !== 'admin' && activeTab !== 'support' && <SupportChatWidget user={user} />}

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => {
          setUser(u);
          if (u.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />

      <ReceiptModal
        transaction={receiptTxn}
        onClose={() => setReceiptTxn(null)}
      />

      <NotificationsDrawer
        isOpen={showNotifDrawer}
        notifications={notifications}
        onClose={() => setShowNotifDrawer(false)}
        onMarkAllRead={handleMarkNotificationsRead}
      />

      <LegalModal
        isOpen={showLegalModal}
        initialTab={legalTab}
        onClose={() => setShowLegalModal(false)}
      />

    </div>
  );
}

