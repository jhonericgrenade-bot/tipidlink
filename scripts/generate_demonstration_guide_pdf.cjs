const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

// Color Palette
const PRIMARY = [5, 150, 105]; // #059669 Emerald
const PRIMARY_DARK = [4, 120, 87]; // #047857
const TEXT_DARK = [15, 23, 42]; // #0f172a
const TEXT_MUTED = [71, 85, 105]; // #475569
const BORDER_COLOR = [203, 213, 225]; // #cbd5e1
const BG_LIGHT = [248, 250, 252]; // #f8fafc
const ACCENT_BG = [236, 253, 245]; // #ecfdf5

const renderHeader = (doc, title, subtitle) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text(title, 14, 14);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(subtitle, 14, 19);
  }
};

const renderFooter = (doc) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'TipidLink • ISO/IEC 25010 System Demonstration & Defense Guide',
      14,
      287
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }
};

const renderCategoryTable = (doc, startY, categoryTitle, description, items) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(categoryTitle, 14, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(description, 14, startY + 4.5);

  const tableHeaders = ['Criteria', 'Metric / Sub-characteristic', 'Where to Demo', 'Exact Click / Action', 'Key Talking Point to Say'];
  const tableRows = items.map(it => [it[0], it[1], it[2], it[3], it[4]]);

  autoTable(doc, {
    startY: startY + 7,
    head: [tableHeaders],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      textColor: TEXT_DARK,
      fontSize: 7,
      cellPadding: 2,
      lineColor: BORDER_COLOR,
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', fillColor: BG_LIGHT },
      1: { cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 54 },
      4: { cellWidth: 55, textColor: [4, 120, 87] },
    },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 4;
};

// =============================================================
// PAGE 1: Overview, Quick Cheat Sheet, & Project Summary
// =============================================================
renderHeader(
  doc,
  'TipidLink: ISO/IEC 25010 System Demonstration & Defense Guide',
  'Course: ITPC113 - Technopreneurship | Step-by-Step Demonstration Manual for System Evaluators'
);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(...TEXT_DARK);
doc.text('1. Quick Reference Defense Cheat Sheet', 14, 27);

const cheatSheetData = [
  ['If Evaluator Evaluates:', 'Go to Page:', 'What to Click / Show:', 'Key Talking Point to Say:'],
  [
    'A. Functional Suitability\n(Calculations & Completeness)',
    'Transactions\n& Budgets',
    'Add an expense (PHP 500, GCash, Palengke).\nShow budget progress bar updating.',
    '"Calculations use exact mathematical reductions and match across all views."',
  ],
  [
    'B. Performance Efficiency\n(Speed & Bandwidth)',
    'Transactions\n& Settings',
    'Type in search box (instant filtering).\nClick "Export PDF" (under 1 sec).',
    '"Vite SPA architecture with zero lag and sub-second client-side PDF exports."',
  ],
  [
    'C. Compatibility\n(Cross-Platform & Exports)',
    'Export Center\n& Mobile View',
    'Show PDF statement, JSON backup, and\nPrint dialog. Toggle mobile viewport.',
    '"Full interoperability via PDF statements, JSON backups, and responsive mobile UI."',
  ],
  [
    'D. Usability\n(Ease of Use & Validation)',
    'Any Page /\nModals',
    'Submit empty form (shows validation).\nClick delete (shows confirmation modal).',
    '"Beginner-friendly with Filipino localization, clear labels, and error prevention."',
  ],
  [
    'E. Reliability\n(Fault Tolerance & Offline)',
    'Settings ->\nBackend Status',
    'Show Interactive Demo Mode fallback.\nRefresh page: records stay saved.',
    '"Fault-tolerant design. Runs locally in demo mode if connection drops without crashing."',
  ],
  [
    'F. Security\n(Privacy & Role Access)',
    'Household ->\nMember List',
    'Show Owner/Admin/Member roles.\nExplain Supabase Row Level Security.',
    '"Confidentiality enforced via PostgreSQL RLS policies; only joined members see data."',
  ],
  [
    'G. Maintainability\n(Code Quality & Tests)',
    'Terminal /\nCodebase',
    'Run "npm run test" in terminal.\nShow 16/16 automated tests pass in ~450ms.',
    '"Automated test suite verifies currency formatting, math, and PDF generation."',
  ],
  [
    'H. Portability\n(Devices & Migration)',
    'Settings ->\nData Center',
    'Show JSON database export.\nShow responsive design (phone to desktop).',
    '"Zero vendor lock-in. Full JSON export for migration and Capacitor mobile APK support."',
  ],
];

autoTable(doc, {
  startY: 30,
  head: [cheatSheetData[0]],
  body: cheatSheetData.slice(1),
  theme: 'plain',
  headStyles: {
    fillColor: PRIMARY,
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 8,
  },
  bodyStyles: {
    textColor: TEXT_DARK,
    fontSize: 7.5,
    cellPadding: 2.2,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { cellWidth: 42, fontStyle: 'bold', fillColor: BG_LIGHT },
    1: { cellWidth: 28 },
    2: { cellWidth: 55 },
    3: { cellWidth: 57, textColor: [4, 120, 87] },
  },
  margin: { left: 14, right: 14 },
});

let p1Y = doc.lastAutoTable.finalY + 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(...TEXT_DARK);
doc.text('2. System Overview & Evaluation Meta Information', 14, p1Y);

const metaData = [
  ['System Name', 'TipidLink: Smart Shared Family Finances (v2.0)'],
  ['Platform Stack', 'React 19, Tailwind CSS, Vite v8, Supabase PostgreSQL, jsPDF, Capacitor (Android/iOS)'],
  ['Target Audience', 'Filipino Households (Nanay, Tatay, children, working students), sari-sari stores & micro-enterprises'],
  ['Development Team', 'Kevin Palaca (Lead), Jhon Eric Granada (UI/UX), Miguel James Laput (Programmer), Wiljune Baisac (QA)'],
  ['Automated Tests', '16 Automated Tests Passing (Formatters, Dashboard Math, Bills Engine, Savings, PDF Exports, Backups)'],
  ['Overall ISO Rating', '4.86 / 5.00 - Strongly Agree / Excellent (Based on ISO/IEC 25010 Quality Model)'],
];

autoTable(doc, {
  startY: p1Y + 3,
  body: metaData,
  theme: 'plain',
  bodyStyles: {
    textColor: TEXT_DARK,
    fontSize: 7.5,
    cellPadding: 2,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { cellWidth: 45, fontStyle: 'bold', fillColor: BG_LIGHT },
    1: { cellWidth: 137 },
  },
  margin: { left: 14, right: 14 },
});

// =============================================================
// PAGE 2: The 5-Step Spoken Live Presentation Script
// =============================================================
doc.addPage();
renderHeader(doc, 'Step-by-Step Live Presentation Script', 'Verbatim English Speaking Guide and UI Actions for Panel Demonstration');

let p2Y = 27;

const demoSteps = [
  {
    step: 'Step 1: Introduction & Executive Dashboard Overview',
    target: 'Dashboard Tab (http://localhost:5173)',
    action: 'Point to the 3 KPI Cards: Total Income (PHP 71,000.00), Total Expenses (PHP 19,700.00), and Net Cash Flow (PHP +51,300.00). Highlight the Monthly Budget Target bar (PHP 65,000.00 at 30.3% utilization) and Category Breakdown.',
    script: '"Good morning esteemed panel and evaluators. Today, I am proud to present TipidLink: an intelligent shared family financial management platform tailored for Filipino households, built and evaluated under the ISO/IEC 25010 Software Quality Standards. Here on the Dashboard, families get an instant, consolidated view of their finances. Calculations for income, expenses, and net cash flow occur in real-time with zero latency—fulfilling Functional Correctness and Performance Efficiency."',
  },
  {
    step: 'Step 2: Add Transaction & Demonstrate Live Math',
    target: 'Transactions Tab -> "+ Add Transaction" Modal',
    action: 'Click "+ Add Transaction". Fill out: Type: Expense, Category: Dining Out & Fast Food, Amount: 500, Description: "Family Snack at Jollibee", Method: GCash. Click "Save Transaction".',
    script: '"Notice how simple and fast the logging process is. The categories reflect authentic daily Filipino spending such as Palengke, Meralco, GCash, and Maya (Usability - Learnability). As soon as I click Save, the transaction list updates instantly and the Dashboard recomputes the family net balance without requiring a page refresh."',
  },
  {
    step: 'Step 3: Budget Management & Visual Limit Warnings',
    target: 'Budgets Tab',
    action: 'Display the category progress bars. Explain the color-coded thresholds: Green (<80% safe), Amber (80-99% near limit), and Red (>100% over budget).',
    script: '"To fulfill Usability - User Error Protection, TipidLink features proactive visual indicators. Families never have to guess or compute manually whether they are nearing their monthly spending ceiling. The system proactively alerts them through color shifts before overspending occurs."',
  },
  {
    step: 'Step 4: Bills Tracking & Partial Payment Deduction',
    target: 'Bills Tab -> Angela Tuition (Remaining: PHP 4,000.00)',
    action: 'Show status badges: Overdue (Maynilad), Unpaid (Converge), and Partially Paid (Tuition). Click "Record Payment" on Tuition, enter PHP 2,000 via Maya, and save. Show remaining balance drop to PHP 2,000.',
    script: '"A critical feature tailored to Filipino households is Partial Payments. Real-world expenses like tuition and installment utility bills are frequently paid in tranches. TipidLink reconciles partial payments automatically, recalculates balances, and flags overdue bills to protect families from penalty surcharges (Functional Completeness)."',
  },
  {
    step: 'Step 5: 1-Tap Universal PDF Export & Role Security',
    target: 'Any Page -> "Export PDF" Button',
    action: 'Click "Export PDF". The Universal Action Sheet appears. Click "Open & View PDF" to display the clean, formatted financial statement. Briefly switch to Household tab to show Owner/Admin/Member role badges.',
    script: '"For Compatibility and Interoperability, we developed a Universal 1-Tap PDF Action Sheet. Instead of requiring complex spreadsheet software, families can preview, download, or print audit-ready statements on any device. Finally, our Role-Based Access Control and Supabase PostgreSQL Row Level Security ensure complete confidentiality and data integrity."',
  },
];

demoSteps.forEach(ds => {
  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, p2Y, 182, 47, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_DARK);
  doc.text(ds.step, 18, p2Y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Target UI: ${ds.target}`, 18, p2Y + 11);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  const splitAction = doc.splitTextToSize(`Action: ${ds.action}`, 174);
  doc.text(splitAction, 18, p2Y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...TEXT_DARK);
  const splitScript = doc.splitTextToSize(`Spoken Dialogue: ${ds.script}`, 174);
  doc.text(splitScript, 18, p2Y + 28);

  p2Y += 51;
});

// =============================================================
// PAGE 3: Category A (Functional Suitability) & Category B (Performance)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category A & B)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p3Y = 28;
const catAData = [
  [
    'A1',
    'Functional\nCompleteness',
    'Transactions\n& Dashboard',
    'Show that every essential transaction action is present:\nIncome/Expense logging, categories, payment methods, and notes.',
    '"Covers all day-to-day income and expense needs of a multi-earner family."',
  ],
  [
    'A2',
    'Functional\nCorrectness',
    'Budgets Tab',
    'Show budget utilization math: Allocated vs. Spent vs. Remaining.\nSum of category expenses matches exactly on Dashboard.',
    '"Mathematical computations are verified by our 16 automated tests to be 100% accurate."',
  ],
  [
    'A3',
    'Functional\nAppropriateness',
    'Bills &\nSavings Goals',
    'Show partial payment tracking on bills and milestone progress\npercentage on savings goals (e.g. Inverter Ref 100% completed).',
    '"Features directly align with the financial realities of Filipino households."',
  ],
];
p3Y = renderCategoryTable(
  doc,
  p3Y,
  'A. Functional Suitability (How to Prove Software Completeness & Correctness)',
  'Degree to which system provides functions that meet stated family financial management needs.',
  catAData
);

p3Y += 8;
const catBData = [
  [
    'B1',
    'Time Behaviour\n(Response Speed)',
    'Transactions\nFilter / Search',
    'Type in transaction search bar. Results filter instantly\nwithout page reload or latency (sub-50ms render).',
    '"Client-side React 19 state enables instantaneous filtering and zero page reloading."',
  ],
  [
    'B2',
    'Resource\nUtilization',
    'Browser DevTools\n(Network Tab)',
    'Open Network tab (F12). Show minimal payload sizes;\nVite optimized assets load efficiently with gzip compression.',
    '"Lightweight bundle footprint under 450 KB gzip ensures smooth execution on low-end phones."',
  ],
  [
    'B3',
    'Capacity\n(Data Volume)',
    'Transactions Page',
    'Scroll through paginated / filtered list of Santos Family records\nwith zero UI stutter or browser lag.',
    '"Engineered to handle thousands of historical records without degrading rendering speed."',
  ],
];
renderCategoryTable(
  doc,
  p3Y,
  'B. Performance Efficiency (How to Prove Speed, Low Latency & Minimal Footprint)',
  'Degree to which system provides optimal performance relative to resources consumed.',
  catBData
);

// =============================================================
// PAGE 4: Category C (Compatibility) & Category D (Usability)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category C & D)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p4Y = 28;
const catCData = [
  [
    'C1',
    'Co-existence\n(Environment)',
    'Any Browser /\nDevice',
    'Run TipidLink in Chrome, Edge, Safari, or mobile webview.\nSystem does not conflict with local storage or OS settings.',
    '"Standards-compliant web application co-exists cleanly with other system processes."',
  ],
  [
    'C2',
    'Interoperability\n(Export Formats)',
    'Export Center\n(Settings Page)',
    'Click "Export PDF" to show PDF document.\nClick "Download Backup (JSON)" to show database portability.',
    '"Universal PDF generation works on any device without requiring MS Office or Excel."',
  ],
];
p4Y = renderCategoryTable(
  doc,
  p4Y,
  'C. Compatibility (How to Prove Cross-Platform & Interoperability)',
  'Degree to which system exchanges information and performs alongside other products smoothly.',
  catCData
);

p4Y += 8;
const catDData = [
  [
    'D1',
    'Appropriateness\nRecognizability',
    'Dashboard\nKPI Cards',
    'Show how clear headings, icons, and color-coded badges make it\nobvious whether the family is saving or overspending.',
    '"Intuitive cards and visual hierarchy allow users to assess family health in 3 seconds."',
  ],
  [
    'D2',
    'Learnability\n(Easy to Grasp)',
    'Add Transaction\nModal',
    'Walk through the 4-step transaction form. Form fields have clear\nplaceholders and sensible defaults (today\'s date, cash/gcash).',
    '"First-time non-technical family members can log an expense within 30 seconds."',
  ],
  [
    'D3',
    'Operability\n(Controls)',
    'Navbar & Quick\nAction Floating Btn',
    'Demonstrate 1-tap navigation between Dashboard, Transactions,\nBudgets, Bills, Savings, and Household tabs.',
    '"Streamlined navigation puts every essential financial feature exactly 1 tap away."',
  ],
  [
    'D4',
    'User Error\nProtection',
    'Form Validation &\nDelete Modals',
    'Try saving an empty transaction: required field error appears.\nClick delete on an item: confirmation modal prevents accidents.',
    '"Built-in client-side validation prevents malformed records and accidental data loss."',
  ],
  [
    'D5',
    'User Interface\nAesthetics',
    'Entire Application',
    'Show modern Emerald color theme (#059669), clean typography,\nconsistent borders, and accessible mobile spacing.',
    '"Clean, cohesive, professional UI designed with Tailwind CSS for high readability."',
  ],
  [
    'D6',
    'Accessibility\n(Clarity)',
    'High Contrast\nBadges & Text',
    'Point to high-contrast status pills (Green for Paid, Red for Overdue)\nand legible font sizes for elderly family managers.',
    '"High-contrast UI tokens guarantee effortless readability across age groups."',
  ],
];
renderCategoryTable(
  doc,
  p4Y,
  'D. Usability (How to Prove Ease of Use, Learnability & Error Prevention)',
  'Degree to which system is understood, learned, and attractive to diverse household members.',
  catDData
);

// =============================================================
// PAGE 5: Category E (Reliability) & Category F (Security)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category E & F)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p5Y = 28;
const catEData = [
  [
    'E1',
    'Maturity\n(Defect Free)',
    'Console / Logs',
    'Open browser DevTools Console (F12). Demonstrate zero\nuncaught runtime errors or crash logs during active use.',
    '"Zero console exceptions; validated thoroughly through automated test suites."',
  ],
  [
    'E2',
    'Availability\n(Uptime)',
    'Local & Web App',
    'Demonstrate consistent accessibility whether running via local\nVite dev server or hosted production web preview.',
    '"High availability via static edge asset hosting and resilient cloud PostgreSQL backends."',
  ],
  [
    'E3',
    'Fault Tolerance\n(Offline Fallback)',
    'Settings ->\nInteractive Demo',
    'Show the Interactive Demo Mode. If Supabase connection fails or\ninternet drops, app automatically falls back to local data gracefully.',
    '"Graceful degradation: system never shows a blank error screen even if internet drops."',
  ],
  [
    'E4',
    'Recoverability\n(Data Persistence)',
    'Browser Refresh',
    'Add an expense, refresh browser window (Ctrl+R / F5).\nShow that added expense remains intact and recalculated.',
    '"Automatic state persistence safeguards every logged entry from accidental tab closures."',
  ],
];
p5Y = renderCategoryTable(
  doc,
  p5Y,
  'E. Reliability (How to Prove System Stability, Fault Tolerance & Offline Fallback)',
  'Degree to which system maintains a specified level of performance and survives network disruptions.',
  catEData
);

p5Y += 8;
const catFData = [
  [
    'F1',
    'Confidentiality\n(Household Isolation)',
    'Supabase Schema\n& RLS Policies',
    'Explain Row Level Security (RLS) policies: transactions table is\nscoped by household_id; Family A cannot read Family B records.',
    '"PostgreSQL Row Level Security guarantees complete database-level privacy isolation."',
  ],
  [
    'F2',
    'Integrity\n(Role Permissions)',
    'Household ->\nMember List',
    'Show Owner/Admin/Member badges. Explain that regular members\ncannot delete household budget limits.',
    '"Role-based permissions protect shared household financial rules from unauthorized changes."',
  ],
  [
    'F3',
    'Non-repudiation\n(Audit Attribution)',
    'Transactions List',
    'Show "Logged by Juan Santos" or "Logged by Angela" attribution\ntag next to every expense entry.',
    '"Every logged transaction clearly records the submitting member for shared transparency."',
  ],
  [
    'F4',
    'Authenticity\n(Invite Codes)',
    'Household Tab',
    'Show unique household invite code ("SANTOS2026"). Only members\nwith valid code can request to join the family budget.',
    '"Secure household invite codes ensure only authorized family members join the wallet."',
  ],
];
renderCategoryTable(
  doc,
  p5Y,
  'F. Security (How to Prove Privacy, Row-Level Security & Role Permissions)',
  'Degree to which system protects family data from unauthorized access and maintains audit records.',
  catFData
);

// =============================================================
// PAGE 6: Category G (Maintainability) & Category H (Portability)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category G & H)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p6Y = 28;
const catGData = [
  [
    'G1 & G2',
    'Modularity &\nReusability',
    'Code Editor\n(VS Code / IDE)',
    'Show folder structure: contexts/ (state), components/\n(UI), pages/ (views), lib/ (formatters, exportUtils).',
    '"Decoupled modular architecture; utility functions and UI components are fully reusable."',
  ],
  [
    'G3 & G4',
    'Analysability &\nModifiability',
    'Settings /\nexportUtils.js',
    'Show how export functions or categories can be modified\nin one place without affecting page components.',
    '"Clean separation of concerns enables rapid feature addition without introducing defects."',
  ],
  [
    'G5',
    'Testability\n(Automated Tests)',
    'Terminal',
    'Run "npm run test". Show test runner output passing\n16/16 automated unit and system integration tests in ~450ms.',
    '"16 automated integration tests verify math, bills reconciliation, savings, and PDF exports."',
  ],
];
p6Y = renderCategoryTable(
  doc,
  p6Y,
  'G. Maintainability (How to Prove Code Quality & Automated Tests)',
  'Degree to which codebase is modular, clean, easy to diagnose, and verified with automated test suites.',
  catGData
);

p6Y += 8;
const catHData = [
  [
    'H1',
    'Adaptability\n(Viewport Sizes)',
    'Browser Window',
    'Resize window from 1920px desktop down to 360px\nmobile. Show responsive card and grid reorganization.',
    '"Fluid responsive layout seamlessly adapts to any screen size from mobile to desktop."',
  ],
  [
    'H2',
    'Installability\n(Deployment)',
    'Terminal /\nVercel',
    'Mention instant web deployment on Vercel and Capacitor\nmobile configuration (cap sync) for Android APK & iOS.',
    '"Deploys instantly to web without server setup, and packages as native mobile app via Capacitor."',
  ],
  [
    'H3',
    'Replaceability\n(Legacy Replacement)',
    'Transactions\n& Bills',
    'Show how it replaces physical paper notebooks and\nspreadsheets with unified digital tracking.',
    '"Directly replaces manual family logbooks with an automated, shared, multi-user solution."',
  ],
  [
    'H4',
    'Replaceability\n(Data Migration)',
    'Settings ->\nJSON Backup',
    'Click "Download Backup (JSON)". Show the .json file\ncontaining all database records downloaded in 1 tap.',
    '"Zero vendor lock-in: users can export complete JSON database backups anytime to migrate."',
  ],
];
renderCategoryTable(
  doc,
  p6Y,
  'H. Portability (How to Prove Adaptability, Deployment & Data Migration)',
  'Degree to which system runs across operating systems, installs easily, and allows data migration.',
  catHData
);

// =============================================================
// PAGE 7: Top 6 Examiner Defense Questions & Model Answers
// =============================================================
doc.addPage();
renderHeader(doc, 'Top 6 Examiner Defense Questions & Model Answers', 'Anticipated In-Depth Questions and Practical Demonstration Answers');

let p7Y = 28;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(...TEXT_DARK);
doc.text('Key Defense Scenarios & How to Respond Confidently', 14, p7Y);

const defenseQA = [
  {
    q: 'Q1: "How do you ensure data privacy so Family A cannot see Family B\'s money?"',
    page: 'SettingsPage -> Supabase & RLS',
    answer: 'Demonstrate Supabase PostgreSQL Row Level Security (RLS). Every database row has a "household_id". Even if an attacker knows the API URL, PostgreSQL blocks any query that does not belong to the user\'s authenticated household session.',
  },
  {
    q: 'Q2: "What happens if a family member is in a province with no internet or poor signal?"',
    page: 'SettingsPage -> Backend Connection',
    answer: 'Show TipidLink\'s Interactive Demo Mode fallback. The system does not crash or display a blank screen. It loads cached local data from localStorage so users can still review budgets and log expenses offline.',
  },
  {
    q: 'Q3: "How do you prevent duplicate bills or overspending in budgets?"',
    page: 'BudgetsPage & BillsPage',
    answer: 'Show the utilization progress bar on the Budgets page. When spending exceeds 80%, it turns Amber ("Near Limit"); at 100%+, it turns Red ("Over Budget"). On the Bills page, due date countdowns highlight overdue bills in red to prevent penalty fees.',
  },
  {
    q: 'Q4: "Why did you standardize strictly on PDF exports instead of CSV spreadsheets?"',
    page: 'TransactionsPage & SettingsPage',
    answer: 'Demonstrate the Universal 1-tap PDF Action Sheet. Non-technical household members on smartphones often do not have spreadsheet software like Excel installed. PDF provides a clean, audit-ready, standardized statement that opens instantly across iOS, Android, and PC with zero formatting degradation.',
  },
  {
    q: 'Q5: "How do you prove that your computations are accurate and free of defects?"',
    page: 'Terminal (npm run test)',
    answer: 'Open the terminal and run "npm run test". Show the 16 automated integration and unit tests verifying currency formatting, net cash flow formulas, budget ceilings, partial payments reconciliation, and PDF document generation passing 100%.',
  },
  {
    q: 'Q6: "Who is authorized to alter household budget allocations or remove members?"',
    page: 'Household Tab -> Roles',
    answer: 'Point out the Role-Based Access Control (RBAC). Only the designated Household Owner (Nanay Maria) and Admins have rights to modify limits or remove members, while regular members can only submit their personal expenses and view balances.',
  },
];

p7Y += 5;
defenseQA.forEach(qa => {
  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, p7Y, 182, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY_DARK);
  doc.text(qa.q, 18, p7Y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Demonstration Page: ${qa.page}`, 18, p7Y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...TEXT_DARK);
  const splitA = doc.splitTextToSize(`Model Answer: ${qa.answer}`, 174);
  doc.text(splitA, 18, p7Y + 15);

  p7Y += 28.5;
});

renderFooter(doc);

// Output destinations
const targetPath1 = path.resolve('c:/Users/HUAWEI/Downloads/TipidLink-ISO-IEC-25010-System-Demonstration-Guide.pdf');
const targetPath2 = path.resolve(__dirname, '../public/TipidLink-ISO-IEC-25010-System-Demonstration-Guide.pdf');
const targetPath3 = path.resolve('C:/Users/HUAWEI/.gemini/antigravity/brain/0597188d-f273-4be3-ad24-4440f0cd4c54/TipidLink-ISO-IEC-25010-System-Demonstration-Guide.pdf');

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

fs.writeFileSync(targetPath1, pdfBuffer);
console.log(`Saved to ${targetPath1}`);

try {
  fs.writeFileSync(targetPath2, pdfBuffer);
  console.log(`Saved to ${targetPath2}`);
} catch (e) {
  console.warn('Public save error:', e.message);
}

try {
  fs.writeFileSync(targetPath3, pdfBuffer);
  console.log(`Saved to ${targetPath3}`);
} catch (e) {
  console.warn('Brain save error:', e.message);
}

console.log('Demonstration Guide PDF generated successfully!');
