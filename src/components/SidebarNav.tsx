import React from 'react';
import { 
  LayoutGrid, 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  ShieldAlert, 
  FileText, 
  Sparkles, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronLeft,
  Headphones,
  SlidersHorizontal,
  ShieldCheck,
  ExternalLink
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

  const navGroups = [
    {
      group: 'Core Banking',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutGrid,
          action: () => handleNav('dashboard')
        },
        {
          id: 'accounts',
          label: 'Accounts Summary',
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
          label: 'Virtual Cards',
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
          id: 'receive',
          label: 'Receive & Deposit',
          icon: ArrowDownRight,
          action: () => handleNav('receive')
        }
      ]
    },
    {
      group: 'Compliance & Reports',
      items: [
        {
          id: 'history',
          label: 'Statements & Reports',
          icon: FileText,
          action: () => handleNav('history')
        },
        {
          id: 'fraud',
          label: 'Fraud Control Services',
          icon: ShieldAlert,
          action: () => {
            if (onOpenFraudControl) onOpenFraudControl();
            else handleNav('support');
          }
        }
      ]
    },
    {
      group: 'Support & Settings',
      items: [
        {
          id: 'support',
          label: 'Service Requests',
          icon: Headphones,
          action: () => handleNav('support')
        },
        {
          id: 'settings',
          label: 'Security & Preferences',
          icon: SlidersHorizontal,
          action: () => handleNav('settings')
        }
      ]
    },
    ...(user?.role === 'admin' ? [{
      group: 'Operations',
      items: [
        {
          id: 'admin',
          label: 'SVB Review Portal',
          icon: Sparkles,
          action: () => handleNav('admin'),
          isAdmin: true
        }
      ]
    }] : [])
  ];

  return (
    <aside className="bg-[#0b1723] w-64 shrink-0 min-h-[calc(100vh-64px)] hidden md:flex flex-col justify-between p-3.5 border-r border-[#152538] text-slate-200 select-none">
      <div className="space-y-5">
        
        {/* User Account Snapshot Pill */}
        {user && (
          <div className="p-3 bg-[#112338] border border-[#1b3452] rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {user.fullName}
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-wide block truncate">
                Acc #{user.accountNumber}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Account Active" />
          </div>
        )}

        {/* Back Button if in Subview */}
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="w-full py-2 px-3 rounded-xl flex items-center gap-2 bg-[#14283f] hover:bg-[#1a334f] text-cyan-300 font-semibold text-xs transition-colors border border-cyan-500/20 cursor-pointer"
            title={previousState?.title ? `Go back to ${previousState.title}` : 'Go back to previous screen'}
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">
              {previousState?.title ? `Back: ${previousState.title}` : 'Back to previous'}
            </span>
          </button>
        )}

        {/* Categorized Navigation Links */}
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-1">
                {group.group}
              </h4>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = 
                    activeTab === item.id || 
                    (item.id === 'accounts' && activeTab === 'dashboard');

                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`w-full py-2 px-3 rounded-xl flex items-center gap-3 text-left transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#00a3e0]/15 text-white font-bold border-l-3 border-[#00a3e0]'
                          : (item as any).isAdmin
                          ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 font-medium'
                          : 'text-slate-300 hover:bg-[#14283f] hover:text-white font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive 
                          ? 'text-[#00a3e0]' 
                          : (item as any).isAdmin
                          ? 'text-amber-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`} />
                      <span className="text-xs leading-none truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Sidebar Footer Security Status */}
      <div className="pt-4 border-t border-[#152538] space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 px-2 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>256-Bit SSL Core Encryption</span>
        </div>
        <div className="text-[10px] text-slate-500 px-2">
          <span>Silicon Valley Bank Platform v2026</span>
        </div>
      </div>
    </aside>
  );
};
