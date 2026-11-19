import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { INITIAL_DEMO_DATA } from '../lib/mockData';
import { broadcastSyncEvent, subscribeToSyncEvents, isMatchingHouseholdId } from '../lib/realtimeSync';
import {
  matchCategoryId,
  autoDetectBillCategory,
  MOCK_TO_SUPABASE_CATEGORY_MAP,
} from '../lib/formatters';
import {
  areFinancialRecordArraysEqual,
  reconcileBillPaymentLedger,
  resolveBillPaymentCategory,
} from '../lib/billPaymentLedger';

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const resolveCloudHouseholdId = (id) => {
  if (typeof id !== 'string') return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (id === 'hh-santos-family') {
    return '0d37e235-c9dd-4876-a54a-9acb36516599';
  }
  return null;
};

export const resolveCategoryId = (catId, categoriesList = []) => {
  if (!catId) return null;
  if (isUuid(catId)) return catId;
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    const found = categoriesList.find(c => c.id === catId || matchCategoryId(c.id, catId, categoriesList));
    if (found && isUuid(found.id)) return found.id;
  }
  if (MOCK_TO_SUPABASE_CATEGORY_MAP[catId]) return MOCK_TO_SUPABASE_CATEGORY_MAP[catId];
  return null;
};

// Instant warm-cache hydration on initial page open to prevent data disappearing
const getInitialFinanceData = () => {
  if (typeof window === 'undefined') return null;
  try {
    const activeId = localStorage.getItem('tipidlink_active_household_id');
    if (!activeId) return null;
    const storageKey = `tipidlink_finance_${activeId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch {}
  return null;
};

const FinanceContext = createContext(null);

export const FinanceProvider = ({ children }) => {
  const { user, profile, isDemoMode } = useAuth();
  const { currentHousehold, isOwnerOrAdmin, isOwner } = useHousehold();

  // Instant Stale-While-Revalidate hydration: warm cache displays at 0ms so data never disappears
  const initialCache = useMemo(() => getInitialFinanceData(), []);

  const [transactions, setTransactions] = useState(() => initialCache?.transactions || []);
  const [budgets, setBudgets] = useState(() => initialCache?.budgets || []);
  const [bills, setBills] = useState(() => initialCache?.bills || []);
  const [savingsGoals, setSavingsGoals] = useState(() => initialCache?.savingsGoals || []);
  const [categories, setCategories] = useState(() => initialCache?.categories || INITIAL_DEMO_DATA.categories);
  const [loading, setLoading] = useState(() => !initialCache);

  // Selected period for dashboard & budget tracking (defaults to November 2026 for consistent multi-browser presentation demo)
  const [selectedMonth, setSelectedMonth] = useState(11);
  const [selectedYear, setSelectedYear] = useState(2026);

  const prevHouseholdIdRef = useRef(currentHousehold?.id);
  // Load financial records when current household changes (non-destructive)
  useEffect(() => {
    if (!currentHousehold) {
      const cachedActiveId = localStorage.getItem('tipidlink_active_household_id');
      if (cachedActiveId) {
        loadHouseholdData(cachedActiveId, { silent: true });
      }
      return;
    }

    const isDifferentHousehold = prevHouseholdIdRef.current !== currentHousehold.id;
    prevHouseholdIdRef.current = currentHousehold.id;

    loadHouseholdData(currentHousehold.id, { silent: !isDifferentHousehold && transactions.length > 0 });
  }, [currentHousehold?.id, isDemoMode]);

  // Real-time refresh when tab or mobile browser gains focus / screen unlock
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible' && currentHousehold?.id) {
        loadHouseholdData(currentHousehold.id, { silent: true });
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentHousehold?.id]);

  // AUTOMATIC REALTIME SYNC (Cross-device, cross-tab, cross-window)
  useEffect(() => {
    if (!currentHousehold?.id) return;
    const householdId = currentHousehold.id;

    // 1. Universal Realtime Sync Listener (Supabase WebSocket + BroadcastChannel + Storage fallback)
    const unsubscribe = subscribeToSyncEvents((event, payload) => {
      const matchesCurrent = isMatchingHouseholdId(payload.householdId, householdId, payload.inviteCode, currentHousehold?.invite_code);
      if (!matchesCurrent) return;

      if (event === 'finance_updated') {
        // Direct optimistic payload merge for instant real-time sync across devices
        if (payload.budgets && Array.isArray(payload.budgets)) {
          setBudgets(payload.budgets);
          persistDemoData({ budgets: payload.budgets });
        }
        if (payload.transactions && Array.isArray(payload.transactions)) {
          setTransactions(payload.transactions);
          persistDemoData({ transactions: payload.transactions });
        }
        if (payload.bills && Array.isArray(payload.bills)) {
          setBills(payload.bills);
          persistDemoData({ bills: payload.bills });
        }
        if (payload.savingsGoals && Array.isArray(payload.savingsGoals)) {
          setSavingsGoals(payload.savingsGoals);
          persistDemoData({ savingsGoals: payload.savingsGoals });
        }
        loadHouseholdData(householdId, { silent: true });
      } else if (event === 'household_updated') {
        loadHouseholdData(householdId, { silent: true });
      }
    });

    // 2. Direct PostgreSQL table changes if UUID household
    let pgChannel = null;
    const targetHhId = resolveCloudHouseholdId(householdId);
    if (isSupabaseConfigured && targetHhId) {
      pgChannel = supabase.channel(`tipidlink-finance-pg-sync-${targetHhId}`);
      pgChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${targetHhId}` }, () => {
          loadHouseholdData(householdId, { silent: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `household_id=eq.${targetHhId}` }, () => {
          loadHouseholdData(householdId, { silent: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `household_id=eq.${targetHhId}` }, () => {
          loadHouseholdData(householdId, { silent: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_payments', filter: `household_id=eq.${targetHhId}` }, () => {
          // A payment changes both the bill balance and its budget expense.
          // Listen directly instead of relying only on the bill-status trigger.
          loadHouseholdData(householdId, { silent: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `household_id=eq.${targetHhId}` }, () => {
          loadHouseholdData(householdId, { silent: true });
        })
        .subscribe();
    }

    // 3. Light auto-sync heartbeat every 8 seconds so no unit is ever stale
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadHouseholdData(householdId, { silent: true });
      }
    }, 8000);

    return () => {
      unsubscribe();
      if (pgChannel) supabase.removeChannel(pgChannel);
      clearInterval(interval);
    };
  }, [currentHousehold?.id]);

  const loadHouseholdData = async (householdId, options = {}) => {
    if (!householdId) return;

    const isSilent = options.silent === true;
    if (!isSilent && transactions.length === 0) {
      setLoading(true);
    }

    const targetHouseholdId = resolveCloudHouseholdId(householdId);
    const storageKey = `tipidlink_finance_${householdId}`;

    if (!isSupabaseConfigured || !user?.id || !targetHouseholdId) {
      // Safe local/cache loader: never query Postgres with invalid UUID
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          let loadedTx = parsed.transactions || [];
          let loadedBudgets = parsed.budgets || [];
          let loadedBills = parsed.bills || [];

          if (householdId === 'hh-santos-family' || isDemoMode) {
            const hasNovTx = loadedTx.some(t => t.transaction_date && t.transaction_date.startsWith('2026-11'));
            if (!hasNovTx) {
              const novTx = INITIAL_DEMO_DATA.transactions.filter(t => t.transaction_date && t.transaction_date.startsWith('2026-11'));
              loadedTx = [...loadedTx, ...novTx];
            }

            const hasNovBudgets = loadedBudgets.some(b => b.month === 11 && b.year === 2026);
            if (!hasNovBudgets) {
              const novBudgets = INITIAL_DEMO_DATA.budgets.filter(b => b.month === 11 && b.year === 2026);
              loadedBudgets = [...loadedBudgets, ...novBudgets];
            }

            if (householdId === 'hh-santos-family') {
              const hasNovBills = loadedBills.some(b => b.due_date && b.due_date.startsWith('2026-11'));
              if (!hasNovBills) {
                loadedBills = INITIAL_DEMO_DATA.bills;
              }
            }
          }

          localStorage.setItem(storageKey, JSON.stringify({
            transactions: loadedTx,
            budgets: loadedBudgets,
            bills: loadedBills,
            savingsGoals: parsed.savingsGoals || INITIAL_DEMO_DATA.savingsGoals,
            categories: parsed.categories || INITIAL_DEMO_DATA.categories,
          }));

          setTransactions(prev => areFinancialRecordArraysEqual(prev, loadedTx) ? prev : loadedTx);
          setBudgets(prev => areFinancialRecordArraysEqual(prev, loadedBudgets) ? prev : loadedBudgets);
          setBills(prev => areFinancialRecordArraysEqual(prev, loadedBills) ? prev : loadedBills);
          setSavingsGoals(prev => areFinancialRecordArraysEqual(prev, parsed.savingsGoals || INITIAL_DEMO_DATA.savingsGoals) ? prev : (parsed.savingsGoals || INITIAL_DEMO_DATA.savingsGoals));
          setCategories(prev => areFinancialRecordArraysEqual(prev, parsed.categories || INITIAL_DEMO_DATA.categories) ? prev : (parsed.categories || INITIAL_DEMO_DATA.categories));
          if (!isSilent) setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse local finance data:', e);
        }
      }

      if (householdId === 'hh-santos-family' || isDemoMode) {
        setTransactions(prev => areFinancialRecordArraysEqual(prev, INITIAL_DEMO_DATA.transactions) ? prev : INITIAL_DEMO_DATA.transactions);
        setBudgets(prev => areFinancialRecordArraysEqual(prev, INITIAL_DEMO_DATA.budgets) ? prev : INITIAL_DEMO_DATA.budgets);
        setBills(prev => areFinancialRecordArraysEqual(prev, INITIAL_DEMO_DATA.bills) ? prev : INITIAL_DEMO_DATA.bills);
        setSavingsGoals(prev => areFinancialRecordArraysEqual(prev, INITIAL_DEMO_DATA.savingsGoals) ? prev : INITIAL_DEMO_DATA.savingsGoals);
        setCategories(prev => areFinancialRecordArraysEqual(prev, INITIAL_DEMO_DATA.categories) ? prev : INITIAL_DEMO_DATA.categories);

        localStorage.setItem(storageKey, JSON.stringify({
          transactions: INITIAL_DEMO_DATA.transactions,
          budgets: INITIAL_DEMO_DATA.budgets,
          bills: INITIAL_DEMO_DATA.bills,
          savingsGoals: INITIAL_DEMO_DATA.savingsGoals,
          categories: INITIAL_DEMO_DATA.categories,
        }));
      } else {
        setTransactions([]);
        setBudgets([]);
        setBills([]);
        setSavingsGoals([]);
        setCategories(INITIAL_DEMO_DATA.categories);
      }

      if (!isSilent) setLoading(false);
      return;
    }

    try {
      // 1. Categories (System + household)
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .or(`is_system.eq.true,household_id.eq.${targetHouseholdId}`);

      // 2. Transactions
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select(`
          *,
          categories:category_id (name, icon, color),
          profiles:user_id (full_name)
        `)
        .eq('household_id', targetHouseholdId)
        .order('transaction_date', { ascending: false });

      if (txErr) throw txErr;

      // 3. Budgets
      const { data: bgData, error: bgErr } = await supabase
        .from('budgets')
        .select(`
          *,
          categories:category_id (name, icon, color)
        `)
        .eq('household_id', targetHouseholdId);

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
        .eq('household_id', targetHouseholdId)
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
        .eq('household_id', targetHouseholdId)
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

      const isSantosTarget = targetHouseholdId === '0d37e235-c9dd-4876-a54a-9acb36516599';

      const finalTx = (formattedTx.length === 0 && isSantosTarget && !isSupabaseConfigured)
        ? INITIAL_DEMO_DATA.transactions
        : formattedTx;

      const finalBudgets = (bgData?.length === 0 && isSantosTarget && !isSupabaseConfigured)
        ? INITIAL_DEMO_DATA.budgets
        : (bgData || []);

      const finalBills = (formattedBills.length === 0 && isSantosTarget && !isSupabaseConfigured)
        ? INITIAL_DEMO_DATA.bills
        : formattedBills;

      const finalGoals = (formattedGoals.length === 0 && isSantosTarget && !isSupabaseConfigured)
        ? INITIAL_DEMO_DATA.savingsGoals
        : formattedGoals;

      const categoriesList = (catData && catData.length > 0) ? catData : INITIAL_DEMO_DATA.categories;
      setCategories(prev => areFinancialRecordArraysEqual(prev, categoriesList) ? prev : categoriesList);
      setTransactions(prev => areFinancialRecordArraysEqual(prev, finalTx) ? prev : finalTx);
      setBudgets(prev => areFinancialRecordArraysEqual(prev, finalBudgets) ? prev : finalBudgets);
      setBills(prev => areFinancialRecordArraysEqual(prev, finalBills) ? prev : finalBills);
      setSavingsGoals(prev => areFinancialRecordArraysEqual(prev, finalGoals) ? prev : finalGoals);

      // Persist to warm cache for instant 0ms load on next visit
      const cacheBlob = JSON.stringify({
        transactions: finalTx,
        budgets: finalBudgets,
        bills: finalBills,
        savingsGoals: finalGoals,
        categories: categoriesList,
      });
      localStorage.setItem(storageKey, cacheBlob);
      if (householdId === 'hh-santos-family' || targetHouseholdId === '0d37e235-c9dd-4876-a54a-9acb36516599') {
        localStorage.setItem('tipidlink_finance_0d37e235-c9dd-4876-a54a-9acb36516599', cacheBlob);
        localStorage.setItem('tipidlink_finance_hh-santos-family', cacheBlob);
      }
    } catch (err) {
      console.error('Error fetching household financial data:', err);
      // Graceful fallback: do NOT wipe existing transactions on network drop!
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            setTransactions(prev => areFinancialRecordArraysEqual(prev, parsed.transactions) ? prev : parsed.transactions);
            if (parsed.budgets) setBudgets(prev => areFinancialRecordArraysEqual(prev, parsed.budgets) ? prev : parsed.budgets);
            if (parsed.bills) setBills(prev => areFinancialRecordArraysEqual(prev, parsed.bills) ? prev : parsed.bills);
            if (parsed.savingsGoals) setSavingsGoals(prev => areFinancialRecordArraysEqual(prev, parsed.savingsGoals) ? prev : parsed.savingsGoals);
          }
        } catch {}
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
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
    const blob = JSON.stringify(current);
    localStorage.setItem(storageKey, blob);
    if (currentHousehold.id === 'hh-santos-family' || currentHousehold.id === '0d37e235-c9dd-4876-a54a-9acb36516599') {
      localStorage.setItem('tipidlink_finance_0d37e235-c9dd-4876-a54a-9acb36516599', blob);
      localStorage.setItem('tipidlink_finance_hh-santos-family', blob);
    }
  };

  const targetCloudHouseholdId = resolveCloudHouseholdId(currentHousehold?.id);
  const isLocalFinance = !isSupabaseConfigured || !user?.id || !targetCloudHouseholdId;

  // A bill payment is a real expense, even when a legacy/offline client saved
  // the payment but missed its companion transaction row. All budget-facing
  // screens and exports use this reconciled ledger to prevent under-counting.
  const ledgerTransactions = useMemo(
    () => reconcileBillPaymentLedger(transactions, bills, categories),
    [transactions, bills, categories]
  );

  // ----------------------------------------------------------------------------
  // TRANSACTIONS CRUD
  // ----------------------------------------------------------------------------
  const addTransaction = async (tx) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const targetHhId = resolveCloudHouseholdId(currentHousehold.id);
    const resolvedCatId = resolveCategoryId(tx.category_id);
    const categoryObj = categories.find(c => c.id === tx.category_id || c.id === resolvedCatId);
    const numAmount = Number(tx.amount);

    if (isLocalFinance || !targetHhId) {
      const createdTx = {
        ...tx,
        household_id: currentHousehold.id,
        user_id: user?.id,
        amount: numAmount,
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
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        transactions: updated,
        type: 'transaction',
      });
      return { success: true, transaction: createdTx };
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          household_id: targetHhId,
          category_id: resolvedCatId,
          user_id: user?.id,
          type: tx.type,
          amount: numAmount,
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

      const updated = [formatted, ...transactions];
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        transactions: updated,
        type: 'transaction',
      });
      return { success: true, transaction: formatted };
    } catch (err) {
      console.warn('Direct Supabase tx insert note, applying resilient local insert:', err);
      const createdTx = {
        ...tx,
        household_id: currentHousehold.id,
        user_id: user?.id,
        amount: numAmount,
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
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        transactions: updated,
        type: 'transaction',
      });
      return { success: true, transaction: createdTx };
    }
  };

  const updateTransaction = async (id, updates) => {
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);
    const resolvedCatId = updates.category_id ? resolveCategoryId(updates.category_id) : undefined;
    const categoryObj = categories.find(c => c.id === updates.category_id || c.id === resolvedCatId);

    const applyLocal = () => {
      const updated = transactions.map(t => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            amount: updates.amount !== undefined ? Number(updates.amount) : t.amount,
            category_name: categoryObj ? categoryObj.name : t.category_name,
            category_icon: categoryObj ? categoryObj.icon : t.category_icon,
          };
        }
        return t;
      });
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        transactions: updated,
        type: 'transaction',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const dbUpdates = {
        ...updates,
        amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
        category_id: resolvedCatId !== undefined ? resolvedCatId : updates.category_id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Update transaction DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  const deleteTransaction = async (id) => {
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);

    const applyLocal = () => {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      persistDemoData({ transactions: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        transactions: updated,
        type: 'transaction',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Delete transaction DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  // ----------------------------------------------------------------------------
  // BUDGETS CRUD
  // ----------------------------------------------------------------------------
  const setCategoryBudget = async ({ id, category_id, month, year, amount }) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };

    const numAmount = Number(amount);
    const targetMonth = Number(month);
    const targetYear = Number(year);
    const targetHhId = resolveCloudHouseholdId(currentHousehold.id);
    const resolvedCatId = resolveCategoryId(category_id) || category_id;

    const applyLocal = () => {
      const existingIndex = budgets.findIndex(
        b => (id && b.id === id) || (b.category_id === category_id && b.month === targetMonth && b.year === targetYear) || (resolvedCatId && b.category_id === resolvedCatId && b.month === targetMonth && b.year === targetYear)
      );

      let updated;
      if (existingIndex >= 0) {
        updated = [...budgets];
        updated[existingIndex] = { ...updated[existingIndex], amount: numAmount };
      } else {
        const newBudget = {
          id: id || `bg-${Date.now()}`,
          household_id: currentHousehold.id,
          category_id: resolvedCatId || category_id,
          month: targetMonth,
          year: targetYear,
          amount: numAmount,
        };
        updated = [...budgets, newBudget];
      }

      setBudgets(updated);
      persistDemoData({ budgets: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        budgets: updated,
        type: 'budget',
      });
      return updated;
    };

    if (isLocalFinance || !targetHhId || !isUuid(resolvedCatId)) {
      applyLocal();
      return { success: true };
    }

    try {
      const existing = budgets.find(
        b => (id && b.id === id) || (b.category_id === resolvedCatId && b.month === targetMonth && b.year === targetYear)
      );

      if (existing?.id && isUuid(existing.id)) {
        const { error: updateErr } = await supabase
          .from('budgets')
          .update({
            amount: numAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: dbExisting } = await supabase
          .from('budgets')
          .select('id')
          .eq('household_id', targetHhId)
          .eq('category_id', resolvedCatId)
          .eq('month', targetMonth)
          .eq('year', targetYear)
          .maybeSingle();

        if (dbExisting?.id) {
          const { error: updateErr } = await supabase
            .from('budgets')
            .update({
              amount: numAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbExisting.id);

          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('budgets')
            .insert({
              household_id: targetHhId,
              category_id: resolvedCatId,
              month: targetMonth,
              year: targetYear,
              amount: numAmount,
              created_by: user.id,
            });

          if (insertErr) throw insertErr;
        }
      }

      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Direct Supabase budget save note, applying resilient state update:', err);
      applyLocal();
      return { success: true };
    }
  };

  const deleteBudget = async (id) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };
    const targetHhId = resolveCloudHouseholdId(currentHousehold.id);

    const applyLocal = () => {
      const updated = budgets.filter(b => b.id !== id);
      setBudgets(updated);
      persistDemoData({ budgets: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        budgets: updated,
        type: 'budget',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Delete budget DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  // ----------------------------------------------------------------------------
  // BILLS & PAYMENTS CRUD
  // ----------------------------------------------------------------------------
  const addBill = async (billData) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };
    const targetHhId = resolveCloudHouseholdId(currentHousehold.id);

    // Resolve matching category with intelligence
    let matchedCat = categories.find(c => c.id === billData.category_id || matchCategoryId(c.id, billData.category_id, categories));
    if (!matchedCat && billData.title) {
      matchedCat = autoDetectBillCategory(billData.title, billData.biller_name, categories);
    }
    if (!matchedCat) {
      matchedCat = categories.find(c => c.type === 'expense' && /utilities|bill/i.test(c.name))
        || categories.find(c => c.type === 'expense')
        || { id: 'cat-2', name: 'Utilities & Bills', icon: 'receipt', color: '#F59E0B' };
    }

    const assignedCatId = billData.category_id || matchedCat?.id || 'cat-2';
    const assignedCatName = matchedCat?.name || 'Utilities & Bills';

    const newBill = {
      household_id: targetHhId || currentHousehold.id,
      category_id: assignedCatId,
      category_name: assignedCatName,
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

    const applyLocal = (billObj) => {
      const updated = [...bills, billObj];
      setBills(updated);
      persistDemoData({ bills: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        bills: updated,
        type: 'bill',
      });
      return { success: true, bill: billObj };
    };

    if (isLocalFinance || !targetHhId) {
      const createdBill = {
        ...newBill,
        id: `bill-${Date.now()}`,
        payments: [],
        created_at: new Date().toISOString(),
      };
      return applyLocal(createdBill);
    }

    try {
      const isCatUuid = isUuid(assignedCatId);
      const dbCatId = isCatUuid ? assignedCatId : (resolveCategoryId(assignedCatId, categories) || null);

      const { data, error } = await supabase
        .from('bills')
        .insert({
          title: billData.title,
          biller_name: billData.biller_name || null,
          account_number: billData.account_number || null,
          amount: Number(billData.amount),
          due_date: billData.due_date,
          status: 'unpaid',
          is_recurring: Boolean(billData.is_recurring),
          frequency: billData.frequency || 'monthly',
          notes: billData.notes || null,
          category_id: dbCatId,
          household_id: targetHhId,
          created_by: user?.id,
        })
        .select(`*, categories:category_id (name, icon, color)`)
        .single();

      if (error) throw error;

      const formatted = {
        ...data,
        category_name: data.categories?.name || assignedCatName || 'Bill',
        payments: [],
      };

      return applyLocal(formatted);
    } catch (err) {
      console.error('Add bill failed:', err);
      // Do not create a cloud-only phantom bill. It would appear saved but
      // disappear on refresh because it was never stored in Supabase.
      return { success: false, error: err?.message || 'Could not save this bill. Please try again.' };
    }
  };

  const updateBill = async (id, updates) => {
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);
    const applyLocal = () => {
      const updated = bills.map(b => b.id === id ? { ...b, ...updates, amount: Number(updates.amount ?? b.amount) } : b);
      setBills(updated);
      persistDemoData({ bills: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        bills: updated,
        type: 'bill',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('bills').update({
        ...updates,
        amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;
      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Update bill DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  const recordBillPayment = async (billId, payment) => {
    const payAmount = Number(payment.amount);
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return { success: false, error: 'Bill not found' };
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return { success: false, error: 'Enter a valid payment amount.' };
    }

    const amountAlreadyPaid = (targetBill.payments || [])
      .reduce((total, existingPayment) => total + Number(existingPayment.amount || 0), 0);
    const remainingBalance = Math.max(0, Number(targetBill.amount || 0) - amountAlreadyPaid);
    if (payAmount > remainingBalance + 0.0001) {
      return { success: false, error: `Payment cannot exceed the remaining balance of ₱${remainingBalance.toFixed(2)}.` };
    }

    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);

    const matchedCat = resolveBillPaymentCategory(targetBill, categories)
      || { id: 'cat-2', name: 'Utilities & Bills', icon: 'receipt', color: '#F59E0B' };

    const assignedCatId = matchedCat.id || targetBill.category_id || 'cat-2';
    const assignedCatName = matchedCat.name || targetBill.category_name || 'Utilities & Bills';
    const assignedCatIcon = matchedCat.icon || 'receipt';
    const assignedCatColor = matchedCat.color || '#F59E0B';

    const paymentDate = payment.payment_date || new Date().toISOString().split('T')[0];

    const applyLocal = (newPayment) => {
      const updatedPayments = [...(targetBill.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

      let newStatus = 'unpaid';
      if (totalPaid >= targetBill.amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      const autoTx = {
        id: `tx-bill-${Date.now()}`,
        bill_payment_id: newPayment.id,
        bill_id: billId,
        is_bill_payment: true,
        household_id: currentHousehold?.id,
        category_id: assignedCatId,
        category_name: assignedCatName,
        category_icon: assignedCatIcon,
        category_color: assignedCatColor,
        user_id: user?.id,
        user_name: profile?.full_name || 'You',
        type: 'expense',
        amount: payAmount,
        description: `Payment for ${targetBill.title}`,
        transaction_date: paymentDate,
        payment_method: payment.payment_method || 'gcash',
        notes: `Ref: ${payment.reference_number || 'N/A'}. ${payment.notes || ''}`.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedBills = bills.map(b => b.id === billId ? {
        ...b,
        status: newStatus,
        payments: updatedPayments,
        category_id: assignedCatId,
        category_name: assignedCatName,
      } : b);
      const updatedTx = [autoTx, ...transactions];

      setBills(updatedBills);
      setTransactions(updatedTx);
      persistDemoData({ bills: updatedBills, transactions: updatedTx });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        bills: updatedBills,
        transactions: updatedTx,
        type: 'bill',
      });
      return { success: true };
    };

    if (isLocalFinance || !targetHhId || !isUuid(billId)) {
      const newPayment = {
        id: `bp-${Date.now()}`,
        bill_id: billId,
        amount: payAmount,
        payment_date: paymentDate,
        payment_method: payment.payment_method || 'gcash',
        reference_number: payment.reference_number || '',
        notes: payment.notes || '',
      };
      return applyLocal(newPayment);
    }

    try {
      // Persist the resolved category before the payment is recorded. The
      // database trigger uses this category to create the linked expense row.
      const isCatUuid = isUuid(assignedCatId);
      const dbCatId = isCatUuid ? assignedCatId : (resolveCategoryId(assignedCatId, categories) || null);
      if (dbCatId && !matchCategoryId(targetBill.category_id, dbCatId, categories)) {
        const { error: categoryErr } = await supabase
          .from('bills')
          .update({ category_id: dbCatId })
          .eq('id', billId);
        if (categoryErr) throw categoryErr;
      }

      const { data: payRow, error: payErr } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: billId,
          household_id: targetHhId,
          paid_by: user?.id,
          amount: payAmount,
          payment_date: paymentDate,
          payment_method: payment.payment_method || 'gcash',
          reference_number: payment.reference_number || null,
          notes: payment.notes || null,
        })
        .select()
        .single();

      if (payErr) throw payErr;

      const result = applyLocal(payRow);
      // The database migration creates a permanent, uniquely linked expense.
      // Refresh after the optimistic update so the ledger is authoritative on
      // every browser and remains correct after a page reload.
      await loadHouseholdData(targetHhId, { silent: true });
      return result;
    } catch (err) {
      console.error('Bill payment failed:', err);
      // The local-only branch above remains available for offline/demo mode.
      // In cloud mode, surface the error instead of showing a payment that
      // disappears on the next reload.
      return { success: false, error: err?.message || 'Could not save this bill payment. Please try again.' };
    }
  };

  const deleteBill = async (id) => {
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);
    const applyLocal = () => {
      const updated = bills.filter(b => b.id !== id);
      setBills(updated);
      persistDemoData({ bills: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        bills: updated,
        type: 'bill',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Delete bill DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  // ----------------------------------------------------------------------------
  // SAVINGS GOALS CRUD
  // ----------------------------------------------------------------------------
  const addSavingsGoal = async (goalData) => {
    if (!currentHousehold) return { success: false, error: 'No active household' };
    const targetHhId = resolveCloudHouseholdId(currentHousehold.id);

    const newGoal = {
      household_id: targetHhId || currentHousehold.id,
      title: goalData.title,
      target_amount: Number(goalData.target_amount),
      current_amount: 0,
      deadline: goalData.deadline || null,
      category: goalData.category || 'emergency_fund',
      description: goalData.description || '',
      is_completed: false,
    };

    const applyLocal = (goalObj) => {
      const updated = [goalObj, ...savingsGoals];
      setSavingsGoals(updated);
      persistDemoData({ savingsGoals: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold.id,
        inviteCode: currentHousehold.invite_code,
        savingsGoals: updated,
        type: 'savingsGoal',
      });
      return { success: true, goal: goalObj };
    };

    if (isLocalFinance || !targetHhId) {
      const createdGoal = {
        ...newGoal,
        id: `goal-${Date.now()}`,
        contributions: [],
        created_at: new Date().toISOString(),
      };
      return applyLocal(createdGoal);
    }

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          ...newGoal,
          household_id: targetHhId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      const formatted = { ...data, contributions: [] };
      return applyLocal(formatted);
    } catch (err) {
      console.warn('Add savings goal DB note, applying local:', err);
      const createdGoal = {
        ...newGoal,
        id: `goal-${Date.now()}`,
        contributions: [],
        created_at: new Date().toISOString(),
      };
      return applyLocal(createdGoal);
    }
  };

  const contributeToGoal = async (goalId, contribution) => {
    const contAmount = Number(contribution.amount);
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    if (!targetGoal) return { success: false, error: 'Goal not found' };
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);

    const applyLocal = (newContrib) => {
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
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        savingsGoals: updatedGoals,
        type: 'savingsGoal',
      });
      return { success: true };
    };

    if (isLocalFinance || !targetHhId || !isUuid(goalId)) {
      const newContrib = {
        id: `sc-${Date.now()}`,
        goal_id: goalId,
        amount: contAmount,
        contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
        notes: contribution.notes || '',
      };
      return applyLocal(newContrib);
    }

    try {
      const { error } = await supabase
        .from('savings_contributions')
        .insert({
          goal_id: goalId,
          household_id: targetHhId,
          contributed_by: user.id,
          amount: contAmount,
          contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
          notes: contribution.notes || null,
        });

      if (error) throw error;

      return applyLocal({
        id: `sc-${Date.now()}`,
        goal_id: goalId,
        amount: contAmount,
        contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
        notes: contribution.notes || '',
      });
    } catch (err) {
      console.warn('Contribute to goal DB note, applying local:', err);
      const newContrib = {
        id: `sc-${Date.now()}`,
        goal_id: goalId,
        amount: contAmount,
        contribution_date: contribution.contribution_date || new Date().toISOString().split('T')[0],
        notes: contribution.notes || '',
      };
      return applyLocal(newContrib);
    }
  };

  const deleteSavingsGoal = async (id) => {
    const targetHhId = resolveCloudHouseholdId(currentHousehold?.id);
    const applyLocal = () => {
      const updated = savingsGoals.filter(g => g.id !== id);
      setSavingsGoals(updated);
      persistDemoData({ savingsGoals: updated });
      broadcastSyncEvent('finance_updated', {
        householdId: currentHousehold?.id,
        inviteCode: currentHousehold?.invite_code,
        savingsGoals: updated,
        type: 'savingsGoal',
      });
    };

    if (isLocalFinance || !targetHhId || !isUuid(id)) {
      applyLocal();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
      applyLocal();
      loadHouseholdData(targetHhId, { silent: true });
      return { success: true };
    } catch (err) {
      console.warn('Delete savings goal DB note, applying local:', err);
      applyLocal();
      return { success: true };
    }
  };

  // Seed sample Filipino family data button action (works reliably in any browser or account)
  const resetToDemoData = () => {
    if (!currentHousehold) return;

    const updatedTx = INITIAL_DEMO_DATA.transactions.map(t => ({
      ...t,
      household_id: currentHousehold.id,
    }));
    const updatedBudgets = INITIAL_DEMO_DATA.budgets.map(b => ({
      ...b,
      household_id: currentHousehold.id,
    }));
    const updatedBills = INITIAL_DEMO_DATA.bills.map(b => ({
      ...b,
      household_id: currentHousehold.id,
    }));
    const updatedGoals = INITIAL_DEMO_DATA.savingsGoals.map(g => ({
      ...g,
      household_id: currentHousehold.id,
    }));

    setTransactions(updatedTx);
    setBudgets(updatedBudgets);
    setBills(updatedBills);
    setSavingsGoals(updatedGoals);
    setCategories(INITIAL_DEMO_DATA.categories);
    setSelectedMonth(11);
    setSelectedYear(2026);

    const storageKey = `tipidlink_finance_${currentHousehold.id}`;

    localStorage.setItem(storageKey, JSON.stringify({
      transactions: updatedTx,
      budgets: updatedBudgets,
      bills: updatedBills,
      savingsGoals: updatedGoals,
      categories: INITIAL_DEMO_DATA.categories,
    }));

    broadcastSyncEvent('finance_updated', { householdId: currentHousehold.id });
  };

  // ----------------------------------------------------------------------------
  // DYNAMIC FINANCIAL CALCULATIONS (Computed from real items, no hardcoding)
  // ----------------------------------------------------------------------------
  const calculations = useMemo(() => {
    // Filter transactions for selected month/year (robust parsing without UTC drift)
    const monthlyTransactions = ledgerTransactions.filter(t => {
      if (!t.transaction_date) return false;
      let m, y;
      if (typeof t.transaction_date === 'string' && /^\d{4}-\d{2}/.test(t.transaction_date)) {
        const parts = t.transaction_date.split('T')[0].split('-');
        y = Number(parts[0]);
        m = Number(parts[1]);
      } else {
        const d = new Date(t.transaction_date);
        y = d.getFullYear();
        m = d.getMonth() + 1;
      }
      return m === Number(selectedMonth) && y === Number(selectedYear);
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
  }, [ledgerTransactions, budgets, bills, savingsGoals, currentHousehold, selectedMonth, selectedYear]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        ledgerTransactions,
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
