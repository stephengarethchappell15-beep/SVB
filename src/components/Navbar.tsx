import React, { useState } from 'react';
import { User } from '../types';
import { 
  Building2, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  CreditCard, 
  FileText, 
  History, 
  Check, 
  Sparkles,
  ChevronDown,
  Layers,
  Send,
  ArrowDownRight,
  Receipt,
  Headphones,
  Lock,
  Compass,
  Sun,
  Moon,
  HelpCircle,
  PhoneCall
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: 'home' | 'dashboard' | 'cards' | 'bills' | 'send' | 'withdraw' | 'history' | 'profile' | 'settings' | 'support' | 'admin';
  setActiveTab: (tab: 'home' | 'dashboard' | 'cards' | 'bills' | 'send' | 'withdraw' | 'history' | 'profile' | 'settings' | 'support' | 'admin') => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  onOpenNotifications,
  onLogout,
  onOpenAuth,
  theme,
  onToggleTheme,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Official SVB Logo */}
        <button 
          onClick={() => setActiveTab(user ? 'dashboard' : 'home')}
          className="flex items-center gap-3 group text-left transition-transform hover:opacity-95 focus:outline-none shrink-0"
        >
          <img 
            src="/svb-logo-light.svg" 
            alt="Silicon Valley Bank - A Division of First Citizens Bank" 
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </button>

        {/* Center: FDIC Insurance Banner */}
        <div className="hidden md:flex items-center gap-2 text-xs text-[#002b49] font-medium px-4 py-1 rounded-md bg-slate-50 border border-slate-200/80">
          <span className="font-extrabold text-[#002b49] bg-[#002b49] text-white px-1.5 py-0.5 rounded text-[10px] tracking-wide">
            FDIC
          </span>
          <span className="italic text-[11px] text-slate-600">
            FDIC-Insured - Backed by the full faith and credit of the U.S. Government
          </span>
        </div>

        {/* Right Controls: Contact Us, Help, Notifications, User Profile */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs font-semibold text-[#002b49]">
          
          <button 
            onClick={() => setActiveTab('support')}
            className="hidden sm:flex items-center gap-1 hover:text-[#00a3e0] transition-colors"
          >
            Contact Us
          </button>

          <button 
            onClick={() => setActiveTab('support')}
            className="hidden sm:flex items-center gap-1 hover:text-[#00a3e0] transition-colors"
          >
            Help
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-slate-600 hover:text-[#002b49] rounded-lg hover:bg-slate-100 transition-all border border-slate-200 flex items-center gap-1 text-[11px]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline text-slate-700">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#00a3e0]" />
                <span className="hidden xl:inline text-slate-700">Dark</span>
              </>
            )}
          </button>

          {user ? (
            <>
              {/* Notification Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-1.5 text-slate-600 hover:text-[#0f2232] rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                title="Account Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#0284c7] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* User Avatar & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-all text-left border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-[#002b49] flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden shrink-0">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showSwitchMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1 bg-slate-50 rounded-xl">
                      <p className="font-bold text-[#002b49]">{user.fullName}</p>
                      <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                      <p className="text-[#00a3e0] text-[10px] font-mono mt-0.5">Acc #{user.accountNumber}</p>
                    </div>

                    <div className="py-1 space-y-1">
                      <button
                        onClick={() => {
                          setShowSwitchMenu(false);
                          setActiveTab('profile');
                        }}
                        className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors font-medium"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        User Profile & Security
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowSwitchMenu(false);
                            setActiveTab('admin');
                          }}
                          className="w-full text-left px-3 py-1.5 text-amber-600 hover:bg-amber-50 rounded-xl flex items-center gap-2 transition-colors font-bold"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          SVB Review Portal
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowSwitchMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-[#002b49] hover:bg-[#001f35] text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
