import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatPHP, formatDate } from '../lib/formatters';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit2,
  Download,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const TransactionsPage = () => {
  const { transactions, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, income, expense
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category_id: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type match
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category match
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;

      // Date match
      if (dateFilter && t.transaction_date !== dateFilter) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const cat = (t.category_name || '').toLowerCase();
        const userN = (t.user_name || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q) && !userN.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, dateFilter, searchQuery]);

  // Totals for filtered list
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const filteredExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const openAddModal = () => {
    setFormData({
      type: 'expense',
      amount: '',
      category_id: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: '',
    });
    setIsAddOpen(true);
  };

  const openEditModal = (tx) => {
    setSelectedTx(tx);
    setFormData({
      type: tx.type,
      amount: String(tx.amount),
      category_id: tx.category_id || '',
      description: tx.description,
      transaction_date: tx.transaction_date,
      payment_method: tx.payment_method || 'cash',
      notes: tx.notes || '',
    });
    setIsEditOpen(true);
  };

  const openDeleteModal = (tx) => {
    setSelectedTx(tx);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    setFormLoading(true);

    await addTransaction(formData);
    setFormLoading(false);
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx || !formData.amount || !formData.description) return;
    setFormLoading(true);

    await updateTransaction(selectedTx.id, formData);
    setFormLoading(false);
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTx) return;
    await deleteTransaction(selectedTx.id);
    setIsDeleteOpen(false);
    setSelectedTx(null);
  };

  // CSV export helper
  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Amount (PHP)', 'Logged By', 'Payment Method', 'Notes'];
    const rows = filteredTransactions.map((t) => [
      t.transaction_date,
      t.type,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category_name || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.user_name || '').replace(/"/g, '""')}"`,
      t.payment_method,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tipidlink_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Income & Expense Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, categorize, and track every peso shared by the family.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filteredTransactions.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filter Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-400">Total Filtered Income</span>
          <p className="text-lg font-black text-emerald-600 mt-1">{formatPHP(filteredIncome)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-400">Total Filtered Expenses</span>
          <p className="text-lg font-black text-rose-600 mt-1">{formatPHP(filteredExpenses)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-400">Net Flow</span>
          <p className={`text-lg font-black mt-1 ${filteredIncome >= filteredExpenses ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatPHP(filteredIncome - filteredExpenses)}
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, member, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs bg-white focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs bg-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Type pills + reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Income Only
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === 'expense'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Expenses Only
            </button>
          </div>

          {(searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
                setDateFilter('');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / Card List */}
      <div className="rounded-2xl bg-white shadow-xs border border-slate-200/80 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Tag}
              title="No transactions found"
              description="Try adjusting your search filters or click below to record a new transaction."
              actionLabel="Add Transaction"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            tx.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{tx.description}</p>
                          <p className="text-[10px] text-slate-400">
                            Logged by: <span className="font-medium text-slate-600">{tx.user_name || 'Member'}</span>
                            {tx.notes && ` • "${tx.notes}"`}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {tx.category_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {formatDate(tx.transaction_date)}
                    </td>

                    <td className="py-3 px-4 capitalize text-slate-500">
                      {tx.payment_method?.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-4 text-right font-black">
                      <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}>
                        {tx.type === 'income' ? '+' : '-'} {formatPHP(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Transaction' : 'Record Transaction'}
      >
        <form onSubmit={isEditOpen ? handleEditSubmit : handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: 'expense' }))}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                formData.type === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Expense (- ₱)
            </button>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: 'income' }))}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                formData.type === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
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
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
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
              placeholder="e.g. Meralco payment, Puregold groceries, freelance raket"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="">Select Category</option>
                {categories
                  .filter((c) => c.type === formData.type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData((p) => ({ ...p, transaction_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Reference number, store branch, etc."
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : isEditOpen ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Transaction"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">
              Are you sure you want to delete &quot;{selectedTx?.description}&quot; ({formatPHP(selectedTx?.amount)})?
            </p>
          </div>
          <p className="text-xs text-slate-500">
            This action will recalculate your family’s shared budget and cannot be undone.
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
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
