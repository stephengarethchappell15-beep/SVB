import React from 'react';
import { Transaction } from '../types';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  X, 
  ShieldCheck, 
  Download, 
  Globe2, 
  CreditCard, 
  FileCheck2, 
  Lock 
} from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed & Settled</span>
          </div>
        );
      case 'Pending':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Transaction Pending</span>
          </div>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Rejected / Returned</span>
          </div>
        );
      default:
        return null;
    }
  };

  const isDeposit = transaction.type === 'Deposit' || transaction.type === 'Credit';
  const transferTypeDisplay = transaction.transferType || (transaction.destinationCountry && transaction.destinationCountry !== 'United States' ? 'International' : 'Domestic');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-container, #printable-receipt-container * {
            visibility: visible;
          }
          #printable-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-dark-text {
            color: black !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-8 animate-fadeIn relative">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 no-print">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">SVB Official Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Slip Body */}
        <div id="printable-receipt-container" className="p-6 sm:p-8 bg-slate-950 text-slate-100 space-y-6 relative overflow-hidden">
          
          {/* Subtle Bank Watermark Overlay Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none grid grid-cols-3 gap-8 p-6 select-none no-print">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center transform -rotate-12">
                <Building2 className="w-16 h-16 text-emerald-400" />
                <span className="font-extrabold text-[10px] tracking-widest text-emerald-400">SVB BANK</span>
              </div>
            ))}
          </div>

          {/* Header Branding */}
          <div className="text-center pb-6 border-b border-slate-800 space-y-2 relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 mb-1 shadow-md shadow-emerald-500/10">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="font-extrabold text-white text-2xl tracking-tight print-dark-text">Silicon Valley Bank</h2>
            <p className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">
              A Division of First Citizens Bank • Member FDIC
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold uppercase tracking-widest print-dark-text">
                OFFICIAL TRANSACTION RECEIPT / WIRE ADVICE
              </span>
            </div>
          </div>

          {/* Amount & Status Card */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-inner space-y-2 relative z-10 print-border">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {isDeposit ? 'CREDIT TRANSACTION AMOUNT' : 'TOTAL SETTLEMENT AMOUNT'}
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono print-dark-text">
              {isDeposit ? '+' : ''}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-sans text-slate-400 font-normal">{transaction.currency || 'USD'}</span>
            </div>
            <div className="pt-1">
              {getStatusBadge(transaction.status)}
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="space-y-3 text-xs divide-y divide-slate-800/80 relative z-10">
            
            {/* Transaction ID */}
            <div className="pt-2 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Transaction ID:</span>
              <span className="font-mono font-bold text-slate-200 print-dark-text">{transaction.id}</span>
            </div>

            {/* Reference Number */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Reference Number:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{transaction.reference}</span>
            </div>

            {/* Date */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Date:</span>
              <span className="font-semibold text-slate-200 print-dark-text">{new Date(transaction.createdAt).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>

            {/* Time */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Time:</span>
              <span className="font-semibold text-slate-200 print-dark-text">{new Date(transaction.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Status */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Status:</span>
              <span className="font-bold text-white uppercase print-dark-text">{transaction.status}</span>
            </div>

            {/* Sender */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Sender:</span>
              <span className="font-bold text-slate-200 print-dark-text">{transaction.senderName || transaction.createdByAdminEmail || 'Silicon Valley Bank Account Holder'}</span>
            </div>

            {/* Receiver / Recipient */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Receiver:</span>
              <span className="font-bold text-emerald-400 print-dark-text">{transaction.recipientName || transaction.userEmail}</span>
            </div>

            {/* Account Number */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Account Number:</span>
              <span className="font-mono font-bold text-slate-200 print-dark-text">{transaction.accountNumber || transaction.senderAccountNumber || transaction.recipientAccountNumber || 'SVB-1084920148'}</span>
            </div>

            {/* Transfer Classification */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Transfer Classification:</span>
              <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] print-dark-text">
                {transferTypeDisplay} Wire Transfer
              </span>
            </div>

            {/* Destination Bank */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Destination Bank:</span>
              <span className="font-semibold text-slate-200 print-dark-text">{transaction.destinationBank || 'Silicon Valley Bank (SVB)'}</span>
            </div>

            {/* Destination Country */}
            {transaction.destinationCountry && (
              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Destination Country:</span>
                <span className="font-semibold text-slate-200 print-dark-text">{transaction.destinationCountry}</span>
              </div>
            )}

            {/* Recipient Account Number / IBAN */}
            {transaction.recipientAccountNumber && (
              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Recipient Account / IBAN:</span>
                <span className="font-mono font-bold text-white print-dark-text">{transaction.recipientAccountNumber}</span>
              </div>
            )}

            {/* Description / Memo */}
            {transaction.description && (
              <div className="pt-3 flex justify-between items-start gap-4">
                <span className="text-slate-400 font-medium shrink-0">Reference / Memo:</span>
                <span className="font-medium text-slate-300 text-right print-dark-text">{transaction.description}</span>
              </div>
            )}

            {/* Processing Security Stamp */}
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Processing Protocol:</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> FEDWIRE / SWIFT SECURED
              </span>
            </div>

          </div>

          {/* Professional Footer */}
          <div className="pt-6 border-t border-slate-800 text-center text-[10px] text-slate-500 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 font-semibold print-dark-text">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Silicon Valley Bank Digital Core • 256-Bit Banking Security Standard</span>
            </div>
            <p className="max-w-xs mx-auto text-slate-400 leading-tight">
              This digital receipt serves as official proof of transaction authorization. Issued by Silicon Valley Bank, 3000 Sand Hill Rd, Menlo Park, CA.
            </p>
            <p className="font-mono text-[9px] text-slate-500">
              Member FDIC • Equal Housing Lender • Receipt Hash #{transaction.id}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
