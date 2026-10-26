import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatPHP, formatDate, getDueDateStatus } from '../lib/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  History,
  AlertCircle,
  CreditCard,
  Calendar,
} from 'lucide-react';

export const BillsPage = () => {
  const { bills, categories, addBill, deleteBill, recordBillPayment } = useFinance();

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('all'); // all, unpaid, partially_paid, overdue, paid
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // Form State for Add Bill
  const [billForm, setBillForm] = useState({
    title: '',
    biller_name: '',
    account_number: '',
    amount: '',
    due_date: '',
    category_id: '',
    is_recurring: true,
    frequency: 'monthly',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Form State for Record Payment
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'gcash',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Compute status and totals dynamically
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const processedBills = useMemo(() => {
    return bills.map((b) => {
      const totalPaid = (b.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Math.max(0, Number(b.amount) - totalPaid);
      const dueDate = new Date(b.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdue = remaining > 0 && dueDate < today;
      const isPaid = remaining <= 0;
      const computedStatus = isPaid
        ? 'paid'
        : isOverdue
        ? 'overdue'
        : totalPaid > 0
        ? 'partially_paid'
        : 'unpaid';

      return {
        ...b,
        totalPaid,
        remaining,
        computedStatus,
      };
    });
  }, [bills, today]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return processedBills.filter((b) => {
      if (statusFilter !== 'all' && b.computedStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (b.title || '').toLowerCase();
        const biller = (b.biller_name || '').toLowerCase();
        const acc = (b.account_number || '').toLowerCase();
        if (!title.includes(q) && !biller.includes(q) && !acc.includes(q)) return false;
      }
      return true;
    });
  }, [processedBills, statusFilter, searchQuery]);

  // Overall totals
  const totalBillsAmount = processedBills.reduce((s, b) => s + Number(b.amount), 0);
  const totalPaidAmount = processedBills.reduce((s, b) => s + b.totalPaid, 0);
  const totalOverdueAmount = processedBills
    .filter((b) => b.computedStatus === 'overdue')
    .reduce((s, b) => s + b.remaining, 0);

  const openAddModal = () => {
    setBillForm({
      title: '',
      biller_name: '',
      account_number: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      category_id: '',
      is_recurring: true,
      frequency: 'monthly',
      notes: '',
    });
    setIsAddBillOpen(true);
  };

  const openPayModal = (bill) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount: String(bill.remaining),
      payment_method: 'gcash',
      reference_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsPayModalOpen(true);
  };

  const openHistoryModal = (bill) => {
    setSelectedBill(bill);
    setIsHistoryModalOpen(true);
  };

  const openDeleteModal = (bill) => {
    setSelectedBill(bill);
    setIsDeleteModalOpen(true);
  };

  const handleAddBillSubmit = async (e) => {
    e.preventDefault();
    if (!billForm.title || !billForm.amount || !billForm.due_date) return;
    setFormLoading(true);

    await addBill(billForm);
    setFormLoading(false);
    setIsAddBillOpen(false);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBill || !paymentForm.amount) return;
    setPaymentLoading(true);

    await recordBillPayment(selectedBill.id, paymentForm);
    setPaymentLoading(false);
    setIsPayModalOpen(false);
    setSelectedBill(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBill) return;
    await deleteBill(selectedBill.id);
    setIsDeleteModalOpen(false);
    setSelectedBill(null);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Household Bills & Payments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track utilities, rent, wifi, tuition, and shared household obligations.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active-press hover-lift transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Household Bill
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-400">Total Billed</span>
          <p className="text-lg font-black text-slate-900 mt-1">{formatPHP(totalBillsAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-400">Total Payments Recorded</span>
          <p className="text-lg font-black text-emerald-600 mt-1">{formatPHP(totalPaidAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-xs font-medium text-rose-600">Total Overdue Balance</span>
          <p className="text-lg font-black text-rose-700 mt-1">{formatPHP(totalOverdueAmount)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by bill title, biller, or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'unpaid', label: 'Unpaid' },
              { id: 'partially_paid', label: 'Partially Paid' },
              { id: 'paid', label: 'Paid' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition capitalize ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills Cards Grid */}
      {filteredBills.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 border border-slate-200/80">
          <EmptyState
            icon={Receipt}
            title="No bills found"
            description="Add recurring utilities like Meralco, Maynilad, Converge, or school fees."
            actionLabel="Add Bill"
            onAction={openAddModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const dueInfo = getDueDateStatus(bill.due_date);
            const percentPaid = Number(bill.amount) > 0 ? (bill.totalPaid / Number(bill.amount)) * 100 : 0;

            return (
              <div
                key={bill.id}
                className={`rounded-2xl bg-white p-5 shadow-xs border transition flex flex-col justify-between ${
                  bill.computedStatus === 'overdue'
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-tight">{bill.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {bill.biller_name || 'Biller'} {bill.account_number && `• Acc: ${bill.account_number}`}
                      </p>
                    </div>
                    <StatusBadge status={bill.computedStatus} type="bill" />
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Total Bill:</span>
                      <strong className="text-slate-900">{formatPHP(bill.amount)}</strong>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Total Paid:</span>
                      <strong className="text-emerald-700">{formatPHP(bill.totalPaid)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-600 font-bold">Remaining Balance:</span>
                      <strong className={`font-black ${bill.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatPHP(bill.remaining)}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, percentPaid)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Due: {formatDate(bill.due_date)}</span>
                    </div>
                    <span
                      className={`font-semibold ${
                        dueInfo.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  {bill.notes && (
                    <p className="mt-2 text-[11px] text-slate-400 italic">
                      &quot;{bill.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openHistoryModal(bill)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="Payment history"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(bill)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete bill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {bill.computedStatus !== 'paid' ? (
                    <button
                      onClick={() => openPayModal(bill)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay Bill
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Fully Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bill Modal */}
      <Modal isOpen={isAddBillOpen} onClose={() => setIsAddBillOpen(false)} title="Create New Household Bill">
        <form onSubmit={handleAddBillSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Bill Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Meralco Electric Bill, PLDT Home Fiber"
              value={billForm.title}
              onChange={(e) => setBillForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Biller Company
              </label>
              <input
                type="text"
                placeholder="e.g. Meralco, Maynilad"
                value={billForm.biller_name}
                onChange={(e) => setBillForm((p) => ({ ...p, biller_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Account / ATM Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. 0128-4912"
                value={billForm.account_number}
                onChange={(e) => setBillForm((p) => ({ ...p, account_number: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Total Amount (₱) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 3500"
                value={billForm.amount}
                onChange={(e) => setBillForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={billForm.due_date}
                onChange={(e) => setBillForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <select
                value={billForm.category_id}
                onChange={(e) => setBillForm((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">Select Category</option>
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
                Frequency
              </label>
              <select
                value={billForm.frequency}
                onChange={(e) => setBillForm((p) => ({ ...p, frequency: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="once">One-time Fee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cut-off date or disconnection notice details"
              value={billForm.notes}
              onChange={(e) => setBillForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddBillOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : 'Add Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={selectedBill ? `Record Payment: ${selectedBill.title}` : 'Record Bill Payment'}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <div className="flex justify-between">
              <span>Total Bill Amount:</span>
              <strong>{formatPHP(selectedBill?.amount)}</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span>Remaining Balance:</span>
              <strong className="text-rose-600">{formatPHP(selectedBill?.remaining)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Amount (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              max={selectedBill?.remaining || undefined}
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-base font-bold focus:border-emerald-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              You can pay in partial installments or in full.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="bank_transfer">Bank Transfer (BPI / BDO)</option>
                <option value="cash">Cash (Bayad Center)</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Reference # (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GCash Ref No. 902194812"
              value={paymentForm.reference_number}
              onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {paymentLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={selectedBill ? `Payment History: ${selectedBill.title}` : 'Payment History'}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <p>
              Total Bill: <strong>{formatPHP(selectedBill?.amount)}</strong> • Settled:{' '}
              <strong className="text-emerald-700">{formatPHP(selectedBill?.totalPaid)}</strong>
            </p>
          </div>

          {!selectedBill?.payments || selectedBill.payments.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              No payments recorded yet for this bill.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {selectedBill.payments.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{formatPHP(p.amount)}</span>
                    <p className="text-[10px] text-slate-400">
                      Paid on {formatDate(p.payment_date)} via{' '}
                      <span className="capitalize font-semibold text-slate-600">
                        {p.payment_method}
                      </span>
                    </p>
                    {p.reference_number && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        Ref: {p.reference_number}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Recorded
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Bill"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">
              Delete bill &quot;{selectedBill?.title}&quot;?
            </p>
          </div>
          <p className="text-xs text-slate-500">
            This will permanently remove this bill and its associated payment records from the household.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
            >
              Delete Bill
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
