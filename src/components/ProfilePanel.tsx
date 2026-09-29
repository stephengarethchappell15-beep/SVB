import React, { useState, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Tier3VerificationPanel } from './Tier3VerificationPanel';
import { User as UserIcon, Mail, Phone, MapPin, CreditCard, Calendar, Save, CheckCircle2, AlertCircle, Camera, Upload, Trash2 } from 'lucide-react';
import { BackButton } from './BackButton';

interface ProfilePanelProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

function compressImage(file: File, maxWidth = 300, maxHeight = 300, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Failed to load image format'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, onUpdateUser }) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [profilePicture, setProfilePicture] = useState<string>(user.profilePicture || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image file size should be less than 10MB.' });
      return;
    }

    setMsg(null);
    try {
      setLoading(true);
      const compressedBase64 = await compressImage(file, 300, 300, 0.85);
      setProfilePicture(compressedBase64);

      const res = await api.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        profilePicture: compressedBase64
      });
      onUpdateUser(res.user);
      setMsg({ type: 'success', text: 'Profile picture uploaded and permanently saved!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to process and save image.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePicture = async () => {
    setProfilePicture('');
    setMsg(null);
    try {
      setLoading(true);
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        profilePicture: ''
      });
      onUpdateUser(res.user);
      setMsg({ type: 'success', text: 'Profile picture removed successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to remove profile picture.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    try {
      setLoading(true);
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        profilePicture
      });
      onUpdateUser(res.user);
      setMsg({ type: 'success', text: 'Profile information and contact details saved successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Profile Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar Container with Upload Overlay */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#002b49] to-[#00a3e0] p-0.5 shadow-sm overflow-hidden relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={user.fullName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full bg-[#002b49] rounded-[14px] flex items-center justify-center text-2xl font-extrabold text-white">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity rounded-[14px] gap-1 cursor-pointer"
                title="Click to upload profile photo"
              >
                <Camera className="w-4 h-4 text-cyan-300" />
                <span>Change</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">{user.fullName}</h2>
              {user.role === 'admin' ? (
                <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  SVB Review
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  Verified Client
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 flex items-center justify-center sm:justify-start gap-1 font-mono tabular-nums">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Account #: {user.accountNumber}
            </p>

            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Quick Picture Control Buttons */}
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#00a3e0]" />
                <span>{profilePicture ? 'Update Photo' : 'Upload Photo'}</span>
              </button>

              {profilePicture && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Feedback */}
      {msg && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[#00a3e0]" />
          Legal Entity & Contact Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Legal Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address (Registered Account ID)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">System Assigned Account Number</label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={user.accountNumber}
                disabled
                className="w-full bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-700 cursor-not-allowed outline-none tabular-nums"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Business / Mailing Address</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 3000 Sand Hill Rd, Menlo Park, CA"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Saving Changes...' : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </>
          )}
        </button>
      </form>

      {/* Tier 3 Identity Verification Section */}
      <Tier3VerificationPanel user={user} onUserUpdated={onUpdateUser} />
    </div>
  );
};
