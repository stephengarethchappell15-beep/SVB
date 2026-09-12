import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { BankingMediaCarousel } from './BankingMediaCarousel';
import { 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  User as UserIcon, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  Hash,
  ArrowRight,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Register Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accountPin, setAccountPin] = useState('');

  // Forgot Password Form State
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCodeDisplay, setGeneratedCodeDisplay] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.register({ fullName, email, phone, password, accountPin });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.requestPasswordReset(email);
      setCodeSent(true);
      setGeneratedCodeDisplay(res.code);
      setSuccessMsg(`Verification code sent to ${email}. Verification Code: ${res.code}`);
    } catch (err: any) {
      setError(err.message || 'Failed to request reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await api.verifyAndResetPassword(email, resetCode, newPassword);
      setSuccessMsg('Password updated successfully! You can now log in.');
      setTimeout(() => {
        setTab('login');
        setCodeSent(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-6 relative grid grid-cols-1 lg:grid-cols-12">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold p-1 z-20 bg-slate-950/60 rounded-full w-8 h-8 flex items-center justify-center border border-slate-800"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* LEFT COLUMN: Banking Media Carousel & Video (Desktop & Tablet) */}
        <div className="lg:col-span-5 hidden lg:block p-4 border-r border-slate-800 bg-slate-950 flex flex-col justify-between">
          <BankingMediaCarousel showVideo={true} className="h-full min-h-[460px]" />
        </div>

        {/* RIGHT COLUMN: Auth Navigation & Form */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          
          {/* Header Banner (Mobile Only) */}
          <div className="lg:hidden relative overflow-hidden h-36 bg-slate-950 flex flex-col items-center justify-center p-4 text-center border-b border-slate-800">
            <img
              src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80"
              alt="Mobile banking graphic"
              className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30" />
            <div className="relative z-10 flex flex-col items-center">
              <img src="/svb-logo.svg" alt="Silicon Valley Bank Logo" className="h-8 w-auto object-contain mb-1" />
              <p className="text-[11px] text-slate-300 font-semibold">Official Online Banking Portal</p>
            </div>
          </div>

          {/* Desktop Top Header Bar */}
          <div className="hidden lg:flex items-center justify-between px-6 pt-6 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <img src="/svb-logo.svg" alt="Silicon Valley Bank Logo" className="h-8 w-auto object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> 256-Bit SSL Encrypted
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 mx-6 mt-4 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setTab('forgot'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'forgot'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reset Password
            </button>
          </div>

        {/* Body Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@svb.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Security PIN (4 Digits)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    maxLength={4}
                    required
                    pattern="\d{4}"
                    value={accountPin}
                    onChange={(e) => setAccountPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Set your personal 4-digit Account Security PIN.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Profile...' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@svb.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Banking Portal'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <div>
              {!codeSent ? (
                <form onSubmit={handleRequestResetCode} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Account Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex.wright@svb.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Sending Code...' : 'Request Reset Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Verification Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Resetting Password...' : 'Verify & Set New Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

          {/* Security Assurance Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              256-Bit SSL Encrypted Official SVB Gateway
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

