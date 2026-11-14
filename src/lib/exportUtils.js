/**
 * TipidLink Cross-Platform Export Utilities
 * Optimized for Desktop PC, Mobile Browsers (iOS Safari, Android Chrome), 
 * Progressive Web Apps (PWA), and Mobile WebViews (Capacitor).
 */

// Escape CSV cell to handle quotes, commas, and line breaks
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Universal CSV Exporter
 * Direct download directly into Android/PC "Downloads" folder / "Files" app
 * Fallbacks to Data URI, Web Share, or Clipboard if in-app browser blocks direct download
 */
export const exportToCSV = async ({ filename, headers, rows, title = 'TipidLink Export' }) => {
  if (!rows || rows.length === 0) {
    alert('No records available to export.');
    return { success: false, reason: 'empty' };
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Microsoft Excel, Numbers, and Google Sheets
  // correctly recognize currency symbols (₱) and UTF-8 characters across all platforms
  const csvBody = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');

  const csvContent = '\uFEFF' + csvBody;
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  // 1. Direct File Download (Saves directly to Android "Downloads" / PC Downloads / iOS Files)
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    return { success: true, method: 'direct_download', filename: cleanFilename };
  } catch (downloadErr) {
    console.warn('Direct blob download failed, trying data-uri fallback:', downloadErr);
  }

  // 2. Fallback: Data-URI link for browsers that block object URLs
  try {
    const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', cleanFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, method: 'data_uri', filename: cleanFilename };
  } catch (dataUriErr) {
    console.warn('Data-URI fallback failed, attempting Web Share:', dataUriErr);
  }

  // 3. Fallback: Web Share API if direct download is blocked by in-app browser
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], cleanFilename, { type: 'text/csv' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `${title} exported from TipidLink`,
        });
        return { success: true, method: 'native_share', filename: cleanFilename };
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('Web Share failed:', shareErr);
    }
  }

  // 4. Final Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(csvContent);
    alert('The CSV file content has been copied to your clipboard. You can paste it into Google Sheets or Excel.');
    return { success: true, method: 'clipboard' };
  } catch (clipErr) {
    alert(`Could not download file: ${clipErr.message}`);
    return { success: false, error: clipErr };
  }
};

/**
 * Universal JSON Exporter for Backups
 * Direct download directly into Android/PC "Downloads" folder
 */
export const exportToJSON = async ({ filename, data, title = 'TipidLink Backup' }) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

  // 1. Direct File Download (Direct to Android "Downloads" / PC Downloads)
  try {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    return { success: true, method: 'direct_download', filename: cleanFilename };
  } catch (err) {
    console.warn('Direct JSON download error, attempting Web Share fallback:', err);
  }

  // 2. Fallback: Web Share API if direct download is blocked by in-app browser
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], cleanFilename, { type: 'application/json' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: `${title} exported from TipidLink`,
        });
        return { success: true, method: 'native_share', filename: cleanFilename };
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return { success: true, method: 'cancelled' };
    }
  }

  alert(`Could not download backup file.`);
  return { success: false };
};

/**
 * Specific Exporters
 */

// 1. Transactions CSV
export const exportTransactionsCSV = async (transactions = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_transactions_${safeName}_${dateStr}.csv`;

  const headers = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Amount (PHP)',
    'Logged By',
    'Payment Method',
    'Notes'
  ];

  const rows = transactions.map(t => [
    t.transaction_date || '',
    (t.type || 'expense').toUpperCase(),
    t.description || '',
    t.category_name || (t.categories?.name) || 'General',
    t.amount || 0,
    t.user_name || (t.profiles?.full_name) || 'Member',
    (t.payment_method || 'cash').toUpperCase(),
    t.notes || ''
  ]);

  return exportToCSV({
    filename,
    headers,
    rows,
    title: `${householdName} - Transactions Report`
  });
};

// 2. Budgets CSV
export const exportBudgetsCSV = async ({
  budgets = [],
  categories = [],
  transactions = [],
  householdName = 'Household',
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  overallMonthlyTarget = 0
}) => {
  const dateStr = `${year}_${String(month).padStart(2, '0')}`;
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_budgets_${safeName}_${dateStr}.csv`;

  const headers = [
    'Category',
    'Allocated Budget (PHP)',
    'Actual Spent (PHP)',
    'Remaining (PHP)',
    'Utilization (%)',
    'Status'
  ];

  // Calculate actual spent per category for the selected month/year
  const monthlyExpenses = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.transaction_date);
    return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
  });

  const rows = categories
    .filter(c => c.name && c.name.toLowerCase() !== 'income')
    .map(cat => {
      const budgetObj = budgets.find(b => b.category_id === cat.id);
      const allocated = budgetObj ? Number(budgetObj.amount) : 0;
      const spent = monthlyExpenses
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const remaining = allocated > 0 ? allocated - spent : 0;
      const utilization = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : (spent > 0 ? '100.0' : '0.0');
      
      let status = 'No Limit Set';
      if (allocated > 0) {
        if (spent > allocated) status = 'OVER BUDGET';
        else if (spent >= allocated * 0.9) status = 'NEAR LIMIT';
        else status = 'ON TRACK';
      }

      return [
        cat.name,
        allocated,
        spent,
        remaining,
        `${utilization}%`,
        status
      ];
    });

  // Add overall summary row
  const totalAllocated = rows.reduce((s, r) => s + Number(r[1]), 0);
  const totalSpent = rows.reduce((s, r) => s + Number(r[2]), 0);
  const overallLimit = overallMonthlyTarget || totalAllocated;
  const overallRemaining = overallLimit - totalSpent;

  rows.push([
    'OVERALL TOTAL / LIMIT',
    overallLimit,
    totalSpent,
    overallRemaining,
    overallLimit > 0 ? `${((totalSpent / overallLimit) * 100).toFixed(1)}%` : '0%',
    totalSpent > overallLimit && overallLimit > 0 ? 'OVER BUDGET' : 'ON TRACK'
  ]);

  return exportToCSV({
    filename,
    headers,
    rows,
    title: `${householdName} - Budget Report (${month}/${year})`
  });
};

// 3. Bills CSV
export const exportBillsCSV = async (bills = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_bills_${safeName}_${dateStr}.csv`;

  const headers = [
    'Bill Name',
    'Biller / Provider',
    'Account / Reference No.',
    'Total Amount (PHP)',
    'Total Paid (PHP)',
    'Remaining Balance (PHP)',
    'Due Date',
    'Payment Status',
    'Recurring',
    'Notes'
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = bills.map(b => {
    const totalPaid = (b.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const remaining = Math.max(0, Number(b.amount) - totalPaid);
    const dueDate = new Date(b.due_date);
    dueDate.setHours(0, 0, 0, 0);

    let status = 'UNPAID';
    if (remaining <= 0) status = 'PAID';
    else if (dueDate < today) status = 'OVERDUE';
    else if (totalPaid > 0) status = 'PARTIALLY PAID';

    return [
      b.title || 'Untitled Bill',
      b.biller_name || '',
      b.account_number || '',
      Number(b.amount) || 0,
      totalPaid,
      remaining,
      b.due_date || '',
      status,
      b.is_recurring ? `Yes (${b.frequency || 'Monthly'})` : 'No',
      b.notes || ''
    ];
  });

  return exportToCSV({
    filename,
    headers,
    rows,
    title: `${householdName} - Bills & Obligations Report`
  });
};

// 4. Savings Goals CSV
export const exportSavingsCSV = async (savingsGoals = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_savings_goals_${safeName}_${dateStr}.csv`;

  const headers = [
    'Goal Name',
    'Target Amount (PHP)',
    'Current Saved (PHP)',
    'Remaining to Save (PHP)',
    'Progress (%)',
    'Target Date',
    'Category',
    'Status'
  ];

  const rows = savingsGoals.map(g => {
    const target = Number(g.target_amount) || 0;
    const current = Number(g.current_amount) || 0;
    const remaining = Math.max(0, target - current);
    const progress = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
    const isCompleted = current >= target && target > 0;

    return [
      g.name || 'Savings Goal',
      target,
      current,
      remaining,
      `${progress}%`,
      g.target_date || 'No Deadline',
      g.category || 'General',
      isCompleted ? 'COMPLETED' : 'IN PROGRESS'
    ];
  });

  return exportToCSV({
    filename,
    headers,
    rows,
    title: `${householdName} - Savings & Ipon Goals Report`
  });
};

// 5. Complete Financial Statement Printable Generator (Opens print preview / Save as PDF)
export const printFinancialStatement = () => {
  window.print();
};

