import React from 'react';
import { 
  LayoutGrid, 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  ShieldAlert, 
  FileText, 
  Briefcase, 
  Sparkles, 
  ClipboardList, 
  Grid,
  Receipt,
  Send,
  ArrowUpRight,
  ChevronLeft
} from 'lucide-react';
import { User } from '../types';
import { useNavigation } from '../context/NavigationContext';

interface SidebarNavProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenFraudControl?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenFraudControl
}) => {
  const { navigateTo, goBack, canGoBack, previousState } = useNavigation();

  const handleNav = (tab: any) => {
    if (setActiveTab) setActiveTab(tab);
    else navigateTo(tab);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      action: () => handleNav('dashboard')
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: Building2,
      action: () => handleNav('dashboard')
    },
    {
      id: 'send',
      label: 'Transfer Funds',
      icon: ArrowLeftRight,
      action: () => handleNav('send')
    },
    {
      id: 'bills',
      label: 'Pay Bills',
      icon: Receipt,
      action: () => handleNav('bills')
    },
    {
      id: 'cards',
      label: 'Card Program',
      icon: CreditCard,
      action: () => handleNav('cards')
    },
    {
      id: 'withdraw',
      label: 'Wire Withdrawal',
      icon: ArrowUpRight,
      action: () => handleNav('withdraw')
    },
    {
      id: 'fraud',
      label: 'Fraud Control Services',
      icon: ShieldAlert,
      action: () => {
        if (onOpenFraudControl) onOpenFraudControl();
        else handleNav('support');
      }
    },
    {
      id: 'history',
      label: 'Statements & Reports',
      icon: FileText,
      action: () => handleNav('history')
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'SVB Review Portal',
      icon: Sparkles,
      action: () => handleNav('admin')
    }] : []),
    {
      id: 'support',
      label: 'Service Requests',
      icon: ClipboardList,
      action: () => handleNav('support')
    },
    {
      id: 'settings',
      label: 'Integrations',
      icon: Grid,
      action: () => handleNav('settings')
    }
  ];

  return (
    <aside className="bg-[#0f2232] w-52 sm:w-56 shrink-0 min-h-[calc(100vh-64px)] hidden md:flex flex-col justify-between py-2 border-r border-[#0b1723] text-white">
      <div className="space-y-1 px-1.5">
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="w-full mb-2 py-2 px-3 rounded-lg flex items-center justify-center gap-2 bg-[#1a3347] hover:bg-[#234560] text-cyan-300 font-semibold text-xs transition-colors border border-cyan-500/20 cursor-pointer"
            title={previousState?.title ? `Go back to ${previousState.title}` : 'Go back to previous screen'}
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span className="truncate">Back</span>
          </button>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            activeTab === item.id || 
            (item.id === 'accounts' && activeTab === 'dashboard');

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full py-2.5 px-3 rounded-lg flex flex-col items-center justify-center text-center transition-all group ${
                isActive
                  ? 'bg-[#0284c7] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-[#1a3347] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="text-[11px] leading-tight font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {canGoBack && (
        <div className="px-2 pt-2 border-t border-[#1a3347]">
          <button
            type="button"
            onClick={goBack}
            className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-white hover:bg-[#1a3347] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      )}
    </aside>
  );
};

