import React, { useState } from 'react';
import { Shield, FileText, Info, Mail, AlertTriangle, Cookie, X, Building2, CheckCircle2 } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms' | 'about' | 'contact' | 'disclaimer' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, initialTab = 'privacy', onClose }) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Trust, Compliance & Legal Center</h2>
              <p className="text-xs text-slate-400">Silicon Valley Bank (SVB) Corporate Governance & Policies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'privacy' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'terms' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'about' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" /> About Us
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'contact' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Contact Us
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'disclaimer' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Disclaimer
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === 'cookies' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" /> Cookie Policy
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" /> Privacy Policy & Data Protection
              </h3>
              <p className="text-slate-400">Effective Date: January 1, 2026 | Last Updated: August 2026</p>

              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm">1. Introduction & Safeguards</h4>
                <p>
                  Silicon Valley Bank ("SVB", "we", "our") is committed to protecting your personal and financial information. This Privacy Policy details how we collect, process, store, and shield customer information in compliance with banking regulations and global privacy standards.
                </p>

                <h4 className="font-semibold text-white text-sm">2. Information We Collect</h4>
                <p>We collect essential account setup details including full legal name, verified email address, phone contact, account security PINs, transaction records, and device metadata required for 2FA security validation.</p>

                <h4 className="font-semibold text-white text-sm">3. How Information Is Used</h4>
                <p>Your information is used strictly to provide secure core banking services, execute authorized wire/ACH transactions, verify user authentication, monitor fraud prevention, and maintain audit logs.</p>

                <h4 className="font-semibold text-white text-sm">4. Data Encryption & Security Standards</h4>
                <p>All transmitted data is protected using AES 256-Bit SSL encryption. We enforce end-to-end server-side authentication and session token verification. We never sell or share user data with third-party advertising networks.</p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Terms of Service & Account Agreement
              </h3>
              <p className="text-slate-400">Silicon Valley Bank Core Banking Agreement</p>

              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm">1. Account Acceptance</h4>
                <p>By registering for an account on the SVB Core Banking Platform, you agree to comply with all operational policies, security protocols, and verification requirements established by Silicon Valley Bank.</p>

                <h4 className="font-semibold text-white text-sm">2. Security & PIN Obligations</h4>
                <p>Account holders are responsible for maintaining the confidentiality of their 4-digit Account Security PIN and login credentials. Any unauthorized transaction attempted without valid security authorization will be flagged for security review.</p>

                <h4 className="font-semibold text-white text-sm">3. Transaction Authorization & Funds Settlement</h4>
                <p>Wire transfers, ACH settlements, and deposits are subject to verification rules. Outgoing funds require verified transaction security authorization. SVB Review may be required for high-value or cross-border wire requests.</p>

                <h4 className="font-semibold text-white text-sm">4. Account Termination</h4>
                <p>SVB reserves the right to suspend or close accounts involved in fraudulent activity, unauthorized access attempts, or violation of regulatory banking requirements.</p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" /> About Silicon Valley Bank Core Platform
              </h3>

              <p>
                Silicon Valley Bank (SVB) provides financial services, corporate accounts, wire transfers, virtual cards, and online banking infrastructure designed for technology ventures, enterprise clients, and financial leaders globally.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xl font-black text-cyan-400">$200B+</p>
                  <p className="text-[11px] text-slate-400 mt-1">Assets Managed</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xl font-black text-emerald-400">256-Bit</p>
                  <p className="text-[11px] text-slate-400 mt-1">Bank-Grade SSL</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xl font-black text-amber-400">24/7</p>
                  <p className="text-[11px] text-slate-400 mt-1">Operations Desk</p>
                </div>
              </div>

              <p>
                Our core platform guarantees instant account generation, real-time audit logs, secure 2FA, and multi-tier role authorization for clients and institutions worldwide.
              </p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" /> Global Contact & Support Desk
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-white">Client Support Desk</p>
                  <p className="text-slate-400">Assigned Lead: Sarah Mitchell (Operations Specialist)</p>
                  <p className="text-cyan-400 font-mono">siliconvalleybank51@gmail.com</p>
                  <p className="text-slate-500 text-[11px]">Toll Free: 1-800-555-SVB-BANK</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="font-bold text-white">Corporate Headquarters</p>
                  <p className="text-slate-400">Silicon Valley Bank Corporate Center</p>
                  <p className="text-slate-300">3003 Tasman Drive, Santa Clara, CA 95054</p>
                  <p className="text-slate-500 text-[11px]">United States</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Regulatory & Legal Disclaimer
              </h3>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-xs">
                Silicon Valley Bank Core Banking Platform operates under strict regulatory compliance protocols. Deposits are insured up to applicable FDIC limits per depositor, per ownership category.
              </div>

              <p>
                This online banking interface utilizes authenticated SSL communication channels. All transaction attempts are recorded in immutable audit logs for security and compliance auditing.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cookie className="w-5 h-5 text-cyan-400" /> Cookie & Session Policy
              </h3>

              <p>
                Our platform uses strict functional session cookies and local storage state solely to maintain authenticated user sessions, store theme preferences, and protect against Cross-Site Request Forgery (CSRF) attacks.
              </p>

              <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No tracking or advertising cookies are deployed on this platform.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors border border-slate-700"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
