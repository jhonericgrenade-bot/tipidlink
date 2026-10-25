import React, { useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
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
} from 'lucide-react';

export const HouseholdPage = ({ onOpenCreate, onOpenJoin }) => {
  const { currentHousehold, members, isOwnerOrAdmin, updateHousehold, updateMemberRole, removeMember } = useHousehold();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentHousehold?.name || '');
  const [editDesc, setEditDesc] = useState(currentHousehold?.description || '');
  const [editBudget, setEditBudget] = useState(String(currentHousehold?.monthly_budget_target || 65000));
  const [loading, setLoading] = useState(false);

  const handleCopyCode = () => {
    if (!currentHousehold?.invite_code) return;
    navigator.clipboard.writeText(currentHousehold.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await updateHousehold({
      name: editName.trim(),
      description: editDesc.trim(),
      monthly_budget_target: Number(editBudget),
    });
    setLoading(false);
    setIsEditProfileOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-in fade-in duration-200">
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <KeyRound className="h-4 w-4 text-indigo-600" />
            Join with Code
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Home className="h-4 w-4" />
            New Household
          </button>
        </div>
      </div>

      {/* Household Profile & Invite Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Household Profile Card */}
        <div className="md:col-span-2 rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
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
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
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
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                Household Invite Code
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Share this code with your parents, spouse, or working siblings so they can connect to this shared budget.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md px-4 py-3 border border-white/20">
              <span className="font-mono text-xl font-black tracking-widest text-white">
                {currentHousehold?.invite_code || 'SANTOS2026'}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
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
