import React, { useState, useEffect } from 'react';
import { useHousehold, encodeHouseholdCode } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatPHP } from '../lib/formatters';
import {
  Home,
  Copy,
  Check,
  KeyRound,
  Trash2,
  Edit,
  Sparkles,
  Info,
  Crown,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export const HouseholdPage = ({ onOpenCreate, onOpenJoin }) => {
  const { currentHousehold, members, isOwnerOrAdmin, updateHousehold, updateMemberRole, removeMember, shareCode, loading } = useHousehold();
  const { user, isDemoMode } = useAuth();
  const { isPremium, openUpgradeModal } = usePremium();

  const [copied, setCopied] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBudget, setEditBudget] = useState('0');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (currentHousehold) {
      setEditName(currentHousehold.name || '');
      setEditDesc(currentHousehold.description || '');
      setEditBudget(String(currentHousehold.monthly_budget_target || 0));
    }
  }, [currentHousehold]);

  const displayCode = isDemoMode
    ? 'SANTOS2026'
    : (currentHousehold?.invite_code || shareCode || 'TIPID-2026');

  const handleCopyCode = async () => {
    if (!isPremium && members.length >= 3) {
      openUpgradeModal();
      return;
    }

    if (!displayCode) return;

    let success = false;
    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(displayCode);
        success = true;
      } catch (err) {
        console.warn('Navigator clipboard error, trying fallback:', err);
      }
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = displayCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.error('Fallback clipboard error:', e);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    await updateHousehold({
      name: editName.trim(),
      description: editDesc.trim(),
      monthly_budget_target: Number(editBudget),
    });
    setFormLoading(false);
    setIsEditProfileOpen(false);
  };

  if (loading && !currentHousehold) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-page-enter">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-slate-500">Inihahanda ang impormasyon ng iyong household...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Household & Family Members
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage who can view and log income, expenses, and bills in this shared budget.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenJoin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active-press hover-lift transition cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-indigo-600" />
            Join with Code
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press hover-lift transition cursor-pointer"
          >
            <Home className="h-4 w-4" />
            New Household
          </button>
        </div>
      </div>

      {/* Household Profile & Invite Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Household Profile Card */}
        <div className="md:col-span-2 rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 hover-lift-subtle card-interactive">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{currentHousehold?.name}</h3>
                <p className="text-xs text-slate-500">
                  {currentHousehold?.description || 'Shared family home'}
                </p>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <button
                onClick={() => {
                  setEditName(currentHousehold.name);
                  setEditDesc(currentHousehold.description || '');
                  setEditBudget(String(currentHousehold.monthly_budget_target || 65000));
                  setIsEditProfileOpen(true);
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 active-press transition cursor-pointer"
                title="Edit Household Info"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs">
            <div>
              <span className="text-slate-400">Monthly Budget Target</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {formatPHP(currentHousehold?.monthly_budget_target)}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Currency</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {currentHousehold?.currency || 'PHP'} (₱)
              </p>
            </div>
            <div>
              <span className="text-slate-400">Active Members</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>
        </div>

        {/* Family Invite Code Box */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white shadow-md flex flex-col justify-between hover-lift-subtle card-interactive">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Household Invite Code
                </span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                isPremium ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-emerald-100 border border-white/20'
              }`}>
                <Crown className="h-3 w-3 fill-current" />
                {isPremium ? 'Pro Active' : '₱30 Pro Feature'}
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Share this code with your parents, spouse, or working siblings so they can connect to this shared budget.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/20 gap-2">
              <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white truncate max-w-[240px]" title={displayCode}>
                {displayCode || 'Generating code...'}
              </span>

              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50 active-press hover-lift transition cursor-pointer shadow-xs shrink-0"
                title="Copy Invite Code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {!isPremium ? (
              <div
                onClick={openUpgradeModal}
                className="mt-3 flex items-center justify-between rounded-xl bg-amber-400/20 border border-amber-300/40 p-2.5 text-[11px] text-amber-200 cursor-pointer hover:bg-amber-400/30 active-press transition group"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  Free Plan: Hanggang 3 kapamilya ({members.length}/3)
                </span>
                <span className="font-black underline text-white group-hover:translate-x-0.5 transition-transform">
                  ₱30 Unlimited Pro &rarr;
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-2.5 text-[11px] text-emerald-200">
                <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300 shrink-0" />
                <span>₱30 Premium Active • Walang limitasyon sa bilang ng kapamilya</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-200">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Secured with Supabase Row Level Security (RLS)</span>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Family Members</h3>
            <p className="text-xs text-slate-500">
              Assigned roles define who can manage budgets, invite users, or record transactions.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member) => {
            const isSelf = member.user_id === user?.id;

            return (
              <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      member.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        member.full_name || member.email
                      )}`
                    }
                    alt={member.full_name}
                    className="h-10 w-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{member.full_name}</p>
                      {isSelf && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {member.nickname && <span className="text-slate-600">{member.nickname} • </span>}
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <StatusBadge status={member.role} type="role" />

                  {isOwnerOrAdmin && !isSelf && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 py-1 px-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>

                      <button
                        onClick={() => removeMember(member.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Household Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Household Profile"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Household Name *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Monthly Budget Limit (₱) *
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              required
              value={editBudget}
              onChange={(e) => setEditBudget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows="2"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
