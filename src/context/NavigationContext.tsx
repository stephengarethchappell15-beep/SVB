import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';

export type MainTabType = 
  | 'home' 
  | 'dashboard' 
  | 'cards' 
  | 'bills' 
  | 'deposit' 
  | 'withdraw' 
  | 'send' 
  | 'receive' 
  | 'history' 
  | 'profile' 
  | 'settings' 
  | 'support' 
  | 'admin';

export interface NavigationState {
  tab: MainTabType;
  subTab?: string;
  title: string;
  data?: any;
}

export const TAB_TITLES: Record<MainTabType, string> = {
  home: 'Home',
  dashboard: 'Dashboard',
  cards: 'Virtual Cards',
  bills: 'Bill Pay & Utilities',
  deposit: 'Direct Deposit',
  withdraw: 'Withdraw Funds',
  send: 'Wire Transfer',
  receive: 'Receive Wire & Crypto',
  history: 'Transaction History',
  profile: 'Account Profile',
  settings: 'Security & Settings',
  support: 'Customer Support',
  admin: 'SVB Review Admin Portal'
};

export const ADMIN_SUBTAB_TITLES: Record<string, string> = {
  pending: 'Pending SVB Review Queue',
  users: 'User Directory',
  funding: 'Direct Account Deposit',
  crypto: 'Crypto Verification & Wallets',
  withdraw: 'Administrative Debit',
  audit: 'System Audit Logs',
  support: 'Support Ticket Manager',
  verifications: 'Tier 3 Identity Reviews'
};

interface NavigationContextType {
  activeTab: MainTabType;
  currentSubTab?: string;
  currentTitle: string;
  historyStack: NavigationState[];
  canGoBack: boolean;
  previousState: NavigationState | null;
  navigateTo: (tab: MainTabType, options?: { subTab?: string; title?: string; replace?: boolean; data?: any }) => void;
  setSubTab: (subTab: string, title?: string) => void;
  goBack: () => void;
  resetHistory: (initialTab: MainTabType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode; user: User | null }> = ({ children, user }) => {
  const defaultTab: MainTabType = user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'home';
  
  const [historyStack, setHistoryStack] = useState<NavigationState[]>([
    { tab: defaultTab, title: TAB_TITLES[defaultTab] }
  ]);

  const currentState = historyStack[historyStack.length - 1] || {
    tab: defaultTab,
    title: TAB_TITLES[defaultTab]
  };

  const previousState = historyStack.length > 1 ? historyStack[historyStack.length - 2] : null;

  // Sync with browser history popstate (Back/Forward buttons)
  useEffect(() => {
    // Initial state push so back button has something to pop
    if (!window.history.state) {
      window.history.replaceState({ tab: currentState.tab, subTab: currentState.subTab, index: 0 }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        const targetTab: MainTabType = event.state.tab;
        const targetSubTab: string | undefined = event.state.subTab;
        const targetTitle = targetSubTab && ADMIN_SUBTAB_TITLES[targetSubTab] 
          ? ADMIN_SUBTAB_TITLES[targetSubTab] 
          : TAB_TITLES[targetTab] || targetTab;

        setHistoryStack(prev => {
          // If we have history to pop back to
          if (prev.length > 1) {
            return prev.slice(0, prev.length - 1);
          }
          return [{ tab: targetTab, subTab: targetSubTab, title: targetTitle }];
        });
      } else {
        // If state is empty, pop or fallback to default
        setHistoryStack(prev => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((
    tab: MainTabType,
    options?: { subTab?: string; title?: string; replace?: boolean; data?: any }
  ) => {
    const title = options?.title || (options?.subTab && ADMIN_SUBTAB_TITLES[options.subTab]) || TAB_TITLES[tab] || tab;
    const newState: NavigationState = {
      tab,
      subTab: options?.subTab,
      title,
      data: options?.data
    };

    setHistoryStack(prev => {
      const current = prev[prev.length - 1];
      if (current && current.tab === tab && current.subTab === options?.subTab && !options?.replace) {
        return prev; // Already on this tab/subTab
      }

      if (options?.replace) {
        const updated = [...prev];
        updated[updated.length - 1] = newState;
        window.history.replaceState({ tab, subTab: options?.subTab, index: updated.length - 1 }, '');
        return updated;
      }

      const nextStack = [...prev, newState];
      window.history.pushState({ tab, subTab: options?.subTab, index: nextStack.length - 1 }, '');
      return nextStack;
    });
  }, []);

  const setSubTab = useCallback((subTab: string, customTitle?: string) => {
    const title = customTitle || ADMIN_SUBTAB_TITLES[subTab] || subTab;
    setHistoryStack(prev => {
      const current = prev[prev.length - 1];
      if (!current) return prev;
      if (current.subTab === subTab) return prev;

      const newState: NavigationState = {
        ...current,
        subTab,
        title
      };

      const nextStack = [...prev, newState];
      window.history.pushState({ tab: current.tab, subTab, index: nextStack.length - 1 }, '');
      return nextStack;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistoryStack(prev => {
      if (prev.length > 1) {
        const nextStack = prev.slice(0, prev.length - 1);
        const target = nextStack[nextStack.length - 1];
        window.history.back();
        return nextStack;
      }
      
      // Fallback when stack is empty but we're not on dashboard/home
      const fallbackTab: MainTabType = user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'home';
      if (prev.length === 1 && prev[0].tab !== fallbackTab) {
        const fallbackState: NavigationState = {
          tab: fallbackTab,
          title: TAB_TITLES[fallbackTab]
        };
        window.history.pushState({ tab: fallbackTab, index: 0 }, '');
        return [fallbackState];
      }

      return prev;
    });
  }, [user]);

  const resetHistory = useCallback((initialTab: MainTabType) => {
    const title = TAB_TITLES[initialTab] || initialTab;
    setHistoryStack([{ tab: initialTab, title }]);
    window.history.replaceState({ tab: initialTab, index: 0 }, '');
  }, []);

  // Determine if user can go back
  const fallbackRoot: MainTabType = user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'home';
  const isAtRoot = currentState.tab === fallbackRoot && !currentState.subTab;
  const canGoBack = historyStack.length > 1 || !isAtRoot;

  return (
    <NavigationContext.Provider
      value={{
        activeTab: currentState.tab,
        currentSubTab: currentState.subTab,
        currentTitle: currentState.title,
        historyStack,
        canGoBack,
        previousState,
        navigateTo,
        setSubTab,
        goBack,
        resetHistory
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
