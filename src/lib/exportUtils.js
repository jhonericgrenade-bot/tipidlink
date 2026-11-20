/**
 * TipidLink Cross-Platform Export Utilities
 * Optimized for Desktop PC, iOS (iPhone/iPad), Android Mobile,
 * Progressive Web Apps (PWA), and Mobile WebViews (Capacitor).
 * Supports both Direct PDF Generation and CSV/JSON Backups.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { matchCategoryId, doesTransactionMatchCategory } from './formatters.js';

// Format currency safely for PDF (WinAnsi compatible without corrupted symbols)
export const formatPDFMoney = (amount) => {
  const num = Number(amount) || 0;
  return `PHP ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Escape CSV cell to handle quotes, commas, and line breaks
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

// Safe alert helper across browser, mobile webview, and headless environments
const safeAlert = (message) => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
  } else if (typeof alert === 'function') {
    alert(message);
  } else {
    console.warn(`[TipidLink Alert] ${message}`);
  }
};

// Date-only values from the database must be matched as calendar dates. Using
// `new Date('YYYY-MM-DD')` can shift the date in some time zones and put a
// record in the wrong monthly export.
const isRecordInPeriod = (dateValue, month, year) => {
  if (!dateValue) return false;
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}/.test(dateValue)) {
    const [recordYear, recordMonth] = dateValue.slice(0, 10).split('-').map(Number);
    return recordMonth === Number(month) && recordYear === Number(year);
  }

  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime())
    && date.getMonth() + 1 === Number(month)
    && date.getFullYear() === Number(year);
};

/**
 * Universal PDF Action Modal / Bottom Sheet
 * Provides instant Open/View, Download, Share, and Print for all devices.
 */
const showPDFActionModal = ({ doc, pdfBlob, pdfUrl, filename, title }) => {
  if (typeof document === 'undefined') return;

  // Ensure CSS animations exist
  if (!document.getElementById('tipidlink-pdf-modal-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'tipidlink-pdf-modal-styles';
    styleEl.textContent = `
      @keyframes tipidlinkFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes tipidlinkSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Remove any pre-existing modal
  const existing = document.getElementById('tipidlink-pdf-export-modal');
  if (existing) {
    existing.remove();
  }

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent || '');
  const isInAppBrowser = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|Line|Viber|TikTok/i.test(navigator.userAgent || '');
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

  // Format file size
  const sizeKB = Math.round((pdfBlob.size || 0) / 1024);
  const sizeDisplay = sizeKB > 0 ? `${sizeKB} KB` : 'PDF Document';

  // Determine device guidance note
  let deviceTip = '';
  if (isInAppBrowser) {
    deviceTip = '⚠️ <strong>In-app browser detected:</strong> If direct download doesn\'t start, tap <strong>"Open & View PDF"</strong> or tap the three dots (⋮) to open in Chrome or Safari.';
  } else if (isIOS) {
    deviceTip = '🍏 <strong>Apple iPhone/iPad:</strong> Tap <strong>"Open & View PDF"</strong> to view in Safari, or tap <strong>"Share / Save to Files"</strong> to save to your Apple Files app.';
  } else if (isAndroid) {
    deviceTip = '🤖 <strong>Android:</strong> File saved to your <strong>"Downloads"</strong> folder. Tap <strong>"Open & View PDF"</strong> to preview it immediately on your screen.';
  } else {
    deviceTip = '💻 <strong>Desktop PC:</strong> File downloaded to your <strong>Downloads</strong> folder. Tap <strong>"Open & View PDF"</strong> to preview or print.';
  }

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'tipidlink-pdf-export-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 12px;
    background-color: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: tipidlinkFadeIn 0.2s ease-out;
  `;

  // Centered on tablets and desktop
  const checkDesktop = () => {
    if (window.innerWidth >= 640) {
      modal.style.alignItems = 'center';
    } else {
      modal.style.alignItems = 'flex-end';
    }
  };
  checkDesktop();

  modal.innerHTML = `
    <div style="
      position: relative;
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: tipidlinkSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #059669, #047857); padding: 18px 20px; color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: rgba(255,255,255,0.2); width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            📄
          </div>
          <div>
            <div style="font-weight: 800; font-size: 16px; letter-spacing: -0.02em;">PDF Statement Ready!</div>
            <div style="font-size: 11px; color: #d1fae5; font-weight: 500;">TipidLink Smart Financial Statement</div>
          </div>
        </div>
        <button id="pdf-modal-close-top" style="background: rgba(0,0,0,0.15); border: none; color: #ffffff; width: 30px; height: 30px; border-radius: 50%; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ✕
        </button>
      </div>

      <!-- Content Body -->
      <div style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
        <!-- File Name & Meta -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 700; color: #1e293b; max-width: 280px;">
            ${filename}
          </div>
          <span style="font-size: 10px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
            ${sizeDisplay}
          </span>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- 1. Open / View Fullscreen PDF (Direct Synchronous User Click - Never blocked by Safari or Chrome) -->
          <button id="pdf-btn-open" style="
            background: #059669;
            color: #ffffff;
            border: none;
            border-radius: 14px;
            padding: 13px 16px;
            font-size: 13px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25);
            transition: all 0.15s ease;
          ">
            <span>👁️</span> Open & View PDF Now
          </button>

          <!-- 2. Direct Download Button -->
          <button id="pdf-btn-download" style="
            background: #ffffff;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 11px 16px;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <span>⬇️</span> Download File to Device
          </button>

          <!-- 3. Share to Apps / Save to Files -->
          <button id="pdf-btn-share" style="
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 11px 16px;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <span>📤</span> Share (Messenger, Viber, Save to Files)
          </button>

          <!-- 4. Print -->
          <button id="pdf-btn-print" style="
            background: #ffffff;
            color: #64748b;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 9px 14px;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            cursor: pointer;
          ">
            <span>🖨️</span> Print Document
          </button>
        </div>

        <!-- Device-Specific Guidance Note -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 10px 12px; font-size: 11px; color: #166534; line-height: 1.45;">
          ${deviceTip}
        </div>

        <!-- Done / Close Button -->
        <button id="pdf-btn-close-bottom" style="
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        ">
          Done
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
  };

  // Close triggers
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  const topClose = modal.querySelector('#pdf-modal-close-top');
  const bottomClose = modal.querySelector('#pdf-btn-close-bottom');
  if (topClose) topClose.onclick = closeModal;
  if (bottomClose) bottomClose.onclick = closeModal;

  // 1. Open & View PDF button
  const openBtn = modal.querySelector('#pdf-btn-open');
  if (openBtn) {
    openBtn.onclick = () => {
      const openedWin = window.open(pdfUrl, '_blank');
      if (!openedWin) {
        window.location.href = pdfUrl;
      }
    };
  }

  // 2. Download File button
  const downloadBtn = modal.querySelector('#pdf-btn-download');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      try {
        doc.save(filename);
      } catch (saveErr) {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 1000);
      }
    };
  }

  // 3. Share Button
  const shareBtn = modal.querySelector('#pdf-btn-share');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      try {
        if (canShareFiles) {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: title,
              text: `${title} - TipidLink PDF Statement`,
            });
            return;
          }
        }
        if (navigator.share) {
          await navigator.share({
            title: title,
            text: `${title} - TipidLink PDF Statement`,
            url: window.location.href,
          });
        } else {
          safeAlert('Web Share is not supported in this browser. Please use "Open & View" or "Download".');
        }
      } catch (shareErr) {
        if (shareErr.name !== 'AbortError') {
          console.warn('Share error:', shareErr);
        }
      }
    };
  }

  // 4. Print Button
  const printBtn = modal.querySelector('#pdf-btn-print');
  if (printBtn) {
    printBtn.onclick = () => {
      const printWin = window.open(pdfUrl, '_blank');
      if (printWin) {
        setTimeout(() => {
          try {
            printWin.print();
          } catch (e) {
            console.warn('Print trigger:', e);
          }
        }, 500);
      }
    };
  }
};

/**
 * Universal PDF Saver / Downloader
 * - Android & PC: Direct file download directly to "Downloads" folder (/sdcard/Download)
 * - iOS: Direct preview in native Safari PDF viewer with 1-tap "Save to Files" / Share
 * - Universal: Displays an instant 1-tap Action Sheet modal on all devices for foolproof viewing
 */
export const saveOrOpenPDF = async (doc, filename, title = 'TipidLink PDF Report') => {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');

  try {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // 1. On Android & Desktop PC, trigger automatic background download to Downloads folder
    if (!isIOS) {
      try {
        doc.save(cleanFilename);
      } catch (saveErr) {
        console.warn('Auto doc.save fallback:', saveErr);
        try {
          const a = document.createElement('a');
          a.href = pdfUrl;
          a.download = cleanFilename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 1000);
        } catch (linkErr) {
          console.warn('Auto download anchor fallback:', linkErr);
        }
      }
    }

    // 2. Always display the Universal PDF Action Sheet Modal
    // This gives all members immediate visual feedback, 1-tap Open & View, Share, and Print
    showPDFActionModal({
      doc,
      pdfBlob,
      pdfUrl,
      filename: cleanFilename,
      title,
    });

    return { success: true, method: 'action_modal', filename: cleanFilename };
  } catch (err) {
    console.error('Universal PDF export error:', err);
    try {
      doc.save(cleanFilename);
      return { success: true, method: 'fallback_save', filename: cleanFilename };
    } catch (finalErr) {
      safeAlert(`Could not export PDF: ${err.message || finalErr.message}`);
      return { success: false, error: err };
    }
  }
};

/**
 * Reusable Header Styler for all PDF Reports
 */
const renderPDFHeader = (doc, { title, subtitle, householdName }) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Emerald Top Banner
  doc.setFillColor(5, 150, 105); // #059669
  doc.rect(0, 0, pageWidth, 26, 'F');

  // App Logo / Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TipidLink', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(209, 250, 229);
  doc.text('•  Smart Shared Family Finances', 38, 12);

  // Household Badge in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(householdName ? `Household: ${householdName}` : 'Family Household', pageWidth - 14, 12, { align: 'right' });

  // Sub-header Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 26, pageWidth, 14, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 14, 35);

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${dateStr}${subtitle ? `  |  ${subtitle}` : ''}`, pageWidth - 14, 35, { align: 'right' });
};

/**
 * Reusable Page Number Footer
 */
const renderPDFFooters = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TipidLink Family Finance Report  •  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }
};

/**
 * 1. Transactions PDF Export
 */
export const exportTransactionsPDF = async (transactions = [], householdName = 'Household') => {
  if (!transactions || transactions.length === 0) {
    safeAlert('No transactions available to export.');
    return { success: false };
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderPDFHeader(doc, {
    title: 'Family Transactions Statement',
    subtitle: `${transactions.length} Total Records`,
    householdName,
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter(t => t.type !== 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netCashflow = totalIncome - totalExpense;

  // KPI Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 58, 16, 2, 2, 'F');
  doc.roundedRect(76, 44, 58, 16, 2, 2, 'F');
  doc.roundedRect(138, 44, 58, 16, 2, 2, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INCOME', 18, 50);
  doc.text('TOTAL EXPENSES', 80, 50);
  doc.text('NET CASHFLOW', 142, 50);

  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`+ ${formatPDFMoney(totalIncome)}`, 18, 56);

  doc.setTextColor(225, 29, 72);
  doc.text(`- ${formatPDFMoney(totalExpense)}`, 80, 56);

  doc.setTextColor(netCashflow >= 0 ? 15 : 225, netCashflow >= 0 ? 23 : 29, netCashflow >= 0 ? 42 : 72);
  doc.text(formatPDFMoney(netCashflow), 142, 56);

  // Table
  const tableData = transactions.length > 0
    ? transactions.map(t => [
        t.transaction_date || '-',
        t.description || 'Transaction',
        t.category_name || (t.categories?.name) || 'General',
        (t.type || 'expense').toUpperCase(),
        (t.payment_method || 'cash').toUpperCase(),
        formatPDFMoney(t.amount || 0),
        t.user_name || (t.profiles?.full_name) || 'Member',
      ])
    : [
        ['-', 'No transactions recorded for this period / filter', '-', '-', '-', 'PHP 0.00', '-']
      ];

  autoTable(doc, {
    startY: 65,
    head: [['Date', 'Description', 'Category', 'Type', 'Method', 'Amount', 'Logged By']],
    body: tableData,
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 44 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  renderPDFFooters(doc);

  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_transactions_${safeName}_${dateStr}.pdf`;

  return saveOrOpenPDF(doc, filename, `${householdName} - Transactions Statement`);
};

/**
 * 2. Budgets PDF Export
 */
export const exportBudgetsPDF = async ({
  budgets = [],
  categories = [],
  transactions = [],
  householdName = 'Household',
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  overallMonthlyTarget = 0,
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[month - 1] || 'Current Month';

  renderPDFHeader(doc, {
    title: 'Monthly Budget & Spending Limits Report',
    subtitle: `Period: ${monthName} ${year}`,
    householdName,
  });

  const periodBudgets = budgets.filter(
    (budget) => Number(budget.month) === Number(month) && Number(budget.year) === Number(year)
  );
  const monthlyExpenses = transactions.filter(
    (transaction) => transaction.type === 'expense' && isRecordInPeriod(transaction.transaction_date, month, year)
  );

  const rows = categories
    .filter(c => c.name && c.name.toLowerCase() !== 'income')
    .map(cat => {
      const budgetObj = periodBudgets.find(b => b.category_id === cat.id || matchCategoryId(b.category_id, cat.id, categories));
      const allocated = budgetObj ? Number(budgetObj.amount) : 0;
      const spent = monthlyExpenses
        .filter(t => doesTransactionMatchCategory(t, cat.id, cat, categories))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const remaining = allocated > 0 ? allocated - spent : 0;
      const utilization = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : (spent > 0 ? '100.0' : '0.0');

      let status = 'No Limit Set';
      if (allocated > 0) {
        if (spent > allocated) status = 'OVER BUDGET';
        else if (spent >= allocated * 0.9) status = 'NEAR LIMIT';
        else status = 'ON TRACK';
      }

      return {
        name: cat.name,
        allocated,
        spent,
        remaining,
        utilization,
        status,
      };
    });

  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overallLimit = overallMonthlyTarget || totalAllocated;
  const overallRemaining = overallLimit - totalSpent;
  const overallPct = overallLimit > 0 ? ((totalSpent / overallLimit) * 100).toFixed(1) : 0;

  // KPI Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(60, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(106, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(152, 44, 44, 16, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MONTHLY TARGET', 17, 50);
  doc.text('ACTUAL SPENT', 63, 50);
  doc.text('REMAINING BUDGET', 109, 50);
  doc.text('OVERALL USAGE', 155, 50);

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFMoney(overallLimit), 17, 56);

  doc.setTextColor(225, 29, 72);
  doc.text(formatPDFMoney(totalSpent), 63, 56);

  doc.setTextColor(overallRemaining >= 0 ? 5 : 225, overallRemaining >= 0 ? 150 : 29, overallRemaining >= 0 ? 105 : 72);
  doc.text(formatPDFMoney(overallRemaining), 109, 56);

  doc.setTextColor(overallPct > 100 ? 225 : 15, overallPct > 100 ? 29 : 23, overallPct > 100 ? 72 : 42);
  doc.text(`${overallPct}% ${overallPct > 100 ? '(EXCEEDED)' : '(HEALTHY)'}`, 155, 56);

  const tableData = rows.map(r => [
    r.name,
    formatPDFMoney(r.allocated),
    formatPDFMoney(r.spent),
    formatPDFMoney(r.remaining),
    `${r.utilization}%`,
    r.status,
  ]);

  tableData.push([
    'OVERALL TOTAL / LIMIT',
    formatPDFMoney(overallLimit),
    formatPDFMoney(totalSpent),
    formatPDFMoney(overallRemaining),
    `${overallPct}%`,
    totalSpent > overallLimit && overallLimit > 0 ? 'OVER BUDGET' : 'ON TRACK',
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['Category', 'Monthly Limit', 'Actual Spent', 'Remaining', 'Usage %', 'Status']],
    body: tableData,
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [4, 120, 87];
      }
      if (data.column.index === 5 && data.cell.raw === 'OVER BUDGET') {
        data.cell.styles.textColor = [225, 29, 72];
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  renderPDFFooters(doc);

  const dateStr = `${year}_${String(month).padStart(2, '0')}`;
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_budget_report_${safeName}_${dateStr}.pdf`;

  return saveOrOpenPDF(doc, filename, `${householdName} - Budget Report`);
};

/**
 * 3. Bills PDF Export
 */
export const exportBillsPDF = async (bills = [], householdName = 'Household') => {
  if (!bills || bills.length === 0) {
    safeAlert('No bills available to export.');
    return { success: false };
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderPDFHeader(doc, {
    title: 'Household Bills & Obligations Statement',
    subtitle: `${bills.length} Total Bills Tracked`,
    householdName,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOverdue = 0;

  const tableData = bills.map(b => {
    const amount = Number(b.amount) || 0;
    const paid = (b.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const balance = Math.max(0, amount - paid);
    const dueDate = new Date(b.due_date);
    dueDate.setHours(0, 0, 0, 0);

    totalBilled += amount;
    totalPaid += paid;

    let status = 'UNPAID';
    if (balance <= 0) {
      status = 'PAID';
    } else if (dueDate < today) {
      status = 'OVERDUE';
      totalOverdue += balance;
    } else if (paid > 0) {
      status = 'PARTIAL';
    }

    return [
      b.title || 'Bill',
      b.biller_name || 'Biller',
      b.account_number || '-',
      formatPDFMoney(amount),
      formatPDFMoney(paid),
      formatPDFMoney(balance),
      b.due_date || '-',
      status,
    ];
  });

  // KPI Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 58, 16, 2, 2, 'F');
  doc.roundedRect(76, 44, 58, 16, 2, 2, 'F');
  doc.roundedRect(138, 44, 58, 16, 2, 2, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL BILLED', 18, 50);
  doc.text('TOTAL PAID RECORDED', 80, 50);
  doc.text('OVERDUE BALANCE', 142, 50);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFMoney(totalBilled), 18, 56);

  doc.setTextColor(5, 150, 105);
  doc.text(formatPDFMoney(totalPaid), 80, 56);

  doc.setTextColor(totalOverdue > 0 ? 225 : 5, totalOverdue > 0 ? 29 : 150, totalOverdue > 0 ? 72 : 105);
  doc.text(formatPDFMoney(totalOverdue), 142, 56);

  autoTable(doc, {
    startY: 65,
    head: [['Bill Name', 'Biller / Provider', 'Account No.', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status']],
    body: tableData.length > 0 ? tableData : [['No bills registered in this household', '-', '-', 'PHP 0.00', 'PHP 0.00', 'PHP 0.00', '-', 'NO BILLS']],
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7) {
        if (data.cell.raw === 'PAID') data.cell.styles.textColor = [5, 150, 105];
        if (data.cell.raw === 'OVERDUE') data.cell.styles.textColor = [225, 29, 72];
        if (data.cell.raw === 'UNPAID') data.cell.styles.textColor = [217, 119, 6];
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  renderPDFFooters(doc);

  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_bills_report_${safeName}_${dateStr}.pdf`;

  return saveOrOpenPDF(doc, filename, `${householdName} - Bills Report`);
};

/**
 * 4. Savings Goals PDF Export
 */
export const exportSavingsPDF = async (savingsGoals = [], householdName = 'Household') => {
  if (!savingsGoals || savingsGoals.length === 0) {
    safeAlert('No savings goals available to export.');
    return { success: false };
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderPDFHeader(doc, {
    title: 'Family Savings & Milestone Goals',
    subtitle: `${savingsGoals.length} Savings Targets`,
    householdName,
  });

  const totalTarget = savingsGoals.reduce((s, g) => s + (Number(g.target_amount) || 0), 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + (Number(g.current_amount) || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallProgress = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;

  // KPI Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(60, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(106, 44, 42, 16, 2, 2, 'F');
  doc.roundedRect(152, 44, 44, 16, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TARGET', 17, 50);
  doc.text('TOTAL ACCUMULATED', 63, 50);
  doc.text('REMAINING TO SAVE', 109, 50);
  doc.text('OVERALL PROGRESS', 155, 50);

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFMoney(totalTarget), 17, 56);

  doc.setTextColor(5, 150, 105);
  doc.text(formatPDFMoney(totalSaved), 63, 56);

  doc.setTextColor(100, 116, 139);
  doc.text(formatPDFMoney(totalRemaining), 109, 56);

  doc.setTextColor(5, 150, 105);
  doc.text(`${overallProgress}% COMPLETED`, 155, 56);

  const tableData = savingsGoals.map(g => {
    const target = Number(g.target_amount) || 0;
    const current = Number(g.current_amount) || 0;
    const remaining = Math.max(0, target - current);
    const progress = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
    const isCompleted = current >= target && target > 0;

    return [
      g.title || g.name || 'Savings Goal',
      g.category || 'General',
      formatPDFMoney(target),
      formatPDFMoney(current),
      formatPDFMoney(remaining),
      `${progress}%`,
      g.deadline || g.target_date || 'No Deadline',
      isCompleted ? 'COMPLETED' : 'IN PROGRESS',
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [['Goal Name', 'Category', 'Target', 'Current Saved', 'Remaining', 'Progress', 'Target Date', 'Status']],
    body: tableData.length > 0 ? tableData : [['No savings goals created yet', '-', 'PHP 0.00', 'PHP 0.00', 'PHP 0.00', '0%', '-', 'EMPTY']],
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7) {
        if (data.cell.raw === 'COMPLETED') data.cell.styles.textColor = [5, 150, 105];
        else data.cell.styles.textColor = [79, 70, 229];
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  renderPDFFooters(doc);

  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_savings_report_${safeName}_${dateStr}.pdf`;

  return saveOrOpenPDF(doc, filename, `${householdName} - Savings Goals Report`);
};

/**
 * 5. Complete All-in-One Family Financial Statement PDF
 */
export const exportFullFinancialStatementPDF = async ({
  household = {},
  calculations = {},
  transactions = [],
  budgets = [],
  bills = [],
  savingsGoals = [],
  categories = [],
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const householdName = household?.name || 'Household';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[month - 1] || 'Current Month';

  renderPDFHeader(doc, {
    title: 'Complete Household Financial Statement',
    subtitle: `Executive Financial Audit • ${monthName} ${year}`,
    householdName,
  });

  // Section 1: Executive KPI Metrics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 14, 46);

  const totalIncome = calculations.totalIncome || 0;
  const totalExpenses = calculations.totalExpenses || 0;
  const netSavings = calculations.netSavings || 0;
  const budgetTarget = calculations.activeBudgetTarget || 0;
  const remainingBudget = calculations.remainingBudget || 0;
  const overdueTotal = calculations.totalOverdueAmount || 0;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 50, 58, 16, 2, 2, 'F');
  doc.roundedRect(76, 50, 58, 16, 2, 2, 'F');
  doc.roundedRect(138, 50, 58, 16, 2, 2, 'F');

  doc.roundedRect(14, 69, 58, 16, 2, 2, 'F');
  doc.roundedRect(76, 69, 58, 16, 2, 2, 'F');
  doc.roundedRect(138, 69, 58, 16, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MONTHLY INCOME', 18, 56);
  doc.text('TOTAL MONTHLY EXPENSES', 80, 56);
  doc.text('NET SAVINGS / SURPLUS', 142, 56);

  doc.text('MONTHLY BUDGET TARGET', 18, 75);
  doc.text('REMAINING BUDGET POOL', 80, 75);
  doc.text('OVERDUE BILLS BALANCE', 142, 75);

  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text(`+ ${formatPDFMoney(totalIncome)}`, 18, 62);

  doc.setTextColor(225, 29, 72);
  doc.text(`- ${formatPDFMoney(totalExpenses)}`, 80, 62);

  doc.setTextColor(netSavings >= 0 ? 5 : 225, netSavings >= 0 ? 150 : 29, netSavings >= 0 ? 105 : 72);
  doc.text(formatPDFMoney(netSavings), 142, 62);

  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFMoney(budgetTarget), 18, 81);

  doc.setTextColor(remainingBudget >= 0 ? 5 : 225, remainingBudget >= 0 ? 150 : 29, remainingBudget >= 0 ? 105 : 72);
  doc.text(formatPDFMoney(remainingBudget), 80, 81);

  doc.setTextColor(overdueTotal > 0 ? 225 : 5, overdueTotal > 0 ? 29 : 150, overdueTotal > 0 ? 72 : 105);
  doc.text(formatPDFMoney(overdueTotal), 142, 81);

  // Section 2: Budget Breakdown Table
  let currentY = 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CATEGORY BUDGET LIMITS & UTILIZATION', 14, currentY);

  const periodBudgets = budgets.filter(
    (budget) => Number(budget.month) === Number(month) && Number(budget.year) === Number(year)
  );
  const periodTransactions = transactions.filter(
    (transaction) => isRecordInPeriod(transaction.transaction_date, month, year)
  );
  const budgetRows = categories
    .filter(c => c.name && c.name.toLowerCase() !== 'income')
    .slice(0, 10)
    .map(cat => {
      const bObj = periodBudgets.find(b => b.category_id === cat.id || matchCategoryId(b.category_id, cat.id, categories));
      const allocated = bObj ? Number(bObj.amount) : 0;
      const spent = periodTransactions
        .filter(t => t.type === 'expense' && doesTransactionMatchCategory(t, cat.id, cat, categories))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const remaining = allocated > 0 ? allocated - spent : 0;
      const pct = allocated > 0 ? ((spent / allocated) * 100).toFixed(0) : 0;
      return [cat.name, formatPDFMoney(allocated), formatPDFMoney(spent), formatPDFMoney(remaining), `${pct}%`];
    });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Category', 'Budget Limit', 'Actual Spent', 'Remaining', 'Usage %']],
    body: budgetRows,
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 26, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Section 3: Bills & Obligations
  currentY = doc.lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. HOUSEHOLD BILLS & PAYMENT OBLIGATIONS', 14, currentY);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const billRows = bills.slice(0, 8).map(b => {
    const amount = Number(b.amount) || 0;
    const paid = (b.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const balance = Math.max(0, amount - paid);
    const dueDate = b.due_date ? new Date(`${String(b.due_date).slice(0, 10)}T00:00:00`) : null;
    const isOverdue = balance > 0 && dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < today;
    return [
      b.title || 'Bill',
      b.biller_name || 'Biller',
      formatPDFMoney(amount),
      formatPDFMoney(paid),
      formatPDFMoney(balance),
      b.due_date || '-',
      balance <= 0 ? 'PAID' : (isOverdue ? 'OVERDUE' : (paid > 0 ? 'PARTIAL' : 'UNPAID')),
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Bill Name', 'Provider', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status']],
    body: billRows,
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Section 4: Savings Goals
  currentY = doc.lastAutoTable.finalY + 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. FAMILY SAVINGS & MILESTONE TARGETS', 14, currentY);

  const savingsRows = savingsGoals.slice(0, 6).map(g => {
    const target = Number(g.target_amount) || 0;
    const current = Number(g.current_amount) || 0;
    const pct = target > 0 ? ((current / target) * 100).toFixed(0) : 0;
    return [
      g.name || 'Savings Goal',
      formatPDFMoney(target),
      formatPDFMoney(current),
      formatPDFMoney(Math.max(0, target - current)),
      `${pct}%`,
      g.deadline || g.target_date || 'Ongoing',
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Goal Title', 'Target Amount', 'Current Saved', 'Remaining', 'Progress', 'Target Date']],
    body: savingsRows,
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 21, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  renderPDFFooters(doc);

  const dateStr = `${year}_${String(month).padStart(2, '0')}`;
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_full_financial_statement_${safeName}_${dateStr}.pdf`;

  return saveOrOpenPDF(doc, filename, `${householdName} - Complete Financial Statement`);
};

/**
 * CSV Exporters (Retained for Excel Users)
 */
export const exportToCSV = async ({ filename, headers, rows, title = 'TipidLink Export' }) => {
  if (!rows || rows.length === 0) {
    safeAlert('No records available to export.');
    return { success: false, reason: 'empty' };
  }

  const csvBody = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');

  const csvContent = '\uFEFF' + csvBody;
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

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
    console.warn('Direct CSV download failed:', downloadErr);
    return { success: false, error: downloadErr };
  }
};

export const exportToJSON = async ({ filename, data, title = 'TipidLink Backup' }) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

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
    safeAlert(`Could not download backup file.`);
    return { success: false };
  }
};

export const exportTransactionsCSV = async (transactions = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_transactions_${safeName}_${dateStr}.csv`;

  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount (PHP)', 'Logged By', 'Payment Method', 'Notes'];
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

  return exportToCSV({ filename, headers, rows, title: `${householdName} - Transactions Report` });
};

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

  const headers = ['Category', 'Allocated Budget (PHP)', 'Actual Spent (PHP)', 'Remaining (PHP)', 'Utilization (%)', 'Status'];
  const periodBudgets = budgets.filter(
    (budget) => Number(budget.month) === Number(month) && Number(budget.year) === Number(year)
  );
  const monthlyExpenses = transactions.filter(
    (transaction) => transaction.type === 'expense' && isRecordInPeriod(transaction.transaction_date, month, year)
  );

  const rows = categories
    .filter(c => c.name && c.name.toLowerCase() !== 'income')
    .map(cat => {
      const budgetObj = periodBudgets.find(b => b.category_id === cat.id || matchCategoryId(b.category_id, cat.id, categories));
      const allocated = budgetObj ? Number(budgetObj.amount) : 0;
      const spent = monthlyExpenses
        .filter(t => doesTransactionMatchCategory(t, cat.id, cat, categories))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const remaining = allocated > 0 ? allocated - spent : 0;
      const utilization = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : (spent > 0 ? '100.0' : '0.0');
      let status = 'No Limit Set';
      if (allocated > 0) {
        if (spent > allocated) status = 'OVER BUDGET';
        else if (spent >= allocated * 0.9) status = 'NEAR LIMIT';
        else status = 'ON TRACK';
      }
      return [cat.name, allocated, spent, remaining, `${utilization}%`, status];
    });

  return exportToCSV({ filename, headers, rows, title: `${householdName} - Budget Report` });
};

export const exportBillsCSV = async (bills = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_bills_${safeName}_${dateStr}.csv`;

  const headers = ['Bill Name', 'Biller / Provider', 'Account / Reference No.', 'Total Amount (PHP)', 'Total Paid (PHP)', 'Remaining Balance (PHP)', 'Due Date', 'Payment Status', 'Recurring', 'Notes'];
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

  return exportToCSV({ filename, headers, rows, title: `${householdName} - Bills Report` });
};

export const exportSavingsCSV = async (savingsGoals = [], householdName = 'Household') => {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `tipidlink_savings_goals_${safeName}_${dateStr}.csv`;

  const headers = ['Goal Name', 'Target Amount (PHP)', 'Current Saved (PHP)', 'Remaining to Save (PHP)', 'Progress (%)', 'Target Date', 'Category', 'Status'];
  const rows = savingsGoals.map(g => {
    const target = Number(g.target_amount) || 0;
    const current = Number(g.current_amount) || 0;
    const remaining = Math.max(0, target - current);
    const progress = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
    const isCompleted = current >= target && target > 0;

    return [
      g.title || g.name || 'Savings Goal',
      target,
      current,
      remaining,
      `${progress}%`,
      g.deadline || g.target_date || 'No Deadline',
      g.category || 'General',
      isCompleted ? 'COMPLETED' : 'IN PROGRESS'
    ];
  });

  return exportToCSV({ filename, headers, rows, title: `${householdName} - Savings Goals Report` });
};

export const printFinancialStatement = () => {
  window.print();
};
