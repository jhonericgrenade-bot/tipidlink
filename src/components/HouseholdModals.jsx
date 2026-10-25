import React, { useState } from 'react';
import { Modal } from './Modal';
import { useHousehold } from '../contexts/HouseholdContext';
import { Home, KeyRound, AlertCircle } from 'lucide-react';

export const CreateHouseholdModal = ({ isOpen, onClose }) => {
  const { createHousehold } = useHousehold();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetTarget, setBudgetTarget] = useState('60000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a household name (e.g. "Dela Cruz Family")');
      return;
    }
    setError('');
    setLoading(true);

    const res = await createHousehold({
      name: name.trim(),
      description: description.trim(),
      monthly_budget_target: Number(budgetTarget) || 0,
      currency: 'PHP',
    });

    setLoading(false);
    if (res.success) {
      setName('');
      setDescription('');
      onClose();
    } else {
      setError(res.error || 'Failed to create household');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Family Household">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Household Name *
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              placeholder="e.g. Reyes Family Home"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Monthly Target Budget (₱)
          </label>
          <input
            type="number"
            min="0"
            step="500"
            placeholder="60000"
            value={budgetTarget}
            onChange={(e) => setBudgetTarget(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Estimated overall monthly expense limit for the whole family.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Description or Location (Optional)
          </label>
          <textarea
            rows="2"
            placeholder="e.g. Shared expenses for Quezon City residence"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Household'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const JoinHouseholdModal = ({ isOpen, onClose }) => {
  const { joinHouseholdByCode } = useHousehold();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter the household invite code');
      return;
    }
    setError('');
    setLoading(true);

    const res = await joinHouseholdByCode(inviteCode.trim());
    setLoading(false);

    if (res.success) {
      setInviteCode('');
      onClose();
    } else {
      setError(res.error || 'Failed to join household');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Family Household">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-slate-500 leading-relaxed">
          Ask your family budget manager or breadwinner for the unique TipidLink household code to securely join and view your shared budget.
        </p>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Invite Code *
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              placeholder="e.g. SANTOS2026"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm uppercase tracking-wider font-mono font-bold focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Tip: Demo code is <span className="font-mono font-semibold text-emerald-600">SANTOS2026</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Household'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
