import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { INITIAL_DEMO_DATA } from '../lib/mockData';

const FinanceContext = createContext(null);

export const FinanceProvider = ({ children }) => {
  const { user, profile, isDemoMode } = useAuth();
  const { currentHousehold } = useHousehold();

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [bills, setBills] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected period for dashboard & budget tracking (defaults to current month/year)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Load all financial records when current household changes
  useEffect(() => {
    if (!currentHousehold) {
      setTransactions([]);
      setBudgets([]);
      setBills([]);
      setSavingsGoals([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    loadHouseholdData(currentHousehold.id);
  }, [currentHousehold, isDemoMode]);

  const loadHouseholdData = async (householdId) => {
    setLoading(true);

    if (isDemoMode || !isSupabaseConfigured) {
      // Load from localStorage or mockData
      const storageKey = `tipidlink_finance_${householdId}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setTransactions(parsed.transactions || []);
          setBudgets(parsed.budgets || []);
          setBills(parsed.bills || []);
          setSavingsGoals(parsed.savingsGoals || []);
          setCategories(parsed.categories || INITIAL_DEMO_DATA.categories);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse local finance data:', e);
        }
      }

      // Default mock data for Santos Family
      setTransactions(INITIAL_DEMO_DATA.transactions);
      setBudgets(INITIAL_DEMO_DATA.budgets);
      setBills(INITIAL_DEMO_DATA.bills);
      setSavingsGoals(INITIAL_DEMO_DATA.savingsGoals);
      setCategories(INITIAL_DEMO_DATA.categories);

      // Persist to storage
      localStorage.setItem(storageKey, JSON.stringify({
        transactions: INITIAL_DEMO_DATA.transactions,
        budgets: INITIAL_DEMO_DATA.budgets,
        bills: INITIAL_DEMO_DATA.bills,
        savingsGoals: INITIAL_DEMO_DATA.savingsGoals,
        categories: INITIAL_DEMO_DATA.categories,
      }));

      setLoading(false);
      return;
    }

    try {
      // 1. Categories (System + household)
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .or(`is_system.eq.true,household_id.eq.${householdId}`);

      // 2. Transactions
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id (name, icon, color),
          profiles:user_id (full_name)
        `)
        .eq('household_id', householdId)
        .order('transaction_date', { ascending: false });

      if (txErr) throw txErr;

      // 3. Budgets
      const { data: bgData, error: bgErr } = await supabase
        .from('budgets')
        .select(`
          *,
          categories:category_id (name, icon, color)
        `)
        .eq('household_id', householdId);

      if (bgErr) throw bgErr;

      // 4. Bills with Payments
      const { data: billData, error: billErr } = await supabase
        .from('bills')
        .select(`
          *,
          categories:category_id (name, icon, color),
          bill_payments (
            id,
            amount,
            payment_date,
            payment_method,
            reference_number,
            notes,
            paid_by
          )
        `)
        .eq('household_id', householdId)
        .order('due_date', { ascending: true });

      if (billErr) throw billErr;

      // 5. Savings Goals with Contributions
      const { data: sgData, error: sgErr } = await supabase
        .from('savings_goals')
        .select(`
          *,
          savings_contributions (
            id,
            amount,
            contribution_date,
            notes,
            contributed_by
          )
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (sgErr) throw sgErr;

      const formattedTx = (txData || []).map(t => ({
        ...t,
        category_name: t.categories?.name || 'Uncategorized',
        category_icon: t.categories?.icon || 'tag',
        category_color: t.categories?.color || '#10B981',
        user_name: t.profiles?.full_name || 'Family Member',
      }));

      const formattedBills = (billData || []).map(b => ({
        ...b,
        category_name: b.categories?.name || 'Bill',
        category_icon: b.categories?.icon || 'receipt',
        payments: b.bill_payments || [],
      }));

      const formattedGoals = (sgData || []).map(g => ({
        ...g,
        contributions: g.savings_contributions || [],
      }));

      setCategories(catData || INITIAL_DEMO_DATA.categories);
      setTransactions(formattedTx);
      setBudgets(bgData || []);
      setBills(formattedBills);
      setSavingsGoals(formattedGoals);
    } catch (err) {
      console.error('Error fetching household financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to persist demo data
  const persistDemoData = (updates) => {
    if (!currentHousehold) return;
    const storageKey = `tipidlink_finance_${currentHousehold.id}`;
    const current = {
      transactions,
      budgets,
      bills,
      savingsGoals,
      categories,
      ...updates,
    };
    localStorage.setItem(storageKey, JSON.stringify(current));
  };

  // ----------------------------------------------------------------------------
  // TRANSACTIONS CRUD
  // ----------------------------------------------------------------------------
  const addTransaction = async (tx) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const categoryObj = categories.find(c => c.id === tx.category_id);
    const newTx = {
      ...tx,
      household_id: currentHousehold.id,
      user_id: user?.id,
      amount: Number(tx.amount),
    };

    if (isDemoMode || !isSupabaseConfigured) {
      const createdTx = {
        ...newTx,
        id: `tx-${Date.now()}`,
        category_name: categoryObj?.name || 'General',
        category_icon: categoryObj?.icon || 'tag',
        category_color: categoryObj?.color || '#10B981',
        user_name: profile?.full_name || 'You',
        created_at: new Date().toISOString(),
      };
      const updated = [createdTx, ...transactions];
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      return { success: true, transaction: createdTx };
    }

    try {
      const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const safeCategoryId = isUuid(tx.category_id) ? tx.category_id : null;

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          household_id: currentHousehold.id,
          category_id: safeCategoryId,
          user_id: user?.id,
          type: tx.type,
          amount: Number(tx.amount),
          description: tx.description,
          transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
          payment_method: tx.payment_method || 'cash',
          notes: tx.notes || null,
        })
        .select(`
          *,
          categories:category_id (name, icon, color),
          profiles:user_id (full_name)
        `)
        .single();

      if (error) throw error;

      const formatted = {
        ...data,
        category_name: data.categories?.name || categoryObj?.name || 'General',
        category_icon: data.categories?.icon || categoryObj?.icon || 'tag',
        category_color: data.categories?.color || categoryObj?.color || '#10B981',
        user_name: data.profiles?.full_name || profile?.full_name || 'Member',
      };

      setTransactions(prev => [formatted, ...prev]);
      return { success: true, transaction: formatted };
    } catch (err) {
      console.error('Add transaction failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateTransaction = async (id, updates) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const categoryObj = categories.find(c => c.id === updates.category_id);
      const updated = transactions.map(t => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            amount: Number(updates.amount ?? t.amount),
            category_name: categoryObj ? categoryObj.name : t.category_name,
            category_icon: categoryObj ? categoryObj.icon : t.category_icon,
          };
        }
        return t;
      });
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          ...updates,
          amount: Number(updates.amount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await loadHouseholdData(currentHousehold.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteTransaction = async (id) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ----------------------------------------------------------------------------
  // BUDGETS CRUD
  // ----------------------------------------------------------------------------
  const setCategoryBudget = async ({ category_id, month, year, amount }) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const numAmount = Number(amount);

    if (isDemoMode || !isSupabaseConfigured) {
      const existingIndex = budgets.findIndex(
        b => b.category_id === category_id && b.month === Number(month) && b.year === Number(year)
      );

      let updated;
      if (existingIndex >= 0) {
        updated = [...budgets];
        updated[existingIndex] = { ...updated[existingIndex], amount: numAmount };
      } else {
        const newBudget = {
          id: `bg-${Date.now()}`,
          household_id: currentHousehold.id,
          category_id,
          month: Number(month),
          year: Number(year),
          amount: numAmount,
        };
        updated = [...budgets, newBudget];
      }

      setBudgets(updated);
      persistDemoData({ budgets: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .upsert(
          {
            household_id: currentHousehold.id,
            category_id,
            month: Number(month),
            year: Number(year),
            amount: numAmount,
            created_by: user.id,
          },
          { onConflict: 'household_id,category_id,month,year' }
        );

      if (error) throw error;
      await loadHouseholdData(currentHousehold.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteBudget = async (id) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = budgets.filter(b => b.id !== id);
      setBudgets(updated);
      persistDemoData({ budgets: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      setBudgets(prev => prev.filter(b => b.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ----------------------------------------------------------------------------
  // BILLS & PAYMENTS CRUD
  // ----------------------------------------------------------------------------
  const addBill = async (billData) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const newBill = {
      household_id: currentHousehold.id,
      category_id: billData.category_id || null,
      title: billData.title,
      biller_name: billData.biller_name || '',
      account_number: billData.account_number || '',
      amount: Number(billData.amount),
      due_date: billData.due_date,
      status: 'unpaid',
      is_recurring: Boolean(billData.is_recurring),
      frequency: billData.frequency || 'monthly',
      notes: billData.notes || '',
    };

    if (isDemoMode || !isSupabaseConfigured) {
      const createdBill = {
        ...newBill,
        id: `bill-${Date.now()}`,
        payments: [],
        created_at: new Date().toISOString(),
      };
      const updated = [...bills, createdBill];
      setBills(updated);
      persistDemoData({ bills: updated });
      return { success: true, bill: createdBill };
    }

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          ...newBill,
          created_by: user.id,
        })
        .select(`*, categories:category_id (name, icon, color)`)
        .single();

      if (error) throw error;

      const formatted = {
        ...data,
        category_name: data.categories?.name || 'Bill',
        payments: [],
      };

      setBills(prev => [...prev, formatted]);
      return { success: true, bill: formatted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateBill = async (id, updates) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = bills.map(b => b.id === id ? { ...b, ...updates, amount: Number(updates.amount ?? b.amount) } : b);
      setBills(updated);
      persistDemoData({ bills: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase.from('bills').update({
        ...updates,
        amount: Number(updates.amount),
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;
      await loadHouseholdData(currentHousehold.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const recordBillPayment = async (billId, payment) => {
    const payAmount = Number(payment.amount);
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return { success: false, error: 'Bill not found' };

    if (isDemoMode || !isSupabaseConfigured) {
      const newPayment = {
        id: `bp-${Date.now()}`,
        bill_id: billId,
        amount: payAmount,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment.payment_method || 'gcash',
        reference_number: payment.reference_number || '',
        notes: payment.notes || '',
      };

      const updatedPayments = [...(targetBill.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);

      let newStatus = 'unpaid';
      if (totalPaid >= targetBill.amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      // Also automatically record as an expense transaction for realistic ledger sync!
      const autoTx = {
        id: `tx-bill-${Date.now()}`,
        household_id: currentHousehold.id,
        category_id: targetBill.category_id,
        category_name: targetBill.category_name || 'Bill Payment',
        category_icon: 'receipt',
        category_color: '#3B82F6',
        user_id: user?.id,
        user_name: profile?.full_name || 'You',
        type: 'expense',
        amount: payAmount,
        description: `Payment for ${targetBill.title}`,
        transaction_date: payment.payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment.payment_method || 'gcash',
        notes: `Ref: ${payment.reference_number || 'N/A'}. ${payment.notes || ''}`.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedBills = bills.map(b => b.id === billId ? { ...b, status: newStatus, payments: updatedPayments } : b);
      const updatedTx = [autoTx, ...transactions];

      setBills(updatedBills);
      setTransactions(updatedTx);
      persistDemoData({ bills: updatedBills, transactions: updatedTx });

      return { success: true };
    }

    try {
      // 1. Insert bill payment
      const { error: payErr } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          household_id: currentHousehold.id,
          paid_by: user.id,
          amount: payAmount,
          payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
          payment_method: payment.payment_method || 'gcash',
          reference_number: payment.reference_number || null,
          notes: payment.notes || null,
        });

      if (payErr) throw payErr;

      // 2. Also log as household expense transaction
      await supabase
        .from('transactions')
        .insert({
          household_id: currentHousehold.id,
          category_id: targetBill.category_id || null,
          user_id: user.id,
          type: 'expense',
          amount: payAmount,
          description: `Bill Payment: ${targetBill.title}`,
          transaction_date: payment.payment_date || new Date().toISOString().split('T')[0],
          payment_method: payment.payment_method || 'gcash',
          notes: `Ref: ${payment.reference_number || 'N/A'}`,
        });

      await loadHouseholdData(currentHousehold.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteBill = async (id) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = bills.filter(b => b.id !== id);
      setBills(updated);
      persistDemoData({ bills: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      setBills(prev => prev.filter(b => b.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ----------------------------------------------------------------------------
  // SAVINGS GOALS CRUD
  // ----------------------------------------------------------------------------
  const addSavingsGoal = async (goalData) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const newGoal = {
      household_id: currentHousehold.id,
      title: goalData.title,
      target_amount: Number(goalData.target_amount),
      current_amount: 0,
      deadline: goalData.deadline || null,
      category: goalData.category || 'emergency_fund',
      description: goalData.description || '',
      is_completed: false,
    };

    if (isDemoMode || !isSupabaseConfigured) {
      const createdGoal = {
        ...newGoal,
        id: `goal-${Date.now()}`,
        contributions: [],
        created_at: new Date().toISOString(),
      };
      const updated = [createdGoal, ...savingsGoals];
      setSavingsGoals(updated);
      persistDemoData({ savingsGoals: updated });
      return { success: true, goal: createdGoal };
    }

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          ...newGoal,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const formatted = { ...data, contributions: [] };
      setSavingsGoals(prev => [formatted, ...prev]);
      return { success: true, goal: formatted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const contributeToGoal = async (goalId, contribution) => {
    const contAmount = Number(contribution.amount);
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    if (!targetGoal) return { success: false, error: 'Goal not found' };

    if (isDemoMode || !isSupabaseConfigured) {
      const newContrib = {
        id: `sc-${Date.now()}`,
        goal_id: goalId,
        amount: contAmount,
        contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
        notes: contribution.notes || '',
      };

      const updatedContribs = [...(targetGoal.contributions || []), newContrib];
      const newCurrentAmount = updatedContribs.reduce((acc, c) => acc + c.amount, 0);
      const isCompleted = newCurrentAmount >= targetGoal.target_amount;

      const updatedGoals = savingsGoals.map(g =>
        g.id === goalId
          ? { ...g, current_amount: newCurrentAmount, is_completed: isCompleted, contributions: updatedContribs }
          : g
      );

      setSavingsGoals(updatedGoals);
      persistDemoData({ savingsGoals: updatedGoals });
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('savings_contributions')
        .insert({
          goal_id: goalId,
          household_id: currentHousehold.id,
          contributed_by: user.id,
          amount: contAmount,
          contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
          notes: contribution.notes || null,
        });

      if (error) throw error;

      await loadHouseholdData(currentHousehold.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteSavingsGoal = async (id) => {
    if (isDemoMode || !isSupabaseConfigured) {
      const updated = savingsGoals.filter(g => g.id !== id);
      setSavingsGoals(updated);
      persistDemoData({ savingsGoals: updated });
      return { success: true };
    }

    try {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Seed sample Filipino family data button action
  const resetToDemoData = () => {
    if (!currentHousehold) return;
    setTransactions(INITIAL_DEMO_DATA.transactions);
    setBudgets(INITIAL_DEMO_DATA.budgets);
    setBills(INITIAL_DEMO_DATA.bills);
    setSavingsGoals(INITIAL_DEMO_DATA.savingsGoals);
    setCategories(INITIAL_DEMO_DATA.categories);

    localStorage.setItem(`tipidlink_finance_${currentHousehold.id}`, JSON.stringify({
      transactions: INITIAL_DEMO_DATA.transactions,
      budgets: INITIAL_DEMO_DATA.budgets,
      bills: INITIAL_DEMO_DATA.bills,
      savingsGoals: INITIAL_DEMO_DATA.savingsGoals,
      categories: INITIAL_DEMO_DATA.categories,
    }));
  };

  // ----------------------------------------------------------------------------
  // DYNAMIC FINANCIAL CALCULATIONS (Computed from real items, no hardcoding)
  // ----------------------------------------------------------------------------
  const calculations = useMemo(() => {
    // Filter transactions for selected month/year
    const monthlyTransactions = transactions.filter(t => {
      if (!t.transaction_date) return false;
      const d = new Date(t.transaction_date);
      return (d.getMonth() + 1) === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
    });

    const totalIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netSavings = totalIncome - totalExpenses;

    // Household monthly target (from household profile or sum of category budgets)
    const overallTarget = Number(currentHousehold?.monthly_budget_target) || 0;
    const categoryBudgetsTotal = budgets
      .filter(b => b.month === Number(selectedMonth) && b.year === Number(selectedYear))
      .reduce((sum, b) => sum + Number(b.amount), 0);

    const activeBudgetTarget = overallTarget > 0 ? overallTarget : categoryBudgetsTotal;
    const remainingBudget = activeBudgetTarget - totalExpenses;
    const budgetUsagePercent = activeBudgetTarget > 0 ? (totalExpenses / activeBudgetTarget) * 100 : 0;
    const isOverspent = activeBudgetTarget > 0 && totalExpenses > activeBudgetTarget;

    // Group expenses by category
    const categoryExpenseMap = {};
    monthlyTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const catName = t.category_name || 'Other';
        categoryExpenseMap[catName] = (categoryExpenseMap[catName] || 0) + Number(t.amount);
      });

    const categoryBreakdown = Object.entries(categoryExpenseMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Bills calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billsWithCalculations = bills.map(b => {
      const totalPaid = (b.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
      const remainingBalance = Math.max(0, Number(b.amount) - totalPaid);
      const dueDate = new Date(b.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const isOverdue = remainingBalance > 0 && dueDate < today;
      const isPaid = remainingBalance <= 0;
      const isDueSoon = remainingBalance > 0 && dueDate >= today && (dueDate - today) <= (7 * 24 * 60 * 60 * 1000);

      return {
        ...b,
        totalPaid,
        remainingBalance,
        computedStatus: isPaid ? 'paid' : (isOverdue ? 'overdue' : (totalPaid > 0 ? 'partially_paid' : 'unpaid')),
        isDueSoon,
        isOverdue,
      };
    });

    const overdueBills = billsWithCalculations.filter(b => b.computedStatus === 'overdue');
    const upcomingBills = billsWithCalculations.filter(b => b.computedStatus !== 'paid' && !b.isOverdue);

    const totalOverdueAmount = overdueBills.reduce((sum, b) => sum + b.remainingBalance, 0);
    const totalUpcomingAmount = upcomingBills.reduce((sum, b) => sum + b.remainingBalance, 0);

    // Savings goals calculations
    const totalSavedAllGoals = savingsGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
    const totalTargetAllGoals = savingsGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
    const overallSavingsProgress = totalTargetAllGoals > 0 ? (totalSavedAllGoals / totalTargetAllGoals) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      activeBudgetTarget,
      remainingBudget,
      budgetUsagePercent,
      isOverspent,
      categoryBreakdown,
      overdueBills,
      upcomingBills,
      totalOverdueAmount,
      totalUpcomingAmount,
      totalSavedAllGoals,
      totalTargetAllGoals,
      overallSavingsProgress,
      monthlyTransactions,
    };
  }, [transactions, budgets, bills, savingsGoals, currentHousehold, selectedMonth, selectedYear]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        bills,
        savingsGoals,
        categories,
        loading,
        selectedMonth,
        selectedYear,
        setSelectedMonth,
        setSelectedYear,
        calculations,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        setCategoryBudget,
        deleteBudget,
        addBill,
        updateBill,
        recordBillPayment,
        deleteBill,
        addSavingsGoal,
        contributeToGoal,
        deleteSavingsGoal,
        resetToDemoData,
        refreshData: () => currentHousehold && loadHouseholdData(currentHousehold.id),
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
