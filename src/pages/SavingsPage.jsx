import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatPHP, formatDate } from '../lib/formatters';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  PiggyBank,
  Plus,
  Trophy,
  Calendar,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coins,
} from 'lucide-react';

export const SavingsPage = () => {
  const { savingsGoals, addSavingsGoal, contributeToGoal, deleteSavingsGoal } = useFinance();

  const [activeTab, setActiveTab] = useState('active'); // active, completed
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Form State for Add Goal
  const [goalForm, setGoalForm] = useState({
    title: '',
    target_amount: '',
    deadline: '',
    category: 'emergency_fund',
    description: '',
  });
  const [goalLoading, setGoalLoading] = useState(false);

  // Form State for Contribution
  const [contribAmount, setContribAmount] = useState('');
  const [contribNotes, setContribNotes] = useState('');
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [contribLoading, setContribLoading] = useState(false);

  // Goals categorized
  const activeGoals = useMemo(() => savingsGoals.filter((g) => !g.is_completed), [savingsGoals]);
  const completedGoals = useMemo(() => savingsGoals.filter((g) => g.is_completed), [savingsGoals]);

  const totalSavedAll = savingsGoals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTargetAll = savingsGoals.reduce((s, g) => s + Number(g.target_amount), 0);
  const overallPercentage = totalTargetAll > 0 ? (totalSavedAll / totalTargetAll) * 100 : 0;

  const openAddModal = () => {
    setGoalForm({
      title: '',
      target_amount: '',
      deadline: '',
      category: 'emergency_fund',
      description: '',
    });
    setIsAddOpen(true);
  };

  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setContribAmount('');
    setContribNotes('');
    setContribDate(new Date().toISOString().split('T')[0]);
    setIsContributeOpen(true);
  };

  const openHistoryModal = (goal) => {
    setSelectedGoal(goal);
    setIsHistoryOpen(true);
  };

  const openDeleteModal = (goal) => {
    setSelectedGoal(goal);
    setIsDeleteOpen(true);
  };

  const handleAddGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalForm.title || !goalForm.target_amount) return;
    setGoalLoading(true);

    await addSavingsGoal(goalForm);
    setGoalLoading(false);
    setIsAddOpen(false);
  };

  const handleContributeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !contribAmount) return;
    setContribLoading(true);

    await contributeToGoal(selectedGoal.id, {
      amount: Number(contribAmount),
      contribution_date: contribDate,
      notes: contribNotes.trim(),
    });

    setContribLoading(false);
    setIsContributeOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGoal) return;
    await deleteSavingsGoal(selectedGoal.id);
    setIsDeleteOpen(false);
    setSelectedGoal(null);
  };

  const displayedGoals = activeTab === 'active' ? activeGoals : completedGoals;

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Family Savings & Goals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pondong pang-emergency, future dreams, and shared household milestones.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press hover-lift transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Savings Goal
        </button>
      </div>

      {/* Hero Overview Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/20 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Shared Household Stash</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              {formatPHP(totalSavedAll)}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Total pooled savings towards a goal of {formatPHP(totalTargetAll)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">
                {overallPercentage.toFixed(1)}%
              </span>
              <p className="text-xs text-slate-300">Overall Completed</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Trophy className="h-7 w-7 text-amber-300" />
            </div>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="mt-6 h-3 w-full rounded-full bg-slate-800/80 overflow-hidden border border-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              activeTab === 'active'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Goals ({activeGoals.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              activeTab === 'completed'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Completed & Achieved ({completedGoals.length})
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      {displayedGoals.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 border border-slate-200/80">
          <EmptyState
            icon={PiggyBank}
            title={activeTab === 'active' ? 'No active goals yet' : 'No completed goals yet'}
            description={
              activeTab === 'active'
                ? 'Start building an Emergency Fund or save for appliances and celebrations.'
                : 'Keep contributing to your active goals to see them completed here!'
            }
            actionLabel={activeTab === 'active' ? 'Create Goal' : undefined}
            onAction={activeTab === 'active' ? openAddModal : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGoals.map((goal) => {
            const percent = Number(goal.target_amount) > 0
              ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
              : 0;
            const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

            return (
              <div
                key={goal.id}
                className={`rounded-2xl bg-white p-5 shadow-xs border transition flex flex-col justify-between ${
                  goal.is_completed
                    ? 'border-emerald-300 ring-2 ring-emerald-100 bg-emerald-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-tight">
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p className="text-xs text-slate-500 mt-1">{goal.description}</p>
                      )}
                    </div>
                    {goal.is_completed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Achieved
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                        {percent.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Target Goal:</span>
                      <strong className="text-slate-900">{formatPHP(goal.target_amount)}</strong>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Current Saved:</span>
                      <strong className="text-emerald-700">{formatPHP(goal.current_amount)}</strong>
                    </div>
                    {!goal.is_completed && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-semibold">Still Needed:</span>
                        <strong className="text-slate-800">{formatPHP(remaining)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          goal.is_completed ? 'bg-emerald-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  {goal.deadline && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Target: {formatDate(goal.deadline)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openHistoryModal(goal)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    >
                      History ({goal.contributions?.length || 0})
                    </button>
                    <button
                      onClick={() => openDeleteModal(goal)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!goal.is_completed && (
                    <button
                      onClick={() => openContributeModal(goal)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      Add Savings
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Family Savings Goal">
        <form onSubmit={handleAddGoalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Fund (Pondong Pang-ipit), Palawan Trip"
              value={goalForm.title}
              onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Target Amount (₱) *
              </label>
              <input
                type="number"
                step="500"
                min="500"
                required
                placeholder="e.g. 50000"
                value={goalForm.target_amount}
                onChange={(e) => setGoalForm((p) => ({ ...p, target_amount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Target Deadline
              </label>
              <input
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm((p) => ({ ...p, deadline: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category
            </label>
            <select
              value={goalForm.category}
              onChange={(e) => setGoalForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="emergency_fund">Emergency Fund (Pondong Pang-ipit)</option>
              <option value="appliance">Appliance / Home Improvement</option>
              <option value="celebration">Celebration / Christmas Noche Buena</option>
              <option value="education">Tuition & School Expenses</option>
              <option value="travel">Family Travel / Vacation</option>
              <option value="business">Negosyo / Investment</option>
              <option value="other">Other Goal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. 3-6 months safety net kept in Seabank/Maya high interest account"
              value={goalForm.description}
              onChange={(e) => setGoalForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={goalLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {goalLoading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        title={selectedGoal ? `Add Savings to: ${selectedGoal.title}` : 'Add Savings Contribution'}
      >
        <form onSubmit={handleContributeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Contribution Amount (₱) *
            </label>
            <input
              type="number"
              step="50"
              min="1"
              required
              placeholder="e.g. 2000"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Contribution Date
            </label>
            <input
              type="date"
              required
              value={contribDate}
              onChange={(e) => setContribDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra raket earnings, 13th month pay cut"
              value={contribNotes}
              onChange={(e) => setContribNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsContributeOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={contribLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {contribLoading ? 'Saving...' : 'Add Contribution'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribution History Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={selectedGoal ? `Savings History: ${selectedGoal.title}` : 'Contribution History'}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <p>
              Target: <strong>{formatPHP(selectedGoal?.target_amount)}</strong> • Current Total:{' '}
              <strong className="text-emerald-700">{formatPHP(selectedGoal?.current_amount)}</strong>
            </p>
          </div>

          {!selectedGoal?.contributions || selectedGoal.contributions.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              No contributions recorded yet for this goal.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {selectedGoal.contributions.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{formatPHP(c.amount)}</span>
                    <p className="text-[10px] text-slate-400">
                      Added on {formatDate(c.contribution_date)}
                      {c.notes && ` • "${c.notes}"`}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Deposited
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Goal Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Savings Goal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">
              Delete &quot;{selectedGoal?.title}&quot;?
            </p>
          </div>
          <p className="text-xs text-slate-500">
            This will remove this goal and its contributions history from the household.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
            >
              Delete Goal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
