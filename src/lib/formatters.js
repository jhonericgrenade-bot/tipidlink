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

export const MOCK_TO_SUPABASE_CATEGORY_MAP = {
  'cat-1': '74401ce1-ae2f-4be2-a7e8-420437d2969a', // Groceries & Food (Palengke / Supermarket)
  'cat-2': '5b18d8f3-037c-45ee-880a-1e92842ec867', // Electricity (Meralco / Coop)
  'cat-3': '42edf785-decf-4d1e-a451-6d2ca1cb2547', // Water Bill (Maynilad / Manila Water)
  'cat-4': '4419c6fe-3897-4f13-b77c-c6a1c97bcc54', // Internet & Mobile Load (PLDT / Converge / Globe)
  'cat-5': 'd516e37e-001d-45ce-b6d2-be9036b6cef6', // Transportation & Gas (Jeep / Tricycle / MRT)
  'cat-6': 'a3be1471-efec-4deb-a371-c39d0f7349dd', // Education & School Baon
  'cat-7': '87cff36c-1103-4f77-a2a3-4c7d766e40d5', // Dining Out & Delivery (Jollibee / Grab)
  'cat-8': '4fc83ede-a6b9-45ef-bc06-352218b4c8d7', // Health, Medicine & Emergencies
  'cat-9': '83219194-afe1-4910-b6c9-8a1aad9ccfa2', // Salary / Regular Employment
  'cat-10': '254a0f56-4b21-4916-88bd-b0bcba714d03', // Freelance & Side Hustles (Raket)
  'cat-11': '31c82139-a899-415f-8d94-c79a33e72696', // Remittance / Padala (OFW)
  'cat-12': '25de8199-3408-4143-9de9-1a84977b6bb9', // Small Business / Sari-Sari Store
};

/**
 * Robust Category ID matching across mock categories and Supabase UUIDs
 */
export const matchCategoryId = (id1, id2, categoriesList = []) => {
  if (!id1 || !id2) return false;
  if (id1 === id2) return true;

  // Direct mapping check
  const mapped1 = MOCK_TO_SUPABASE_CATEGORY_MAP[id1] || id1;
  const mapped2 = MOCK_TO_SUPABASE_CATEGORY_MAP[id2] || id2;
  if (mapped1 === mapped2) return true;

  // Reverse mapping check
  for (const [mockId, uuid] of Object.entries(MOCK_TO_SUPABASE_CATEGORY_MAP)) {
    if ((id1 === mockId && id2 === uuid) || (id1 === uuid && id2 === mockId)) {
      return true;
    }
  }

  // Name equality from categories list if available
  if (Array.isArray(categoriesList) && categoriesList.length > 0) {
    const c1 = categoriesList.find(c => c.id === id1);
    const c2 = categoriesList.find(c => c.id === id2);
    if (c1?.name && c2?.name && c1.name.toLowerCase().trim() === c2.name.toLowerCase().trim()) {
      return true;
    }
  }

  return false;
};

/**
 * Auto-detect an appropriate category for a bill based on keywords in title and biller name
 */
export const autoDetectBillCategory = (title = '', billerName = '', categoriesList = []) => {
  const combined = `${title || ''} ${billerName || ''}`.toLowerCase();
  if (!Array.isArray(categoriesList) || categoriesList.length === 0) return null;

  // 1. Electricity / Power
  if (/meralco|electric|kuryente|power|coop/i.test(combined)) {
    const found = categoriesList.find(c => /electric|meralco|kuryente/i.test(c.name));
    if (found) return found;
  }

  // 2. Water
  if (/maynilad|manila water|water|tubig/i.test(combined)) {
    const found = categoriesList.find(c => /water|maynilad|tubig/i.test(c.name));
    if (found) return found;
  }

  // 3. Internet / Telco / Cable
  if (/converge|pldt|globe|smart|internet|wifi|fiber|cable|sky/i.test(combined)) {
    const found = categoriesList.find(c => /internet|wifi|telecom|mobile/i.test(c.name));
    if (found) return found;
  }

  // 4. Rent / Housing
  if (/rent|apartment|condo|housing|upa/i.test(combined)) {
    const found = categoriesList.find(c => /rent|housing|apartment/i.test(c.name));
    if (found) return found;
  }

  // 5. Tuition / School
  if (/tuition|school|aral|allowance|college|university/i.test(combined)) {
    const found = categoriesList.find(c => /school|education|tuition/i.test(c.name));
    if (found) return found;
  }

  // 6. Generic Utilities or first expense category
  const utilityCat = categoriesList.find(c => c.type === 'expense' && /utilities|bill/i.test(c.name));
  if (utilityCat) return utilityCat;

  return categoriesList.find(c => c.type === 'expense') || null;
};

/**
 * Multi-layer transaction to category budget matcher
 */
export const doesTransactionMatchCategory = (tx, targetCategoryId, targetCategoryObj = null, categoriesList = []) => {
  if (!tx || tx.type !== 'expense') return false;

  const targetId = targetCategoryId || targetCategoryObj?.id;
  const targetCat = targetCategoryObj || (Array.isArray(categoriesList) ? categoriesList.find(c => c.id === targetId) : null);

  // 1. Direct ID or mapped ID match
  if (tx.category_id && targetId && matchCategoryId(tx.category_id, targetId, categoriesList)) {
    return true;
  }

  // 2. Category Name match (normalized)
  if (targetCat?.name && tx.category_name) {
    const n1 = targetCat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = tx.category_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) {
      return true;
    }
  }

  // 3. Smart bill payment description keywords
  if (targetCat?.name && tx.description) {
    const descLower = tx.description.toLowerCase();
    const catLower = targetCat.name.toLowerCase();

    if (/electric|meralco|kuryente/i.test(catLower) && /electric|meralco|kuryente/i.test(descLower)) return true;
    if (/water|maynilad|tubig/i.test(catLower) && /water|maynilad|manila water|tubig/i.test(descLower)) return true;
    if (/internet|wifi|converge|pldt/i.test(catLower) && /internet|converge|pldt|globe|wifi/i.test(descLower)) return true;
    if (/tuition|school|education/i.test(catLower) && /tuition|school|allowance/i.test(descLower)) return true;
    if (/rent|housing/i.test(catLower) && /rent|condo|apartment|house/i.test(descLower)) return true;
  }

  return false;
};
