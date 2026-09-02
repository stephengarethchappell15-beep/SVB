import React, { useState, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Tier3VerificationPanel } from './Tier3VerificationPanel';
import { User as UserIcon, Mail, Phone, MapPin, CreditCard, Calendar, Save, CheckCircle2, AlertCircle, Camera, Upload, Trash2, Image } from 'lucide-react';
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
      const img = new Image();
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
      setMsg({ type: 'success', text: 'Profile information and picture updated successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Container with Upload Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/10 overflow-hidden relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={user.fullName}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl font-extrabold text-emerald-400">
                  {user.fullName.charAt(0)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity rounded-[14px] gap-1 cursor-pointer"
                title="Click to upload profile photo"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Upload</span>
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

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">{user.fullName}</h2>
              {user.role === 'admin' ? (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  SVB Review
                </span>
              ) : (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  Verified Client
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 font-mono">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Account #: {user.accountNumber}
            </p>

            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Calendar className="w-3.5 h-3.5" /> Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Quick Picture Control Buttons */}
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profilePicture ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {profilePicture && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Status */}
      {msg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
          msg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
        }`}>
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-emerald-400" />
          Personal Profile & Contact Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Email Address (Read-only)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-400 cursor-not-allowed outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">System Assigned Account Number</label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={user.accountNumber}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-emerald-400 font-bold cursor-not-allowed outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Primary Residential / Business Address</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="100 Technology Way, Silicon Valley, CA"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
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
