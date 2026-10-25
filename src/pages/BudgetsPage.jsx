import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatPHP } from '../lib/formatters';
import { Modal } from '../components/Modal';
import {
  Plus,
  AlertTriangle,
  Target,
  Edit,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const BudgetsPage = () => {
  const { currentHousehold, updateHousehold } = useHousehold();
  const {
    budgets,
    categories,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    calculations,
    setCategoryBudget,
    deleteBudget,
  } = useFinance();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isOverallModalOpen, setIsOverallModalOpen] = useState(false);

  // Category budget form
  const [catId, setCatId] = useState('');
  const [catAmount, setCatAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Overall household target form
  const [overallTarget, setOverallTarget] = useState(
    String(currentHousehold?.monthly_budget_target || 65000)
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Map category budgets with current period expenses
  const categoryBudgetsWithSpending = useMemo(() => {
    // Current period budgets
    const periodBudgets = budgets.filter(
      (b) => b.month === Number(selectedMonth) && b.year === Number(selectedYear)
    );

    // Sum expenses by category for current period
    const expenseByCat = {};
    calculations.monthlyTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (t.category_id) {
          expenseByCat[t.category_id] = (expenseByCat[t.category_id] || 0) + Number(t.amount);
        }
      });

    return periodBudgets.map((b) => {
      const cat = categories.find((c) => c.id === b.category_id);
      const spent = expenseByCat[b.category_id] || 0;
      const budgetAmount = Number(b.amount);
      const remaining = budgetAmount - spent;
      const percent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      const isOver = spent > budgetAmount;

      return {
        ...b,
        categoryName: cat?.name || 'Category',
        categoryIcon: cat?.icon || 'tag',
        categoryColor: cat?.color || '#10B981',
        budgetAmount,
        spent,
        remaining,
        percent,
        isOver,
      };
    }).sort((a, b) => b.budgetAmount - a.budgetAmount);
  }, [budgets, categories, calculations.monthlyTransactions, selectedMonth, selectedYear]);

  const handleSaveCategoryBudget = async (e) => {
    e.preventDefault();
    if (!catId || !catAmount) return;
    setLoading(true);

    await setCategoryBudget({
      category_id: catId,
      month: selectedMonth,
      year: selectedYear,
      amount: Number(catAmount),
    });

    setLoading(false);
    setCatId('');
    setCatAmount('');
    setIsCategoryModalOpen(false);
  };

  const handleSaveOverallTarget = async (e) => {
    e.preventDefault();
    if (!overallTarget) return;
    setLoading(true);

    await updateHousehold({
      monthly_budget_target: Number(overallTarget),
    });

    setLoading(false);
    setIsOverallModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Family Budget Planning
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set spending limits to ensure every peso has a clear purpose.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOverallModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Target className="h-4 w-4 text-emerald-600" />
            Set Monthly Target
          </button>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Category Budget
          </button>
        </div>
      </div>

      {/* Month Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span>Active Budget Month:</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Budget Overview Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Household Monthly Target
            </span>
            <div className="mt-2 flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-black">
                {formatPHP(calculations.activeBudgetTarget)}
              </h2>
              <span className="text-xs text-slate-300">
                for {months[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400">Total Spent So Far</span>
                <p className="text-base font-bold text-rose-300">
                  {formatPHP(calculations.totalExpenses)}
                </p>
              </div>
              <div className="border-l border-slate-700 pl-6">
                <span className="text-slate-400">Available Balance</span>
                <p
                  className={`text-base font-bold ${
                    calculations.isOverspent ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {formatPHP(calculations.remainingBudget)}
                </p>
              </div>
              <div className="border-l border-slate-700 pl-6">
                <span className="text-slate-400">Utilization</span>
                <p className="text-base font-bold text-white">
                  {calculations.budgetUsagePercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              onClick={() => setIsOverallModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition border border-white/15"
            >
              <Edit className="h-3.5 w-3.5" />
              Adjust Target
            </button>
            {calculations.isOverspent ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Over budget by {formatPHP(Math.abs(calculations.remainingBudget))}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Within budget limits
              </span>
            )}
          </div>
        </div>

        {/* Big Meter Bar */}
        <div className="mt-6 h-3.5 w-full rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              calculations.isOverspent
                ? 'bg-rose-500'
                : calculations.budgetUsagePercent > 80
                ? 'bg-amber-400'
                : 'bg-gradient-to-r from-emerald-400 to-teal-400'
            }`}
            style={{ width: `${Math.min(100, calculations.budgetUsagePercent)}%` }}
          />
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Category Budgets</h3>
            <p className="text-xs text-slate-500">Track and constrain spending per household category</p>
          </div>
        </div>

        {categoryBudgetsWithSpending.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
            <Layers className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Category Budgets Set Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Setting budgets for groceries, electricity, water, and dining helps prevent surprises at the end of the month!
            </p>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              Set Category Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBudgetsWithSpending.map((b) => (
              <div
                key={b.id}
                className={`rounded-2xl bg-white p-5 shadow-xs border transition ${
                  b.isOver
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: b.categoryColor }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{b.categoryName}</h4>
                      <p className="text-[11px] text-slate-400">
                        Budget Limit: <span className="font-semibold text-slate-700">{formatPHP(b.budgetAmount)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.isOver ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        <AlertTriangle className="h-3 w-3" />
                        Overspent
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {b.percent.toFixed(0)}% used
                      </span>
                    )}

                    <button
                      onClick={() => deleteBudget(b.id)}
                      className="rounded-lg p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove budget"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-500">
                      Spent: <strong className="text-slate-900">{formatPHP(b.spent)}</strong>
                    </span>
                    <span className={b.isOver ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {b.isOver ? `Over by ${formatPHP(Math.abs(b.remaining))}` : `Remaining: ${formatPHP(b.remaining)}`}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.isOver ? 'bg-rose-500' : b.percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percent)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set Category Budget Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Set Category Monthly Budget"
      >
        <form onSubmit={handleSaveCategoryBudget} className="space-y-4">
          <p className="text-xs text-slate-500">
            Assign a spending ceiling for {months[selectedMonth - 1]} {selectedYear}.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category *
            </label>
            <select
              required
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="">Select Expense Category</option>
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Monthly Budget Amount (₱) *
            </label>
            <input
              type="number"
              step="500"
              min="100"
              required
              placeholder="e.g. 15000"
              value={catAmount}
              onChange={(e) => setCatAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Set Overall Target Modal */}
      <Modal
        isOpen={isOverallModalOpen}
        onClose={() => setIsOverallModalOpen(false)}
        title="Set Household Overall Monthly Target"
      >
        <form onSubmit={handleSaveOverallTarget} className="space-y-4">
          <p className="text-xs text-slate-500">
            The target amount for the entire household helps family members understand overall spending limits at a glance.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Target Monthly Limit (₱) *
            </label>
            <input
              type="number"
              step="1000"
              min="1000"
              required
              value={overallTarget}
              onChange={(e) => setOverallTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOverallModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Monthly Target'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
