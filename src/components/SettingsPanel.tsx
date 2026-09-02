import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { ShieldCheck, Lock, Bell, Key, CheckCircle2, AlertCircle, Smartphone, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security & Preferences</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your password, authentication factors, and account notification triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          Authentication & Safeguards
        </h3>

        {prefMsg && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            prefMsg.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
          }`}>
            {prefMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{prefMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* 2FA Toggle */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Require security code verification on new device sign-ins.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactor(!twoFactor)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {twoFactor ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {/* Email Notifications Toggle */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Email Transaction Alerts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Receive instant email receipts for deposits, transfers, and wire withdrawals.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmailNotif(!emailNotif)}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {emailNotif ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>

          {/* SMS Notifications Toggle */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">SMS Mobile Alerts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send text message notifications to your registered phone number.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSmsNotif(!smsNotif)}
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              {smsNotif ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={prefLoading}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors border border-slate-700"
        >
          {prefLoading ? 'Saving...' : 'Save Security & Alert Settings'}
        </button>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handleChangePassword} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Change Account Password
        </h3>

        {passMsg && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            passMsg.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
          }`}>
            {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{passMsg.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={passLoading || !oldPassword || !newPassword || !confirmPassword}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
        >
          {passLoading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </div>
  );
};
