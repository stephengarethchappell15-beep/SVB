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
  ArrowUpRight
} from 'lucide-react';
import { User } from '../types';

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
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      action: () => setActiveTab('dashboard')
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: Building2,
      action: () => setActiveTab('dashboard')
    },
    {
      id: 'send',
      label: 'Transfer Funds',
      icon: ArrowLeftRight,
      action: () => setActiveTab('send')
    },
    {
      id: 'bills',
      label: 'Pay Bills',
      icon: Receipt,
      action: () => setActiveTab('bills')
    },
    {
      id: 'cards',
      label: 'Card Program',
      icon: CreditCard,
      action: () => setActiveTab('cards')
    },
    {
      id: 'withdraw',
      label: 'Wire Withdrawal',
      icon: ArrowUpRight,
      action: () => setActiveTab('withdraw')
    },
    {
      id: 'fraud',
      label: 'Fraud Control Services',
      icon: ShieldAlert,
      action: () => {
        if (onOpenFraudControl) onOpenFraudControl();
        else setActiveTab('support');
      }
    },
    {
      id: 'history',
      label: 'Statements & Reports',
      icon: FileText,
      action: () => setActiveTab('history')
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'SVB Review Portal',
      icon: Sparkles,
      action: () => setActiveTab('admin')
    }] : []),
    {
      id: 'support',
      label: 'Service Requests',
      icon: ClipboardList,
      action: () => setActiveTab('support')
    },
    {
      id: 'settings',
      label: 'Integrations',
      icon: Grid,
      action: () => setActiveTab('settings')
    }
  ];

  return (
    <aside className="bg-[#0f2232] w-52 sm:w-56 shrink-0 min-h-[calc(100vh-64px)] hidden md:flex flex-col py-2 border-r border-[#0b1723] text-white">
      <div className="space-y-1 px-1.5">
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
    </aside>
  );
};
