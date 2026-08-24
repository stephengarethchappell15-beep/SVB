import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BankingMediaCarousel } from './BankingMediaCarousel';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Globe, 
  Zap, 
  Layers, 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  Headphones,
  Award,
  TrendingUp,
  FileCheck2,
  DollarSign,
  Wifi,
  Cloud,
  ChevronRight,
  Sparkles,
  Shield,
  Smartphone,
  RefreshCw,
  Send,
  Check
} from 'lucide-react';

interface HomepageProps {
  onOpenAuth: () => void;
}

export const Homepage: React.FC<HomepageProps> = ({ onOpenAuth }) => {
  const [wireAmount, setWireAmount] = useState('25000');
  const [currency, setCurrency] = useState('USD');

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* HERO SECTION WITH BACKGROUND VIDEO & MEDIA CAROUSEL */}
      <section className="relative pt-12 pb-24 border-b border-slate-800/80 bg-slate-950">
        
        {/* Short Banking-Themed Background Video (Muted, AutoPlay, Continuous Loop) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter saturate-150 blur-sm scale-105"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-graphs-41551-large.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950" />
        </div>

        {/* Glow ambient backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyan-400/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header Tag */}
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wide shadow-lg shadow-cyan-500/10"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Silicon Valley Bank Next-Gen Digital Banking</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]"
            >
              Intelligent Global Banking for <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                Enterprise & Venture Pioneers
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            >
              Experience seamless corporate accounts, 256-bit encrypted wires, multi-currency virtual cards, and institutional treasury controls on a unified modern platform.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-2"
            >
              <button
                onClick={onOpenAuth}
                className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 text-sm flex items-center gap-2"
              >
                <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Access Online Banking</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </div>

          {/* HIGH-QUALITY AUTOMATIC BANKING SLIDER CAROUSEL */}
          <div className="mt-12 max-w-5xl mx-auto">
            <BankingMediaCarousel showVideo={false} className="h-[360px] sm:h-[400px]" />
          </div>

          {/* MAIN GRAPHIC: MOBILE BANKING WITH FLOATING CONNECTED NODES (INSPIRED BY REFERENCE IMAGE) */}
          <div className="mt-16 relative max-w-5xl mx-auto">
            
            {/* Background SVG Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block" viewBox="0 0 1000 600" fill="none">
              <path d="M 180 150 Q 320 180 500 240" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
              <path d="M 820 150 Q 680 180 500 240" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
              <path d="M 120 320 Q 300 320 500 340" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 880 320 Q 700 320 500 340" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 220 480 Q 340 440 500 420" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="6 6" />
              <path d="M 780 480 Q 660 440 500 420" stroke="url(#cyan-gradient)" strokeWidth="2" strokeDasharray="6 6" />
              <defs>
                <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
              
              {/* Left Floating Nodes Column */}
              <div className="md:col-span-3 space-y-6 hidden md:block">
                {/* Node 1: Instant Transfers */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Instant Settlement</p>
                    <p className="text-[10px] text-slate-400">Zero-Fee ACH & Wire</p>
                  </div>
                </motion.div>

                {/* Node 2: Institutional Vault */}
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">SVB Core Treasury</p>
                    <p className="text-[10px] text-slate-400">FDIC Insured Protection</p>
                  </div>
                </motion.div>

                {/* Node 3: Encrypted Cloud Backup */}
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Encrypted Ledger</p>
                    <p className="text-[10px] text-slate-400">Real-Time Audit Trail</p>
                  </div>
                </motion.div>
              </div>

              {/* CENTER MOBILE BANKING APP MOCKUP */}
              <div className="md:col-span-6 flex justify-center">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7 }}
                  className="relative w-full max-w-[340px] bg-slate-950 border-4 border-slate-800 rounded-[44px] shadow-2xl shadow-cyan-500/20 p-4 overflow-hidden"
                >
                  {/* Smartphone Dynamic Island / Speaker Notch */}
                  <div className="w-32 h-4 bg-slate-900 mx-auto rounded-full mb-4 flex items-center justify-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                    <div className="w-8 h-1 bg-slate-800 rounded-full" />
                  </div>

                  {/* App Header Bar */}
                  <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white leading-none">SVB Core</p>
                        <p className="text-[9px] text-emerald-400 font-medium">Secured Node Active</p>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>

                  {/* Account Balance Visual */}
                  <div className="bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 p-4 rounded-2xl border border-cyan-500/30 mb-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Commercial Operating</span>
                      <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[9px] font-bold">USD</span>
                    </div>
                    <p className="text-2xl font-black font-mono text-white tracking-tight">$ 1,482,950.00</p>
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +$42,500 Today
                      </span>
                      <span className="text-slate-400">Verified SVB Account</span>
                    </div>
                  </div>

                  {/* Quick Action Pills inside Mobile UI */}
                  <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                      <Send className="w-3.5 h-3.5 text-cyan-400 mb-1" />
                      <span className="text-[9px] text-slate-300 font-medium">Transfer</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400 mb-1" />
                      <span className="text-[9px] text-slate-300 font-medium">Cards</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                      <Receipt className="w-3.5 h-3.5 text-indigo-400 mb-1" />
                      <span className="text-[9px] text-slate-300 font-medium">Bills</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                      <span className="text-[9px] text-slate-300 font-medium">Security</span>
                    </div>
                  </div>

                  {/* Micro Card Graphic inside Phone */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 rounded-2xl border border-slate-700/80 flex items-center justify-between mb-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-200">SVB Corporate Black Titanium</p>
                      <p className="text-[9px] font-mono text-slate-400">•••• •••• •••• 9482</p>
                    </div>
                    <div className="w-7 h-5 bg-gradient-to-tr from-amber-400 to-amber-200 rounded shrink-0 flex items-center justify-center text-[7px] font-black text-slate-950">
                      CHIP
                    </div>
                  </div>

                  {/* Action Login Button inside Phone Mockup */}
                  <button
                    onClick={onOpenAuth}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure Sign In</span>
                  </button>

                  <p className="text-[9px] text-slate-500 text-center mt-2">
                    Protected by 256-Bit Financial Encryption
                  </p>
                </motion.div>
              </div>

              {/* Right Floating Nodes Column */}
              <div className="md:col-span-3 space-y-6 hidden md:block">
                {/* Node 4: 256-Bit SSL Security */}
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">256-Bit Security</p>
                    <p className="text-[10px] text-slate-400">Biometric & 2FA Active</p>
                  </div>
                </motion.div>

                {/* Node 5: Contactless NFC & Instant Pay */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">NFC & Tap-to-Pay</p>
                    <p className="text-[10px] text-slate-400">Virtual Card Tokenized</p>
                  </div>
                </motion.div>

                {/* Node 6: Real-time Analytics */}
                <motion.div 
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Market Liquidity</p>
                    <p className="text-[10px] text-slate-400">Automated Yield Engine</p>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>

          {/* Quick Metrics Banner Bar */}
          <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto border-t border-slate-800/80">
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">$200B+</p>
              <p className="text-xs text-slate-400 mt-1">Client Assets Under Management</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white">256-Bit</p>
              <p className="text-xs text-slate-400 mt-1">Bank-Grade Encryption</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">24 / 7</p>
              <p className="text-xs text-slate-400 mt-1">Direct Wire & ACH Execution</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white">100%</p>
              <p className="text-xs text-slate-400 mt-1">FDIC Insured Coverage</p>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURE SPOTLIGHT: HIGH-SPEED GLOBAL WIRE CALCULATOR & SIMULATOR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
                <Globe className="w-4 h-4" /> Global Cross-Border Settlement Engine
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Instant International Wires & Treasury Controls
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Send capital across 150+ countries with zero hidden transfer fees, real-time FX transparency, and automated compliance logging.
              </p>

              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Sub-second settlement across SVB enterprise accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Multi-factor transaction security code authorization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>SWIFT, FedWire, and ACH Network integrations</span>
                </div>
              </div>
            </div>

            {/* Live Wire Estimator Card */}
            <div className="lg:col-span-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Live Wire Simulator
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  0% Transfer Fee
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Send Transfer Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      value={wireAmount}
                      onChange={(e) => setWireAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-16 py-2 text-sm font-mono text-white focus:border-cyan-500 outline-none"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="absolute right-2 top-1.5 bg-slate-800 text-cyan-400 text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="SGD">SGD</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Settlement Time:</span>
                    <span className="text-emerald-400 font-bold">Instant (&lt; 2 Sec)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Banking Network Fee:</span>
                    <span className="text-white font-mono">$0.00 USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Target Account Receiver Gets:</span>
                    <span className="text-cyan-400 font-bold font-mono">
                      {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : 'S$'}{' '}
                      {Number(wireAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenAuth}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" /> Start Wire Authorization
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FULL-SUITE DIGITAL BANKING SERVICES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Layers className="w-4 h-4" /> Comprehensive Financial Suite
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Designed for Venture scale & Institutional Control
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Everything your company needs to store, allocate, and monitor capital securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-cyan-500/40 transition-all shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Commercial Checking & Savings</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Auto-generated unique account numbers for every user, instant real-time balance tracking, and multi-currency ledger support.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-blue-500/40 transition-all shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Instant Virtual Corporate Cards</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Issue virtual Visa/Mastercard credit lines for cloud infrastructure, marketing budgets, and team software subscriptions with custom limits.
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -6 }}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-indigo-500/40 transition-all shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Automated Bill & Vendor Payments</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Execute direct vendor invoice payments, regulatory taxes, and utility disbursements with automated reference tracking.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECURITY & GOVERNANCE SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center shadow-2xl">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">
              <ShieldCheck className="w-4 h-4" />
              Institutional Security & Governance
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Enterprise Risk Control & Real-Time Monitoring
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our banking infrastructure enforces multi-tier security supervision, zero-trust token authentication, transaction pin verification, and immutable log records.
            </p>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strict multi-factor authentication and token security controls</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immutable audit logging for all deposit, wire, and transaction actions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Two-Factor Authentication (2FA) & 4-Digit Security Code verification</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-300 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Institutional Security Core
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px]">ACTIVE</span>
            </div>
            <p><span className="text-slate-500">Encryption Level:</span> AES 256-Bit Financial Grade</p>
            <p><span className="text-slate-500">Access Policy:</span> Zero-Trust Multi-Factor Verification</p>
            <p><span className="text-slate-500">Regulatory Status:</span> FDIC Insured & Compliant Platform</p>
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 italic">
              Protected by Silicon Valley Bank institutional infrastructure and automated fraud monitoring.
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

