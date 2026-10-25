// Utility helpers for formatting currency (PHP), dates, and percentages

/**
 * Parses a date or date string into a local Date object without UTC drift
 * @param {string|Date} dateInput
 * @returns {Date|null}
 */
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const parts = dateInput.split('T')[0].split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateInput);
};

/**
 * Formats a number as Philippine Peso (PHP / ₱)
 * @param {number|string} amount
 * @param {boolean} showDecimals
 * @returns {string} e.g. "₱12,500.00"
 */
export const formatPHP = (amount, showDecimals = true) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
};

/**
 * Format date in a clean readable form (e.g. "Oct 26, 2026")
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = parseLocalDate(dateStr);
    if (!d || isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
};

/**
 * Calculate days remaining until a due date
 * @param {string|Date} dueDateStr
 * @returns {{ daysRemaining: number, label: string, isOverdue: boolean, isToday: boolean }}
 */
export const getDueDateStatus = (dueDateStr) => {
  if (!dueDateStr) return { daysRemaining: 0, label: 'No date', isOverdue: false, isToday: false };
  const target = parseLocalDate(dueDateStr);
  if (!target || isNaN(target.getTime())) return { daysRemaining: 0, label: 'Invalid date', isOverdue: false, isToday: false };
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const absDays = Math.abs(daysRemaining);
    return {
      daysRemaining,
      label: `Overdue by ${absDays} day${absDays > 1 ? 's' : ''}`,
      isOverdue: true,
      isToday: false,
    };
  }

  if (daysRemaining === 0) {
    return {
      daysRemaining: 0,
      label: 'Due today!',
      isOverdue: false,
      isToday: true,
    };
  }

  return {
    daysRemaining,
    label: `Due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
    isOverdue: false,
    isToday: false,
  };
};

/**
 * Format percentage with 1 decimal place
 * @param {number} value
 * @returns {string} e.g. "75.4%"
 */
export const formatPercent = (value) => {
  const num = Number(value) || 0;
  return `${num.toFixed(1)}%`;
};
