import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ArrowLeftRight, 
  CreditCard, 
  FileText, 
  Menu, 
  X, 
  Building2, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Headphones, 
  SlidersHorizontal, 
  Sparkles, 
  LogOut,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types';

interface MobileNavProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  onOpenFraudControl?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenFraudControl
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!user || activeTab === 'home') return null;

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  const primaryMobileTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'send', label: 'Transfer', icon: ArrowLeftRight },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'history', label: 'Activity', icon: FileText }
  ];

  return (
    <>
      {/* 1. Mobile Fixed Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1723]/95 backdrop-blur-md border-t border-[#152538] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb"
      >
        {primaryMobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? 'text-[#00a3e0] font-bold' 
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#00a3e0]' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More / Menu Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isDrawerOpen 
              ? 'text-[#00a3e0] font-bold' 
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>

      {/* 2. Mobile Slide-Over Menu Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-4/5 max-w-xs bg-[#0b1723] h-full shadow-2xl flex flex-col justify-between p-5 border-l border-[#152538] text-white z-10 overflow-y-auto">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#152538]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#002b49] text-amber-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                    SVB
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white leading-tight">SVB Go Online</h3>
                    <p className="text-[10px] text-slate-400">Navigation Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-[#14283f] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Snapshot in Mobile Drawer */}
              <div className="mt-4 p-3 bg-[#112338] border border-[#1b3452] rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#002b49] text-white flex items-center justify-center text-[10px] font-bold">
                    <UserIcon className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">Acc #{user.accountNumber}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Items List */}
              <div className="mt-4 space-y-1">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Banking & Payments
                </p>

                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'dashboard' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Accounts Overview</span>
                </button>

                <button
                  onClick={() => handleNavClick('send')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'send' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                  <span>Transfer Funds</span>
                </button>

                <button
                  onClick={() => handleNavClick('bills')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'bills' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <span>Pay Bills</span>
                </button>

                <button
                  onClick={() => handleNavClick('cards')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'cards' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Virtual Cards</span>
                </button>

                <button
                  onClick={() => handleNavClick('withdraw')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'withdraw' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                  <span>Wire Withdrawal</span>
                </button>

                <button
                  onClick={() => handleNavClick('receive')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'receive' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-cyan-400" />
                  <span>Receive & Deposit</span>
                </button>

                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 pt-3">
                  Reports & Controls
                </p>

                <button
                  onClick={() => handleNavClick('history')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'history' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Statements & Reports</span>
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    if (onOpenFraudControl) onOpenFraudControl();
                    else handleNavClick('support');
                  }}
                  className="w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left text-slate-300 hover:bg-[#14283f] transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Fraud Control Services</span>
                </button>

                <button
                  onClick={() => handleNavClick('support')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'support' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <Headphones className="w-4 h-4 text-cyan-400" />
                  <span>Service Requests</span>
                </button>

                <button
                  onClick={() => handleNavClick('settings')}
                  className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors ${
                    activeTab === 'settings' ? 'bg-[#00a3e0]/20 text-[#00a3e0] font-bold' : 'text-slate-300 hover:bg-[#14283f]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span>Security & Preferences</span>
                </button>

                {user.role === 'admin' && (
                  <button
                    onClick={() => handleNavClick('admin')}
                    className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs text-left transition-colors font-bold ${
                      activeTab === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>SVB Review Portal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#152538] space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>FDIC Insured • 256-Bit SSL</span>
              </div>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onLogout();
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
