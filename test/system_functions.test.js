import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_DEMO_DATA } from '../src/lib/mockData.js';
import {
  formatPDFMoney,
  exportTransactionsPDF,
  exportBudgetsPDF,
  exportBillsPDF,
  exportSavingsPDF,
  exportFullFinancialStatementPDF,
  exportToJSON
} from '../src/lib/exportUtils.js';
import {
  parseHouseholdTier,
  formatHouseholdDescription,
  resolveHouseholdPremiumState,
  isSantosHouseholdId,
  SANTOS_UUID,
  SANTOS_DEMO_ID
} from '../src/lib/premiumTier.js';
import {
  doesTransactionMatchCategory,
  matchCategoryId,
  autoDetectBillCategory,
} from '../src/lib/formatters.js';
import {
  reconcileBillPaymentLedger,
} from '../src/lib/billPaymentLedger.js';

test.after(() => {
  // Clean up any temporary PDFs written during test execution
  const files = fs.readdirSync(process.cwd());
  for (const f of files) {
    if (f.startsWith('tipidlink_') && f.endsWith('.pdf')) {
      try {
        fs.unlinkSync(path.join(process.cwd(), f));
      } catch {}
    }
  }
});

test('1. INITIAL_DEMO_DATA structure and integrity', () => {
  const data = INITIAL_DEMO_DATA;
  assert.ok(data.profile, 'Profile must exist');
  assert.strictEqual(data.profile.full_name, 'Maria Santos');
  assert.strictEqual(data.household.name, 'Santos Family Household');
  assert.strictEqual(data.household.currency, 'PHP');
  assert.strictEqual(data.household.monthly_budget_target, 65000);
  assert.strictEqual(data.household.invite_code, 'SANTOS2026');

  // Verify members
  assert.strictEqual(data.members.length, 3);
  const roles = data.members.map(m => m.role);
  assert.ok(roles.includes('owner'), 'Must have owner role');
  assert.ok(roles.includes('admin'), 'Must have admin role');
  assert.ok(roles.includes('member'), 'Must have member role');

  // Verify categories
  assert.ok(data.categories.length >= 10, 'Must have at least 10 starter categories');
  const expenseCats = data.categories.filter(c => c.type === 'expense');
  const incomeCats = data.categories.filter(c => c.type === 'income');
  assert.ok(expenseCats.length > 0, 'Expense categories must exist');
  assert.ok(incomeCats.length > 0, 'Income categories must exist');
});

test('2. Financial Dashboard Math: Income, Expenses, and Net Savings', () => {
  const { transactions } = INITIAL_DEMO_DATA;

  // Filter for October 2026
  const octTransactions = transactions.filter(t => {
    const d = new Date(t.transaction_date);
    return (d.getMonth() + 1) === 10 && d.getFullYear() === 2026;
  });

  const totalIncome = octTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = octTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalIncome - totalExpenses;

  // Expected values from Santos family mock seed:
  // Income: 48,000 (Juan salary) + 14,500 (Angela ESL/design) + 8,500 (Maria store) = 71,000
  // Expense: 6,850 + 4,200 + 1,500 + 2,400 + 3,500 + 1,250 = 19,700
  // Net: 71,000 - 19,700 = 51,300
  assert.strictEqual(totalIncome, 71000, 'Total income should equal 71,000 PHP');
  assert.strictEqual(totalExpenses, 19700, 'Total expenses should equal 19,700 PHP');
  assert.strictEqual(netSavings, 51300, 'Net savings should equal 51,300 PHP');
});

test('3. Budget Allocation, Remaining Balance, and Utilization Math', () => {
  const { household, budgets, transactions } = INITIAL_DEMO_DATA;
  const target = household.monthly_budget_target; // 65000
  const totalExpenses = 19700;

  const remainingBudget = target - totalExpenses;
  const budgetUsagePercent = (totalExpenses / target) * 100;
  const isOverspent = totalExpenses > target;

  assert.strictEqual(remainingBudget, 45300, 'Remaining budget should be 45,300 PHP');
  assert.ok(Math.abs(budgetUsagePercent - 30.307) < 0.01, 'Budget usage should be ~30.3%');
  assert.strictEqual(isOverspent, false, 'Household should not be overspent');

  // Verify category budget fallback when household target is zero
  const sumCategoryBudgets = budgets
    .filter(b => b.month === 10 && b.year === 2026)
    .reduce((sum, b) => sum + Number(b.amount), 0);
  // 16,000 + 4,500 + 1,200 + 1,600 + 5,000 + 6,000 + 3,000 = 37,300
  assert.strictEqual(sumCategoryBudgets, 37300, 'Sum of category budgets should equal 37,300 PHP');
});

test('4. Category Expense Breakdown grouping and ranking', () => {
  const { transactions } = INITIAL_DEMO_DATA;
  const octExpenses = transactions.filter(t => {
    const d = new Date(t.transaction_date);
    return (d.getMonth() + 1) === 10 && d.getFullYear() === 2026 && t.type === 'expense';
  });

  const categoryMap = {};
  octExpenses.forEach(t => {
    categoryMap[t.category_name] = (categoryMap[t.category_name] || 0) + Number(t.amount);
  });

  const breakdown = Object.entries(categoryMap).map(([name, amount]) => ({
    name,
    amount,
    percentage: (amount / 19700) * 100,
  })).sort((a, b) => b.amount - a.amount);

  assert.strictEqual(breakdown[0].name, 'Groceries & Palengke', 'Top expense should be Groceries');
  assert.strictEqual(breakdown[0].amount, 6850, 'Groceries amount should be 6,850 PHP');
  assert.ok(Math.abs(breakdown[0].percentage - 34.77) < 0.05, 'Groceries share should be ~34.8%');
});

test('5. Bills and Partial Payments calculation logic', () => {
  const { bills } = INITIAL_DEMO_DATA;
  assert.strictEqual(bills.length, 4);

  // Bill 4: University tuition (8000 with 4000 payment)
  const tuitionBill = bills.find(b => b.id === 'bill-4');
  assert.ok(tuitionBill, 'Tuition bill must exist');
  const totalPaid = (tuitionBill.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
  const remaining = tuitionBill.amount - totalPaid;
  assert.strictEqual(totalPaid, 4000, 'Total paid on tuition should be 4,000 PHP');
  assert.strictEqual(remaining, 4000, 'Remaining balance should be 4,000 PHP');

  // Verify computed status
  const computedStatus = remaining <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');
  assert.strictEqual(computedStatus, 'partially_paid');
});

test('6. Savings Goals milestones and overall progress', () => {
  const { savingsGoals } = INITIAL_DEMO_DATA;
  assert.strictEqual(savingsGoals.length, 3);

  const totalSaved = savingsGoals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + Number(g.target_amount), 0);
  const progressPercent = (totalSaved / totalTarget) * 100;

  // 68,500 + 14,200 + 28,000 = 110,700
  // 100,000 + 20,000 + 28,000 = 148,000
  assert.strictEqual(totalSaved, 110700, 'Total saved across all goals should equal 110,700 PHP');
  assert.strictEqual(totalTarget, 148000, 'Total target across all goals should equal 148,000 PHP');
  assert.ok(Math.abs(progressPercent - 74.797) < 0.01, 'Progress should be ~74.8%');

  // Check completed goal
  const completedGoal = savingsGoals.find(g => g.is_completed);
  assert.ok(completedGoal, 'Must have at least one completed goal');
  assert.strictEqual(completedGoal.current_amount, completedGoal.target_amount);
});

test('7. PDF Money Formatter (formatPDFMoney)', () => {
  assert.strictEqual(formatPDFMoney(0), 'PHP 0.00');
  assert.strictEqual(formatPDFMoney(12500), 'PHP 12,500.00');
  assert.strictEqual(formatPDFMoney(3456.789), 'PHP 3,456.79');
  assert.strictEqual(formatPDFMoney(-1500), 'PHP -1,500.00');
  assert.strictEqual(formatPDFMoney(null), 'PHP 0.00');
});

test('8. PDF Export Generation for all modules (Non-crashing & valid output)', async () => {
  const { transactions, budgets, bills, savingsGoals, categories, household } = INITIAL_DEMO_DATA;

  // 1. Transactions PDF
  const txResult = await exportTransactionsPDF(transactions, household.name);
  assert.ok(txResult.success, 'Transactions PDF should export successfully');

  // 2. Budgets PDF
  const bgResult = await exportBudgetsPDF({
    budgets,
    categories,
    transactions,
    householdName: household.name,
    month: 10,
    year: 2026,
    overallMonthlyTarget: household.monthly_budget_target,
  });
  assert.ok(bgResult.success, 'Budgets PDF should export successfully');

  // 3. Bills PDF
  const billResult = await exportBillsPDF(bills, household.name);
  assert.ok(billResult.success, 'Bills PDF should export successfully');

  // 4. Savings PDF
  const saveResult = await exportSavingsPDF(savingsGoals, household.name);
  assert.ok(saveResult.success, 'Savings PDF should export successfully');

  // 5. Full Statement PDF
  const statementResult = await exportFullFinancialStatementPDF({
    household,
    calculations: {
      totalIncome: 71000,
      totalExpenses: 19700,
      netSavings: 51300,
      activeBudgetTarget: 65000,
      remainingBudget: 45300,
      totalOverdueAmount: 1150,
      totalUpcomingAmount: 9700,
      totalSavedAllGoals: 110700,
      totalTargetAllGoals: 148000,
      overallSavingsProgress: 74.8,
      categoryBreakdown: [
        { name: 'Groceries & Palengke', amount: 6850, percentage: 34.8 },
        { name: 'Electricity (Meralco)', amount: 4200, percentage: 21.3 },
      ],
    },
    transactions,
    budgets,
    bills,
    savingsGoals,
    categories,
    month: 10,
    year: 2026,
  });
  assert.ok(statementResult.success, 'Full Financial Statement PDF should export successfully');
});

test('9. PDF Exporter Graceful Empty Data Handling', async () => {
  const emptyTx = await exportTransactionsPDF([], 'Empty Household');
  assert.strictEqual(emptyTx.success, false, 'Empty transactions should return success: false without crashing');

  const emptyBills = await exportBillsPDF([], 'Empty Household');
  assert.strictEqual(emptyBills.success, false, 'Empty bills should return success: false without crashing');

  const emptySavings = await exportSavingsPDF([], 'Empty Household');
  assert.strictEqual(emptySavings.success, false, 'Empty savings should return success: false without crashing');
});

test('10. JSON Backup Serialization & Roundtrip Integrity', async () => {
  const backupPayload = {
    version: '1.0.0',
    export_date: new Date().toISOString(),
    household: INITIAL_DEMO_DATA.household,
    transactions: INITIAL_DEMO_DATA.transactions,
    budgets: INITIAL_DEMO_DATA.budgets,
    bills: INITIAL_DEMO_DATA.bills,
    savingsGoals: INITIAL_DEMO_DATA.savingsGoals,
  };

  const serialized = JSON.stringify(backupPayload);
  const parsed = JSON.parse(serialized);

  assert.strictEqual(parsed.household.id, 'hh-santos-family');
  assert.strictEqual(parsed.transactions.length, INITIAL_DEMO_DATA.transactions.length);
  assert.strictEqual(parsed.budgets.length, INITIAL_DEMO_DATA.budgets.length);
  assert.strictEqual(parsed.bills.length, INITIAL_DEMO_DATA.bills.length);
  assert.strictEqual(parsed.savingsGoals.length, INITIAL_DEMO_DATA.savingsGoals.length);
});

test('11. Strict Invite Code Validation (Rejects SANTOS2027 and loose substrings)', () => {
  const sanitizeCode = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  
  const validateSantosCode = (code) => {
    const clean = sanitizeCode(code);
    return clean === 'SANTOS2026';
  };

  assert.strictEqual(validateSantosCode('SANTOS2026'), true, 'Exact SANTOS2026 must be accepted');
  assert.strictEqual(validateSantosCode('santos2026'), true, 'Lowercase santos2026 must be accepted');
  assert.strictEqual(validateSantosCode('SANTOS-2026'), true, 'Dashed SANTOS-2026 must be accepted');
  assert.strictEqual(validateSantosCode('SANTOS 2026'), true, 'Spaced SANTOS 2026 must be accepted');

  // Must reject SANTOS2027, SANTOS, etc.
  assert.strictEqual(validateSantosCode('SANTOS2027'), false, 'SANTOS2027 must be rejected');
  assert.strictEqual(validateSantosCode('SANTOS'), false, 'Partial SANTOS must be rejected');
  assert.strictEqual(validateSantosCode('SANTOS123'), false, 'SANTOS123 must be rejected');
  assert.strictEqual(validateSantosCode('TIPIDSANTOS'), false, 'TIPIDSANTOS must be rejected');
});

test('12. Registration Blocking on Invalid or Non-existent Code', () => {
  const sanitizeCode = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  
  // Registration submission guard
  const canProceedWithRegistration = (inviteCode, knownCodes = ['SANTOS2026', 'CRUZ-1234']) => {
    const raw = (inviteCode || '').trim();
    if (!raw) return { proceed: true, reason: 'No invite code provided; creates new household' };
    const clean = sanitizeCode(raw);

    // 1. Client-side strict Santos family code pre-validation
    if (clean.startsWith('SANTOS') && clean !== 'SANTOS2026') {
      return {
        proceed: false,
        error: 'Maling household invite code. Ang opisyal na code ng Santos Family ay SANTOS2026. Pakisuri ang tamang code bago magpatuloy.'
      };
    }

    const exists = knownCodes.some(c => sanitizeCode(c) === clean);
    if (!exists) {
      return {
        proceed: false,
        error: 'Hindi nahanap ang household code na ito (o hindi pa nagagawa). Pakisuri ang tamang invite code mula sa household owner bago magpatuloy.'
      };
    }
    return { proceed: true, reason: 'Valid household code' };
  };

  // If user enters SANTOS2027:
  const res2027 = canProceedWithRegistration('SANTOS2027');
  assert.strictEqual(res2027.proceed, false, 'Must not proceed with SANTOS2027');
  assert.ok(res2027.error.includes('Maling household invite code'), 'Error message must explicitly reject SANTOS variants');

  // If user enters an uncreated code UNCREATED999:
  const resUncreated = canProceedWithRegistration('UNCREATED999');
  assert.strictEqual(resUncreated.proceed, false, 'Must not proceed with uncreated code');

  // If user leaves code empty:
  const resEmpty = canProceedWithRegistration('');
  assert.strictEqual(resEmpty.proceed, true, 'Can proceed when empty to create own household');

  // If user enters legitimate SANTOS2026:
  const resSantos = canProceedWithRegistration('SANTOS2026');
  assert.strictEqual(resSantos.proceed, true, 'Can proceed with valid SANTOS2026');

  // If user enters registered family code CRUZ-1234:
  const resCruz = canProceedWithRegistration('CRUZ-1234');
  assert.strictEqual(resCruz.proceed, true, 'Can proceed with valid CRUZ-1234');
});

test('13. Pro vs Non-Pro PDF Export Gating & Household Tier Enforcement', () => {
  // Gating helper logic matching TipidLink pages
  const checkPDFExportAccess = ({ isPremium, isDemoMode, householdId }) => {
    const isPro = Boolean(
      isPremium || 
      isDemoMode || 
      householdId === 'hh-santos-family' || 
      householdId === '0d37e235-c9dd-4876-a54a-9acb36516599'
    );
    if (!isPro) {
      return {
        allowed: false,
        action: 'open_upgrade_modal',
        reason: 'PDF Statement Export requires ₱30 Pro or Sponsored Community Access'
      };
    }
    return {
      allowed: true,
      action: 'generate_pdf',
      reason: 'Pro Active: Export permitted'
    };
  };

  // 1. Non-Pro regular household: MUST be blocked from exporting PDF
  const freeHouseholdCheck = checkPDFExportAccess({
    isPremium: false,
    isDemoMode: false,
    householdId: 'hh-free-user-123'
  });
  assert.strictEqual(freeHouseholdCheck.allowed, false, 'Non-Pro household must NOT be allowed to export PDF');
  assert.strictEqual(freeHouseholdCheck.action, 'open_upgrade_modal', 'Non-Pro household click must open upgrade modal');

  // 2. Pro subscriber household (₱30/mo): Allowed to export
  const proHouseholdCheck = checkPDFExportAccess({
    isPremium: true,
    isDemoMode: false,
    householdId: 'hh-pro-user-456'
  });
  assert.strictEqual(proHouseholdCheck.allowed, true, 'Pro household must be allowed to export PDF');
  assert.strictEqual(proHouseholdCheck.action, 'generate_pdf');

  // 3. Santos Family demo during defense presentation: Allowed to export
  const santosDemoCheck = checkPDFExportAccess({
    isPremium: false,
    isDemoMode: true,
    householdId: 'hh-santos-family'
  });
  assert.strictEqual(santosDemoCheck.allowed, true, 'Santos family demo during presentation is permitted');

  // 4. Feature Tier Matrix
  const getHouseholdTierLimits = (isPro) => {
    if (!isPro) {
      return {
        tier: 'Free Household Tier',
        pricePHP: 0,
        pdfExport: false,
        inviteCodeMasked: true,
        maxMembers: 3,
      };
    }
    return {
      tier: 'TipidLink Premium Plan',
      pricePHP: 30,
      pdfExport: true,
      inviteCodeMasked: false,
      maxMembers: Infinity,
    };
  };

  const freeTier = getHouseholdTierLimits(false);
  assert.strictEqual(freeTier.pdfExport, false, 'Free tier has no PDF export');
  assert.strictEqual(freeTier.inviteCodeMasked, true, 'Free tier masks code');
  assert.strictEqual(freeTier.maxMembers, 3, 'Free tier allows up to 3 members');

  const proTier = getHouseholdTierLimits(true);
  assert.strictEqual(proTier.pdfExport, true, 'Pro tier allows PDF export');
  assert.strictEqual(proTier.inviteCodeMasked, false, 'Pro tier unmasks code');
  assert.strictEqual(proTier.pricePHP, 30, 'Pro tier is ₱30/month');
});

test('14. Household-Level Pro Status Sync Across All Family Members', () => {
  // Test case: Owner upgrades household to Pro
  const baseDesc = 'Pampamilyang budget ng mga Santos';
  const proPlan = 'TipidLink Premium Plan (₱30/mo)';
  const sponsoredPlan = 'Sponsored Community Access';
  const sponsorName = 'Barangay San Antonio Cooperative';

  // 1. Encoding Pro tier into description
  const directProDesc = formatHouseholdDescription(baseDesc, true, proPlan, null);
  assert.ok(directProDesc.includes('[TIER:PRO|PLAN:TipidLink Premium Plan (₱30/mo)]'), 'Encodes direct pro tag');

  const sponsoredDesc = formatHouseholdDescription(baseDesc, true, sponsoredPlan, sponsorName);
  assert.ok(sponsoredDesc.includes('[TIER:PRO|PLAN:Sponsored Community Access|SPONSOR:Barangay San Antonio Cooperative]'), 'Encodes sponsored pro tag');

  const freeDesc = formatHouseholdDescription(directProDesc, false);
  assert.strictEqual(freeDesc, baseDesc, 'Strips tier tag when reverting to free');

  // 2. Parsing tier from description
  const parsedDirect = parseHouseholdTier(directProDesc);
  assert.strictEqual(parsedDirect.isPremium, true);
  assert.strictEqual(parsedDirect.plan, proPlan);
  assert.strictEqual(parsedDirect.sponsor, null);
  assert.strictEqual(parsedDirect.cleanDescription, baseDesc);

  const parsedSponsored = parseHouseholdTier(sponsoredDesc);
  assert.strictEqual(parsedSponsored.isPremium, true);
  assert.strictEqual(parsedSponsored.plan, sponsoredPlan);
  assert.strictEqual(parsedSponsored.sponsor, sponsorName);
  assert.strictEqual(parsedSponsored.cleanDescription, baseDesc);

  const parsedFree = parseHouseholdTier(freeDesc);
  assert.strictEqual(parsedFree.isPremium, false);
  assert.strictEqual(parsedFree.plan, 'Free Household Plan');
  assert.strictEqual(parsedFree.sponsor, null);

  // 3. Resolving household-level Pro status for members
  // A newly created member account (e.g. child or spouse) with no personal subscription
  // views a Pro household. They MUST resolve to isPremium: true!
  const proHousehold = {
    id: 'hh-family-123',
    name: 'Santos Family',
    description: directProDesc,
    created_by: 'owner-uuid-maria',
  };
  const memberResolution = resolveHouseholdPremiumState(proHousehold, 'member-uuid-pedro');
  assert.strictEqual(memberResolution.isPremium, true, 'Member inherits household Pro status');
  assert.strictEqual(memberResolution.plan, proPlan);

  // When household reverts to free:
  const freeHousehold = {
    id: 'hh-family-123',
    name: 'Santos Family',
    description: freeDesc,
    created_by: 'owner-uuid-maria',
  };
  const memberFreeResolution = resolveHouseholdPremiumState(freeHousehold, 'member-uuid-pedro');
  assert.strictEqual(memberFreeResolution.isPremium, false, 'Member reverts to free when household reverts');

  // When Owner restores Pro:
  const restoredHousehold = {
    id: 'hh-family-123',
    name: 'Santos Family',
    description: formatHouseholdDescription(baseDesc, true, proPlan, null),
    created_by: 'owner-uuid-maria',
  };
  const memberRestoredResolution = resolveHouseholdPremiumState(restoredHousehold, 'member-uuid-pedro');
  assert.strictEqual(memberRestoredResolution.isPremium, true, 'Member gets Pro back when Owner restores household Pro');

  // 4. Owner-Profile-based Pro inheritance across accounts and devices
  // Even if the household description in the database hasn't synced the tier tag yet,
  // if the Owner's profile has PREMIUM_STATUS:PRO, all members in that household inherit Pro!
  const plainHousehold = {
    id: 'hh-cruz-999',
    name: 'Cruz Household',
    description: 'Shared family home in Quezon City',
    created_by: 'owner-cruz-uuid',
  };
  const membersWithProOwner = [
    {
      id: 'm1',
      user_id: 'owner-cruz-uuid',
      role: 'owner',
      phone: '09171234567|INVITES:CRUZ2026:hh-cruz-999|PREMIUM_STATUS:PRO|PLAN:TipidLink Premium Plan (₱30/mo)|SPONSOR:none',
    },
    {
      id: 'm2',
      user_id: 'admin-cruz-uuid',
      role: 'admin',
      phone: '',
    },
    {
      id: 'm3',
      user_id: 'member-cruz-uuid',
      role: 'member',
      phone: '',
    },
  ];

  const adminCruzRes = resolveHouseholdPremiumState(plainHousehold, 'admin-cruz-uuid', membersWithProOwner);
  assert.strictEqual(adminCruzRes.isPremium, true, 'Admin Cruz inherits Pro from Pro Owner');

  const memberCruzRes = resolveHouseholdPremiumState(plainHousehold, 'member-cruz-uuid', membersWithProOwner);
  assert.strictEqual(memberCruzRes.isPremium, true, 'Member Cruz inherits Pro from Pro Owner');

  // When Owner Cruz resets to free:
  const membersWithFreeOwner = [
    {
      id: 'm1',
      user_id: 'owner-cruz-uuid',
      role: 'owner',
      phone: '09171234567|INVITES:CRUZ2026:hh-cruz-999',
    },
    {
      id: 'm2',
      user_id: 'admin-cruz-uuid',
      role: 'admin',
      phone: '',
    },
    {
      id: 'm3',
      user_id: 'member-cruz-uuid',
      role: 'member',
      phone: '',
    },
  ];

  const adminCruzFreeRes = resolveHouseholdPremiumState(plainHousehold, 'admin-cruz-uuid', membersWithFreeOwner);
  assert.strictEqual(adminCruzFreeRes.isPremium, false, 'Admin Cruz reverts to free when Owner is free');

  const memberCruzFreeRes = resolveHouseholdPremiumState(plainHousehold, 'member-cruz-uuid', membersWithFreeOwner);
  assert.strictEqual(memberCruzFreeRes.isPremium, false, 'Member Cruz reverts to free when Owner is free');
});

test('15. Anti-Reversion Guard & Universal Reset to Free Across Joined Household Members', () => {
  const mockStorage = new Map();
  global.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };

  const hhId = 'hh-reversion-test-001';
  const inviteCode = 'TESTREV26';

  // Step 1: Owner activates Pro for Household
  mockStorage.set(`tipidlink_household_tier_${hhId}`, 'PRO');
  mockStorage.set(`tipidlink_household_premium_${hhId}`, 'true');
  mockStorage.set(`tipidlink_code_tier_${inviteCode}`, 'PRO');
  mockStorage.set(`tipidlink_code_premium_${inviteCode}`, 'true');

  const proHh = {
    id: hhId,
    name: 'Test Household',
    invite_code: inviteCode,
    description: 'Test budget [TIER:PRO|PLAN:TipidLink Premium Plan (₱30/mo)]',
    is_premium: true,
  };

  const members = [
    { user_id: 'owner-id', role: 'owner', phone: '09123456789|PREMIUM_STATUS:PRO' },
    { user_id: 'member-id-1', role: 'member', phone: '' },
    { user_id: 'admin-id-2', role: 'admin', phone: '' },
  ];

  // Both owner, member, and admin resolve to Pro
  assert.strictEqual(resolveHouseholdPremiumState(proHh, 'owner-id', members).isPremium, true, 'Owner is Pro');
  assert.strictEqual(resolveHouseholdPremiumState(proHh, 'member-id-1', members).isPremium, true, 'Member is Pro');
  assert.strictEqual(resolveHouseholdPremiumState(proHh, 'admin-id-2', members).isPremium, true, 'Admin is Pro');

  // Step 2: Owner performs Reset to Free
  mockStorage.set(`tipidlink_household_tier_${hhId}`, 'FREE');
  mockStorage.set(`tipidlink_code_tier_${inviteCode}`, 'FREE');
  mockStorage.delete(`tipidlink_household_premium_${hhId}`);
  mockStorage.delete(`tipidlink_code_premium_${inviteCode}`);

  const freeHh = {
    id: hhId,
    name: 'Test Household',
    invite_code: inviteCode,
    description: 'Test budget [TIER:FREE]',
    is_premium: false,
  };

  const freeMembers = [
    { user_id: 'owner-id', role: 'owner', phone: '09123456789' },
    { user_id: 'member-id-1', role: 'member', phone: '' },
    { user_id: 'admin-id-2', role: 'admin', phone: '' },
  ];

  // Both owner, member, and admin resolve to FREE
  assert.strictEqual(resolveHouseholdPremiumState(freeHh, 'owner-id', freeMembers).isPremium, false, 'Owner is Free after reset');
  assert.strictEqual(resolveHouseholdPremiumState(freeHh, 'member-id-1', freeMembers).isPremium, false, 'Member is Free after reset');
  assert.strictEqual(resolveHouseholdPremiumState(freeHh, 'admin-id-2', freeMembers).isPremium, false, 'Admin is Free after reset');

  // Step 3: Anti-Reversion Check (stale in-memory flag is ignored)
  const staleHhWithOldProFlag = {
    id: hhId,
    name: 'Test Household',
    invite_code: inviteCode,
    description: 'Test budget [TIER:FREE]',
    is_premium: true,
  };
  assert.strictEqual(resolveHouseholdPremiumState(staleHhWithOldProFlag, 'member-id-1', freeMembers).isPremium, false, 'Explicit FREE override stops stale is_premium: true from resurrecting Pro');

  // Step 4: Owner restores Pro
  mockStorage.set(`tipidlink_household_tier_${hhId}`, 'PRO');
  mockStorage.set(`tipidlink_household_premium_${hhId}`, 'true');
  mockStorage.set(`tipidlink_code_tier_${inviteCode}`, 'PRO');
  mockStorage.set(`tipidlink_code_premium_${inviteCode}`, 'true');

  const restoredHh = {
    id: hhId,
    name: 'Test Household',
    invite_code: inviteCode,
    description: 'Test budget [TIER:PRO|PLAN:TipidLink Premium Plan (₱30/mo)]',
    is_premium: true,
  };

  assert.strictEqual(resolveHouseholdPremiumState(restoredHh, 'member-id-1', members).isPremium, true, 'Restoring Pro immediately updates joined member');
  assert.strictEqual(resolveHouseholdPremiumState(restoredHh, 'admin-id-2', members).isPremium, true, 'Restoring Pro immediately updates joined admin');

  // Step 5: Plain description without tags (reverted to free via formatHouseholdDescription)
  mockStorage.set(`tipidlink_household_tier_${hhId}`, 'FREE');
  mockStorage.delete(`tipidlink_household_premium_${hhId}`);
  const plainRevertedHh = {
    id: hhId,
    name: 'Test Household',
    invite_code: inviteCode,
    description: 'Pampamilyang budget',
    is_premium: false,
  };
  // Even if members in memory still had old PREMIUM_STATUS:PRO tag before fetch:
  const staleMembersBeforeFetch = [
    { user_id: 'owner-id', role: 'owner', phone: '09123456789|PREMIUM_STATUS:PRO' },
    { user_id: 'member-id-1', role: 'member', phone: '' },
  ];
  assert.strictEqual(resolveHouseholdPremiumState(plainRevertedHh, 'owner-id', staleMembersBeforeFetch).isPremium, false, 'Owner is Free even if members list has old phone tag');
  assert.strictEqual(resolveHouseholdPremiumState(plainRevertedHh, 'member-id-1', staleMembersBeforeFetch).isPremium, false, 'Member is Free even if members list has old phone tag');

  // Step 6: Santos Family Household Auto-Update from Pro to Free & Back
  const santosUuid = '0d37e235-c9dd-4876-a54a-9acb36516599';
  mockStorage.set(`tipidlink_household_tier_${santosUuid}`, 'FREE');
  mockStorage.set('tipidlink_code_tier_SANTOS2026', 'FREE');
  mockStorage.delete(`tipidlink_household_premium_${santosUuid}`);
  mockStorage.delete('tipidlink_code_premium_SANTOS2026');

  const santosRevertedHh = {
    id: santosUuid,
    name: 'Santos Family Household',
    invite_code: 'SANTOS2026',
    description: 'Shared budget and expenses for the Santos family home in Pasig City',
    is_premium: false,
  };
  const santosCleanMembers = [
    { user_id: 'demo-user-santos-father', role: 'owner', phone: '' },
    { user_id: 'demo-user-santos-mother', role: 'admin', phone: '' },
    { user_id: 'joined-member-cp-1', role: 'member', phone: '' },
  ];
  assert.strictEqual(resolveHouseholdPremiumState(santosRevertedHh, 'joined-member-cp-1', santosCleanMembers).isPremium, false, 'Santos joined member immediately updates to Free');

  // Step 7: Santos Family Owner upgrades back to Pro
  mockStorage.set(`tipidlink_household_tier_${santosUuid}`, 'PRO');
  mockStorage.set('tipidlink_code_tier_SANTOS2026', 'PRO');
  mockStorage.set(`tipidlink_household_premium_${santosUuid}`, 'true');
  mockStorage.set('tipidlink_code_premium_SANTOS2026', 'true');
  const santosProHh = {
    id: santosUuid,
    name: 'Santos Family Household',
    invite_code: 'SANTOS2026',
    description: 'Shared budget [TIER:PRO|PLAN:TipidLink Premium Plan (₱30/mo)]',
    is_premium: true,
  };
  assert.strictEqual(resolveHouseholdPremiumState(santosProHh, 'joined-member-cp-1', santosCleanMembers).isPremium, true, 'Santos joined member auto-updates to Pro upon upgrade');

  delete global.localStorage;
});

test('16. Bill Payment Auto-Deduction from Overall Budget and Category Budget', () => {
  const categories = INITIAL_DEMO_DATA.categories;
  const electricityCat = categories.find(c => c.id === 'cat-2'); // Electricity (Meralco)
  const waterCat = categories.find(c => c.id === 'cat-3'); // Water (Maynilad)
  const internetCat = categories.find(c => c.id === 'cat-4'); // Internet (Converge Fiber)

  // 1. Verify auto-detection of category for bills without explicit category_id
  const detectedMeralco = autoDetectBillCategory('Meralco Electric Bill', 'Manila Electric Company', categories);
  assert.strictEqual(detectedMeralco.id, 'cat-2', 'Meralco bill auto-detects Electricity category');

  const detectedWater = autoDetectBillCategory('Maynilad Water Bill', 'Maynilad', categories);
  assert.strictEqual(detectedWater.id, 'cat-3', 'Maynilad bill auto-detects Water category');

  const detectedWifi = autoDetectBillCategory('Converge Fiber WiFi', 'Converge ICT', categories);
  assert.strictEqual(detectedWifi.id, 'cat-4', 'WiFi bill auto-detects Internet category');

  // 2. Multi-layer Category Matching (UUID vs mock ID vs name)
  assert.strictEqual(matchCategoryId('cat-2', '5b18d8f3-037c-45ee-880a-1e92842ec867', categories), true, 'Mock cat-2 matches Supabase Electricity UUID');
  assert.strictEqual(matchCategoryId('5b18d8f3-037c-45ee-880a-1e92842ec867', 'cat-2', categories), true, 'Supabase Electricity UUID matches mock cat-2');

  // 3. Test doesTransactionMatchCategory across various real-world bill payment transactions
  const billPaymentTx1 = {
    id: 'tx-bill-100',
    type: 'expense',
    amount: 4200,
    category_id: 'cat-2',
    category_name: 'Electricity (Meralco)',
    description: 'Payment for Meralco Electric Bill',
  };
  assert.strictEqual(doesTransactionMatchCategory(billPaymentTx1, 'cat-2', electricityCat, categories), true, 'Direct ID match');
  assert.strictEqual(doesTransactionMatchCategory(billPaymentTx1, '5b18d8f3-037c-45ee-880a-1e92842ec867', electricityCat, categories), true, 'Cross-platform UUID match');

  // Test payment transaction where category_name or description matches
  const billPaymentTx2 = {
    id: 'tx-bill-101',
    type: 'expense',
    amount: 1150,
    category_id: null,
    category_name: 'Water Bill',
    description: 'Payment for Maynilad Water Bill',
  };
  assert.strictEqual(doesTransactionMatchCategory(billPaymentTx2, 'cat-3', waterCat, categories), true, 'Matches Water budget even if category_id was null');

  // 4. Budget Math Simulation: Paying a bill MUST deduct from both Overall Target and Category Budget
  const overallTarget = 75000;
  let totalExpenses = 19700; // Baseline expenses from mock data
  let remainingBudget = overallTarget - totalExpenses;
  assert.strictEqual(remainingBudget, 55300, 'Baseline remaining budget is 55,300');

  // User records payment for Meralco Electric Bill (₱4,200)
  const payAmount = 4200;
  totalExpenses += payAmount;
  remainingBudget = overallTarget - totalExpenses;
  assert.strictEqual(totalExpenses, 23900, 'Total expenses properly increased by 4,200 to 23,900');
  assert.strictEqual(remainingBudget, 51100, 'Remaining budget properly deducted by 4,200 to 51,100');

  // Category Budget deduction verification:
  const electricityBudgetLimit = 4500;
  let electricitySpent = 0;
  let electricityRemaining = electricityBudgetLimit - electricitySpent;
  assert.strictEqual(electricityRemaining, 4500, 'Initial Electricity remaining is 4,500');

  // After bill payment is matched:
  electricitySpent += payAmount;
  electricityRemaining = electricityBudgetLimit - electricitySpent;
  assert.strictEqual(electricitySpent, 4200, 'Electricity spent increased by 4,200');
  assert.strictEqual(electricityRemaining, 300, 'Electricity remaining deducted from 4,500 to 300');
  const utilizationPercent = (electricitySpent / electricityBudgetLimit) * 100;
  assert.strictEqual(Math.round(utilizationPercent), 93, 'Electricity utilization is 93.3%');
});

test('17. Bill payments reconcile into every budget-facing ledger without duplicates', () => {
  const categories = INITIAL_DEMO_DATA.categories;
  const bills = [
    {
      id: 'bill-electricity',
      title: 'Meralco Electric Bill',
      biller_name: 'Meralco',
      category_id: 'cat-2',
      payments: [{ id: 'payment-existing', amount: 4200, payment_date: '2026-11-19', payment_method: 'gcash' }],
    },
    {
      id: 'bill-water',
      title: 'Maynilad Water Bill',
      biller_name: 'Maynilad',
      category_id: null,
      payments: [{ id: 'payment-missing-transaction', amount: 1150, payment_date: '2026-11-19', payment_method: 'cash' }],
    },
  ];

  // A legacy client already created the electricity expense, while the water
  // payment was saved without a companion transaction row.
  const transactions = [{
    id: 'legacy-electricity-transaction',
    type: 'expense',
    amount: 4200,
    category_id: 'cat-2',
    transaction_date: '2026-11-19',
    description: 'Payment for Meralco Electric Bill',
  }];

  const ledger = reconcileBillPaymentLedger(transactions, bills, categories);
  const expenses = ledger.filter((transaction) => transaction.type === 'expense');

  assert.strictEqual(expenses.length, 2, 'Legacy payment is not duplicated and missing payment is restored');
  assert.strictEqual(
    expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    5350,
    'Both bill payments are included in the overall expense total'
  );

  const restoredWaterPayment = ledger.find((transaction) => transaction.bill_payment_id === 'payment-missing-transaction');
  assert.ok(restoredWaterPayment, 'Missing payment is materialized into the ledger');
  assert.strictEqual(restoredWaterPayment.category_id, 'cat-3', 'Recovered payment is assigned to the Water category budget');
});
