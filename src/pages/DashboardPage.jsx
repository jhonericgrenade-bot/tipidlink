import React, { useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatPHP, formatDate, getDueDateStatus } from '../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  PiggyBank,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export const DashboardPage = () => {
  const { currentHousehold } = useHousehold();
  const { profile } = useAuth();
  const {
    calculations,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    categories,
    addTransaction,
    recordBillPayment,
    resetToDemoData,
  } = useFinance();

  // Modals state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isPayBillOpen, setIsPayBillOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);

  // Form states for quick add
  const [txType, setTxType] = useState('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState('cash');
  const [txLoading, setTxLoading] = useState(false);

  // Bill payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('gcash');
  const [payRef, setPayRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleAddTxSubmit = async (e) => {
    e.preventDefault();
    if (!txAmount || !txDescription) return;
    setTxLoading(true);

    await addTransaction({
      type: txType,
      amount: Number(txAmount),
      category_id: txCategory || null,
      description: txDescription.trim(),
      payment_method: txPaymentMethod,
      transaction_date: new Date().toISOString().split('T')[0],
    });

    setTxLoading(false);
    setTxAmount('');
    setTxDescription('');
    setIsAddTxOpen(false);
  };

  const handlePayBillSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBillForPay || !payAmount) return;
    setPayLoading(true);

    await recordBillPayment(selectedBillForPay.id, {
      amount: Number(payAmount),
      payment_method: payMethod,
      reference_number: payRef.trim(),
      payment_date: new Date().toISOString().split('T')[0],
    });

    setPayLoading(false);
    setSelectedBillForPay(null);
    setPayAmount('');
    setPayRef('');
    setIsPayBillOpen(false);
  };

  const openPayModalForBill = (bill) => {
    setSelectedBillForPay(bill);
    setPayAmount(String(bill.remainingBalance || bill.amount));
    setIsPayBillOpen(true);
  };

  // Color palette for charts
  const CHART_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B'];

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/20 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Shared Family Budget • {currentHousehold?.name || 'Household'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mabuhay, {profile?.full_name?.split(' ')[0] || 'Pamilya'}! 👋
            </h1>
            <p className="mt-1 text-sm text-emerald-100/80 max-w-xl">
              &ldquo;Habang nagtitipid, gumiginhawa ang buhay.&rdquo; Here is your shared family finances and budget status for this month.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddTxOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:bg-emerald-400 transition"
            >
              <PlusCircle className="h-4 w-4" />
              Add Transaction
            </button>
            <button
              onClick={resetToDemoData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 transition border border-white/10"
              title="Reload sample Filipino household data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Demo Data
            </button>
          </div>
        </div>
      </div>

      {/* Month & Period Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span>Viewing Budget Period:</span>
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

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Family Income"
          value={formatPHP(calculations.totalIncome)}
          subtitle={`${months[selectedMonth - 1]} ${selectedYear}`}
          icon={TrendingUp}
          colorScheme="emerald"
        />

        <StatCard
          title="Total Family Expenses"
          value={formatPHP(calculations.totalExpenses)}
          subtitle={`${calculations.monthlyTransactions.filter(t => t.type === 'expense').length} transactions recorded`}
          icon={TrendingDown}
          colorScheme="rose"
        />

        <StatCard
          title="Remaining Budget"
          value={formatPHP(calculations.remainingBudget)}
          subtitle={
            calculations.isOverspent
              ? 'Warning: Expenses exceeded target!'
              : `Out of ${formatPHP(calculations.activeBudgetTarget, false)} monthly budget`
          }
          icon={Wallet}
          colorScheme={calculations.isOverspent ? 'rose' : 'sky'}
          isAlert={calculations.isOverspent}
          badgeText={calculations.isOverspent ? 'OVERSPENT' : undefined}
        />

        <StatCard
          title="Unpaid / Due Bills"
          value={formatPHP(calculations.totalOverdueAmount + calculations.totalUpcomingAmount)}
          subtitle={`${calculations.overdueBills.length} overdue • ${calculations.upcomingBills.length} upcoming`}
          icon={Receipt}
          colorScheme={calculations.overdueBills.length > 0 ? 'amber' : 'purple'}
          isAlert={calculations.overdueBills.length > 0}
          badgeText={calculations.overdueBills.length > 0 ? `${calculations.overdueBills.length} Overdue` : undefined}
        />
      </div>

      {/* Budget Meter Bar */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Monthly Budget Utilization
            </h3>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">
              {formatPHP(calculations.totalExpenses)} spent of{' '}
              {formatPHP(calculations.activeBudgetTarget)} target
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span
              className={`inline-block text-lg font-black ${
                calculations.isOverspent ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {calculations.budgetUsagePercent.toFixed(1)}%
            </span>
            <p className="text-xs text-slate-400">
              {calculations.isOverspent ? 'Over budget limit' : 'Used this month'}
            </p>
          </div>
        </div>

        {/* Meter progress bar */}
        <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              calculations.isOverspent
                ? 'bg-rose-500'
                : calculations.budgetUsagePercent > 80
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${Math.min(100, calculations.budgetUsagePercent)}%` }}
          />
        </div>

        {calculations.isOverspent && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              <strong>Attention Family:</strong> Total expenses have exceeded your planned monthly budget by{' '}
              <strong>{formatPHP(Math.abs(calculations.remainingBudget))}</strong>. Consider reviewing unessential spending.
            </span>
          </div>
        )}
      </div>

      {/* Charts & Spending Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Spending Breakdown</h3>
              <p className="text-xs text-slate-400">Where family money went this month</p>
            </div>
            <Link
              to="/budgets"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Manage Budgets <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {calculations.categoryBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Donut Chart */}
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={calculations.categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {calculations.categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [formatPHP(val), 'Spent']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category ranking list */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {calculations.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate font-semibold text-slate-700">{cat.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900">{formatPHP(cat.amount)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        ({cat.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No expenses recorded yet for {months[selectedMonth - 1]}.
            </div>
          )}
        </div>

        {/* Savings Goals Widget */}
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Family Savings Goals</h3>
                <p className="text-xs text-slate-400">Pondong Pang-ipit & Dreams</p>
              </div>
              <Link
                to="/savings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                <span className="text-xs font-medium text-emerald-800">Total Saved Across Goals</span>
                <p className="text-xl font-black text-emerald-900 mt-0.5">
                  {formatPHP(calculations.totalSavedAllGoals)}
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-emerald-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, calculations.overallSavingsProgress)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-emerald-700 font-semibold text-right">
                  {calculations.overallSavingsProgress.toFixed(1)}% of total target
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/savings"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <PiggyBank className="h-4 w-4" />
              Manage Savings Goals
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming & Overdue Bills Section */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upcoming & Overdue Bills</h3>
            <p className="text-xs text-slate-400">
              Never miss electricity, water, internet, or tuition deadlines
            </p>
          </div>
          <Link
            to="/bills"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            All Bills <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {calculations.overdueBills.length === 0 && calculations.upcomingBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">All Bills are Paid!</p>
            <p className="text-xs text-slate-400">No pending household bills right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[...calculations.overdueBills, ...calculations.upcomingBills.slice(0, 3)].map((bill) => {
              const dueInfo = getDueDateStatus(bill.due_date);
              return (
                <div
                  key={bill.id}
                  className={`rounded-xl p-4 border transition ${
                    bill.computedStatus === 'overdue'
                      ? 'border-rose-200 bg-rose-50/40'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{bill.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {bill.biller_name || 'Biller'}
                      </p>
                    </div>
                    <StatusBadge status={bill.computedStatus} type="bill" />
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400">Remaining</span>
                      <p className="text-base font-black text-slate-900">
                        {formatPHP(bill.remainingBalance)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        dueInfo.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-end">
                    <button
                      onClick={() => openPayModalForBill(bill)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions List */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Household Activity</h3>
            <p className="text-xs text-slate-400">Latest expenses and income logged by family members</p>
          </div>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View All Transactions <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {calculations.monthlyTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No transactions found for this month. Click &quot;Add Transaction&quot; to log your first one!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {calculations.monthlyTransactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      tx.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="truncate text-sm font-bold text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {tx.category_name} • By {tx.user_name || 'Member'} • {formatDate(tx.transaction_date)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-extrabold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatPHP(tx.amount)}
                  </span>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {tx.payment_method?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Transaction Modal */}
      <Modal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} title="Record New Transaction">
        <form onSubmit={handleAddTxSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                txType === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Expense (- ₱)
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                txType === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Income (+ ₱)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 1500"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Palengke groceries & vegetables"
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category
            </label>
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="">Select Category</option>
              {categories
                .filter((c) => c.type === txType)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Method
            </label>
            <select
              value={txPaymentMethod}
              onChange={(e) => setTxPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="cash">Cash (On Hand)</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank_transfer">Bank Transfer (BPI / BDO / UnionBank)</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddTxOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={txLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {txLoading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Bill Modal */}
      <Modal
        isOpen={isPayBillOpen}
        onClose={() => setIsPayBillOpen(false)}
        title={selectedBillForPay ? `Record Payment: ${selectedBillForPay.title}` : 'Record Bill Payment'}
      >
        <form onSubmit={handlePayBillSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <p>
              Total Bill Amount: <strong>{formatPHP(selectedBillForPay?.amount)}</strong>
            </p>
            <p className="mt-0.5">
              Unpaid Balance: <strong>{formatPHP(selectedBillForPay?.remainingBalance)}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedBillForPay?.remainingBalance || undefined}
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank_transfer">Bank Transfer (BPI / BDO / etc.)</option>
              <option value="cash">Cash (Bayad Center / 7-Eleven)</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Reference Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GCash Ref No. 902194812"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayBillOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {payLoading ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
