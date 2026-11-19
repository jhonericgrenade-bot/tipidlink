import { autoDetectBillCategory, matchCategoryId } from './formatters.js';

const normalizeDate = (value) => String(value || '').split('T')[0];

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const isSameAmount = (first, second) => Number(first || 0) === Number(second || 0);

/**
 * Resolves the category used by a bill payment. Keeping this in one place means
 * a bill payment is counted in the same category across the dashboard, budgets,
 * exports, and transaction history.
 */
export const resolveBillPaymentCategory = (bill = {}, categories = []) => {
  const byId = categories.find((category) =>
    category.id === bill.category_id || matchCategoryId(category.id, bill.category_id, categories)
  );
  if (byId) return byId;

  const billCategoryName = normalizeText(bill.category_name);
  const byName = categories.find((category) => normalizeText(category.name) === billCategoryName);
  if (byName) return byName;

  return autoDetectBillCategory(bill.title, bill.biller_name, categories)
    || categories.find((category) => category.type === 'expense' && /utilities|bill/i.test(category.name))
    || categories.find((category) => category.type === 'expense')
    || null;
};

/**
 * Old releases created bill payments and transactions independently. This
 * identifies those legacy transaction rows so reconciliation never counts a
 * payment twice while still recovering payments whose transaction write failed.
 */
export const isTransactionForBillPayment = (transaction = {}, bill = {}, payment = {}) => {
  if (transaction.type !== 'expense') return false;
  if (payment.id && transaction.bill_payment_id === payment.id) return true;

  if (!isSameAmount(transaction.amount, payment.amount)) return false;
  if (normalizeDate(transaction.transaction_date) !== normalizeDate(payment.payment_date)) return false;

  const title = normalizeText(bill.title);
  const description = normalizeText(transaction.description);
  return Boolean(
    title
    && description.includes(title)
    && /(?:bill payment|payment for)/i.test(description)
  );
};

export const createBillPaymentExpense = (bill = {}, payment = {}, categories = []) => {
  const category = resolveBillPaymentCategory(bill, categories);
  const categoryId = category?.id || bill.category_id || null;

  return {
    id: `bill-payment-${payment.id || `${bill.id || 'bill'}-${normalizeDate(payment.payment_date)}-${payment.amount}`}`,
    bill_payment_id: payment.id || null,
    bill_id: bill.id || null,
    is_bill_payment: true,
    is_reconciled_bill_payment: true,
    household_id: bill.household_id,
    category_id: categoryId,
    category_name: category?.name || bill.category_name || 'Bill Payment',
    category_icon: category?.icon || bill.category_icon || 'receipt',
    category_color: category?.color || bill.category_color || '#F59E0B',
    user_id: payment.paid_by || null,
    user_name: payment.paid_by_name || 'Family Member',
    type: 'expense',
    amount: Number(payment.amount || 0),
    description: `Bill Payment: ${bill.title || 'Household Bill'}`,
    transaction_date: normalizeDate(payment.payment_date),
    payment_method: payment.payment_method || 'gcash',
    notes: payment.reference_number ? `Ref: ${payment.reference_number}` : (payment.notes || ''),
    created_at: payment.created_at || null,
  };
};

/**
 * Returns the complete financial ledger. A bill payment is always an expense,
 * even when an older/offline client failed to create its companion transaction.
 */
export const reconcileBillPaymentLedger = (transactions = [], bills = [], categories = []) => {
  const ledger = Array.isArray(transactions) ? [...transactions] : [];
  const matchedTransactionIds = new Set();

  (Array.isArray(bills) ? bills : []).forEach((bill) => {
    (Array.isArray(bill.payments) ? bill.payments : []).forEach((payment) => {
      const matchingTransactionIndex = ledger.findIndex((transaction) => {
        if (matchedTransactionIds.has(transaction.id)) return false;
        return isTransactionForBillPayment(transaction, bill, payment);
      });

      if (matchingTransactionIndex !== -1) {
        const matchingTransaction = ledger[matchingTransactionIndex];
        matchedTransactionIds.add(matchingTransaction.id);
        ledger[matchingTransactionIndex] = {
          ...matchingTransaction,
          bill_payment_id: matchingTransaction.bill_payment_id || payment.id || null,
          bill_id: matchingTransaction.bill_id || bill.id || null,
          is_bill_payment: true,
        };
        return;
      }

      ledger.push(createBillPaymentExpense(bill, payment, categories));
    });
  });

  return ledger.sort((first, second) => {
    const firstDate = normalizeDate(first.transaction_date);
    const secondDate = normalizeDate(second.transaction_date);
    if (firstDate !== secondDate) return secondDate.localeCompare(firstDate);
    return String(second.created_at || '').localeCompare(String(first.created_at || ''));
  });
};
