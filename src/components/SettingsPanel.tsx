import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { ShieldCheck, Lock, Bell, Key, CheckCircle2, AlertCircle, Smartphone, Mail, ToggleLeft, ToggleRight, SlidersHorizontal } from 'lucide-react';
import { BackButton } from './BackButton';

interface SettingsPanelProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ user, onUpdateUser }) => {
  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preference Toggles
  const [twoFactor, setTwoFactor] = useState(user.twoFactorEnabled ?? true);
  const [emailNotif, setEmailNotif] = useState(user.emailNotifications ?? true);
  const [smsNotif, setSmsNotif] = useState(user.smsNotifications ?? false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    try {
      setPassLoading(true);
      await api.changePassword(oldPassword, newPassword);
      setPassMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPassLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefMsg(null);
    try {
      setPrefLoading(true);
      const res = await api.updateSecuritySettings({
        twoFactorEnabled: twoFactor,
        emailNotifications: emailNotif,
        smsNotifications: smsNotif
      });
      onUpdateUser(res.user);
      setPrefMsg({ type: 'success', text: 'Security and notification preferences updated.' });
    } catch (err: any) {
      setPrefMsg({ type: 'error', text: err.message || 'Failed to update preferences.' });
    } finally {
      setPrefLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Title Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#002b49] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <SlidersHorizontal className="w-6 h-6 text-[#00a3e0]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your credentials, dual-factor authentication triggers, and transaction notification preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-[#00a3e0]" />
          Authentication & Safeguards
        </h3>

        {prefMsg && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs ${
            prefMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {prefMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{prefMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* 2FA Toggle */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#00a3e0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Require 4-digit security code confirmation on outgoing wire transfers.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactor(!twoFactor)}
              className="text-[#00a3e0] hover:text-[#002b49] transition-colors cursor-pointer"
            >
              {twoFactor ? <ToggleRight className="w-9 h-9 text-emerald-600" /> : <ToggleLeft className="w-9 h-9 text-slate-400" />}
            </button>
          </div>

          {/* Email Notifications Toggle */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#00a3e0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Email Transaction Advisories</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Receive immediate receipt copies for deposits, wires, and bill payments.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmailNotif(!emailNotif)}
              className="text-[#00a3e0] hover:text-[#002b49] transition-colors cursor-pointer"
            >
              {emailNotif ? <ToggleRight className="w-9 h-9 text-emerald-600" /> : <ToggleLeft className="w-9 h-9 text-slate-400" />}
            </button>
          </div>

          {/* SMS Notifications Toggle */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-[#00a3e0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">SMS Mobile Alerts</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Send critical security verification alerts to your registered telephone number.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSmsNotif(!smsNotif)}
              className="text-[#00a3e0] hover:text-[#002b49] transition-colors cursor-pointer"
            >
              {smsNotif ? <ToggleRight className="w-9 h-9 text-emerald-600" /> : <ToggleLeft className="w-9 h-9 text-slate-400" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={prefLoading}
          className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          {prefLoading ? 'Saving Preferences...' : 'Save Security & Alert Settings'}
        </button>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handleChangePassword} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#00a3e0]" />
          Change Account Password
        </h3>

        {passMsg && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs ${
            passMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{passMsg.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={passLoading || !oldPassword || !newPassword || !confirmPassword}
          className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 cursor-pointer"
        >
          {passLoading ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};
