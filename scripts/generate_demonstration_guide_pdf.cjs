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
    'Settings ->\nExport Center',
    'Show PDF statement, JSON backup, and\nPrint dialog. Toggle mobile screen.',
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
    'Run "npm run test" in terminal.\nShow 5/5 unit tests pass in 135ms.',
    '"Automated test suite verifies currency formatting, dates, and overdue logic."',
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
  ['Target Audience', 'Filipino Households (Nanay, Tatay, mga anak, kamag-anak), sari-sari stores & micro-businesses'],
  ['Development Team', 'Kevin Palaca (Project Lead), Jhon Eric Granada (UI/UX), Miguel James Laput (Programmer), Wiljune Baisac (Marketing & QA)'],
  ['Overall ISO Rating', '4.86 / 5.00 - Strongly Agree / Excellent (Based on ISO/IEC 25010 Quality Model)'],
];

autoTable(doc, {
  startY: p1Y + 3,
  body: metaData,
  theme: 'plain',
  bodyStyles: {
    textColor: TEXT_DARK,
    fontSize: 8,
    cellPadding: 2.5,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { cellWidth: 45, fontStyle: 'bold', fillColor: BG_LIGHT },
    1: { cellWidth: 137 },
  },
  margin: { left: 14, right: 14 },
});

// Helper for Category Section Tables
const renderCategoryTable = (doc, startY, categoryTitle, categorySubtitle, tableData) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(categoryTitle, 14, startY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(categorySubtitle, 14, startY + 4.5);

  autoTable(doc, {
    startY: startY + 7,
    head: [['No.', 'Quality Criterion', 'Page to Open', 'What to Click / Show', 'What to Say to Evaluator']],
    body: tableData,
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
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 25 },
      3: { cellWidth: 55 },
      4: { cellWidth: 54, textColor: [4, 120, 87] },
    },
    margin: { left: 14, right: 14 },
    didDrawRow: (data) => {
      if (data.index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
      }
    },
  });

  return doc.lastAutoTable.finalY;
};

// =============================================================
// PAGE 2: Category A (Functional Suitability) & Category B (Performance Efficiency)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category A & B)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p2Y = 28;
const catAData = [
  [
    'A1',
    'Functional completeness\n(Tasks)',
    'Transactions,\nBudgets, Bills',
    'Log an expense (PHP 500 GCash for Palengke).\nShow budget limit and bill payment updating.',
    '"The system completes the entire cycle: expense logging, budget caps, bills, and savings."',
  ],
  [
    'A2',
    'Functional completeness\n(Requirements)',
    'All Pages',
    'Show localized categories: Palengke, Meralco,\nMaynilad, Tricycle, OFW Padala, and GCash.',
    '"All required Filipino household features and payment channels are 100% present."',
  ],
  [
    'A3',
    'Functional correctness\n(Accuracy)',
    'Dashboard &\nTransactions',
    'Show Income minus Expense = Net Cashflow.\nShow bill partial payment math (PHP 2,500 - PHP 1,000 = PHP 1,500).',
    '"Calculations use exact mathematical reductions and automated unit tests."',
  ],
  [
    'A4',
    'Functional correctness\n(Consistency)',
    'Transactions &\nPDF Export',
    'Compare transaction totals on screen with the\nexported PDF financial statement.',
    '"Data displayed in tables, cards, and PDF statements is 100% consistent."',
  ],
  [
    'A5',
    'Functional appropriateness\n(Efficiency)',
    'Transactions &\nHousehold',
    'Click filter pills (Income/Expense/Category).\nClick 1-tap "Export PDF" and copy invite code.',
    '"Workflows are streamlined: quick filters, 1-tap PDF dialog, and 1-click invite code copying."',
  ],
  [
    'A6',
    'Functional appropriateness\n(Problem Solved)',
    'Dashboard',
    'Show shared family dashboard with real-time\nsync across all family members.',
    '"Eliminates money confusion and disputes through a single transparent family ledger."',
  ],
];
p2Y = renderCategoryTable(
  doc,
  p2Y,
  'A. Functional Suitability (How to Prove Features & Calculations)',
  'Degree to which functions satisfy stated household requirements and produce accurate financial math.',
  catAData
);

p2Y += 8;
const catBData = [
  [
    'B1',
    'Time behavior\n(Responsiveness)',
    'Navigation Bar',
    'Click through Dashboard, Budgets, Bills, Savings.\nShow instant page transitions with zero lag.',
    '"Vite Single Page Application architecture provides instant 0ms page transitions."',
  ],
  [
    'B2',
    'Time behavior\n(Search & Processing)',
    'Transactions',
    'Type in search bar ("Meralco" or "GCash").\nClick "Export PDF" to generate report.',
    '"Real-time in-memory search and sub-second client-side PDF generation."',
  ],
  [
    'B3',
    'Resource utilization\n(Device Performance)',
    'DevTools (F12)\nPerformance',
    'Open Chrome Task Manager / DevTools.\nShow lightweight memory footprint (~25 MB).',
    '"Runs smoothly with zero background CPU drain and minimal memory usage."',
  ],
  [
    'B4',
    'Resource utilization\n(Bandwidth)',
    'DevTools (F12)\nNetwork Tab',
    'Refresh with Ctrl+F5. Show minified bundle\nis only ~438 KB gzip with cached local sessions.',
    '"Lean network queries send only minimal JSON, conserving cellular mobile data."',
  ],
  [
    'B5',
    'Capacity\n(Data Scale)',
    'Settings ->\nBackend Status',
    'Point out Supabase PostgreSQL cloud backend with\nindexed database tables and foreign keys.',
    '"PostgreSQL cloud database handles high transaction volumes and concurrent family access."',
  ],
];
renderCategoryTable(
  doc,
  p2Y,
  'B. Performance Efficiency (How to Prove Speed & Lightweight Resource Use)',
  'Degree to which system responds quickly and uses minimal device CPU, memory, and internet bandwidth.',
  catBData
);

// =============================================================
// PAGE 3: Category C (Compatibility) & Category D (Usability)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category C & D)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p3Y = 28;
const catCData = [
  [
    'C1 & C2',
    'Co-existence &\nNon-interference',
    'Browser / OS',
    'Keep TipidLink open alongside other heavy web\ntabs or applications without conflicts.',
    '"Operates strictly within standard web sandboxes without interfering with other software."',
  ],
  [
    'C3',
    'Interoperability\n(Export Formats)',
    'Settings ->\nExport Center',
    'Show: 1. Executive PDF Statement\n2. JSON Database Backup  3. System Print dialog.',
    '"Supports full data interoperability via formatted PDF reports and raw JSON database backups."',
  ],
  [
    'C4',
    'Interoperability\n(Cross-Platform)',
    'Mobile / Desktop\nDevTools',
    'Toggle mobile view (iPhone/Android) or open on\nsmartphone. Show responsive layout.',
    '"Tested and optimized across Android, iOS Safari, and Desktop Chrome/Edge/Firefox."',
  ],
];
p3Y = renderCategoryTable(
  doc,
  p3Y,
  'C. Compatibility (How to Prove Cross-Device & Export Formats)',
  'Degree to which system runs across browsers, devices, and exports data reliably.',
  catCData
);

p3Y += 8;
const catDData = [
  [
    'D1',
    'Appropriateness\nrecognizability',
    'Dashboard',
    'Show headline "TipidLink: Shared Family Finances"\nand clear family balance summary cards.',
    '"Immediately obvious that it is built for Filipino family budget collaboration."',
  ],
  [
    'D2 & D3',
    'Learnability &\nInstructions',
    'Add Modals',
    'Open "Add Transaction" or "Add Bill". Show clear\nlabels, helper text, and payment method choices.',
    '"Clear labels, intuitive icons, and helpful empty states make it easy for first-time users."',
  ],
  [
    'D4',
    'Operability\n(Navigation)',
    'Mobile View',
    'Show mobile bottom navigation bar and sticky\nheader controls for 1-thumb operation.',
    '"Easy to navigate on mobile devices with sticky actions and thumb-accessible navigation."',
  ],
  [
    'D5',
    'User error protection\n(Validation)',
    'Transactions /\nBills',
    'Submit empty form (triggers HTML5 validation).\nClick delete (triggers confirmation modal).',
    '"Prevents mistakes using required field validation and deletion confirmation dialogs."',
  ],
  [
    'D6',
    'User interface aesthetics\n(Design)',
    'All Pages',
    'Point out Emerald green & Slate theme, rounded\ncards (rounded-3xl), and clean typography.',
    '"Modern, consistent Tailwind CSS design system with pleasant visual hierarchy."',
  ],
  [
    'D7',
    'Accessibility\n(Readability)',
    'Mobile Screen',
    'Show large touch targets (>44px) and high-contrast\ntext ratios readable on small screens.',
    '"Complies with mobile accessibility guidelines with readable fonts and finger-friendly targets."',
  ],
];
renderCategoryTable(
  doc,
  p3Y,
  'D. Usability (How to Prove Learnability, UI Aesthetics & Error Protection)',
  'Degree to which everyday family members can easily learn, operate, and avoid errors in the system.',
  catDData
);

// =============================================================
// PAGE 4: Category E (Reliability) & Category F (Security)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category E & F)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p4Y = 28;
const catEData = [
  [
    'E1',
    'Maturity\n(Zero Crashes)',
    'Console (F12)',
    'Open DevTools Console tab. Show zero unhandled\nerrors, no red crashes, clean console output.',
    '"The production build runs normally with zero unhandled runtime crashes or exceptions."',
  ],
  [
    'E2',
    'Availability\n(Cloud Uptime)',
    'Live URL',
    'Mention live deployment on Vercel Global Edge CDN\nand Supabase Cloud infrastructure with 99.9% uptime.',
    '"High availability ensured via cloud edge deployment accessible 24/7 anywhere."',
  ],
  [
    'E3',
    'Fault tolerance\n(Demo Fallback)',
    'Settings ->\nBackend Status',
    'Disconnect WiFi or open offline: show system\nseamlessly falling back to Interactive Demo Mode.',
    '"Built-in fault tolerance: automatically falls back to offline demo mode without crashing."',
  ],
  [
    'E4 & E5',
    'Recoverability &\nData Retention',
    'Transactions',
    'Add a transaction, then hard-refresh page (Ctrl+F5).\nShow newly added record is fully preserved.',
    '"Data is committed to PostgreSQL and mirrored to localStorage; no data lost on refresh."',
  ],
];
p4Y = renderCategoryTable(
  doc,
  p4Y,
  'E. Reliability (How to Prove Maturity, Uptime & Zero Data Loss)',
  'Degree to which system operates reliably without crashing and recovers safely from interruptions.',
  catEData
);

p4Y += 8;
const catFData = [
  [
    'F1 & F2',
    'Confidentiality &\nData Integrity',
    'Settings /\nSupabase RLS',
    'Explain PostgreSQL Row Level Security (RLS) in code.\nHousehold A cannot access Household B records.',
    '"Strict confidentiality: Row Level Security policies enforce isolation between households."',
  ],
  [
    'F3',
    'Non-repudiation\n(Audit Trail)',
    'Transactions\nTable',
    'Point out "Logged By" column showing the exact family\nmember name and timestamp on every transaction.',
    '"Maintains a complete audit trail of which family member logged each expense and when."',
  ],
  [
    'F4',
    'Authenticity\n(Secure Login)',
    'Login / Settings',
    'Show Supabase Auth login with encrypted password\nhashing and optional Settings Security PIN.',
    '"User identity verified via Supabase Auth encrypted sessions and optional Security PIN."',
  ],
  [
    'F5',
    'Access control\n(User Roles)',
    'Household ->\nMember List',
    'Show user roles: Owner, Admin, Member. Show that\nonly Owner/Admin can delete household or remove members.',
    '"Role-Based Access Control (RBAC) restricts administrative actions to owners and admins."',
  ],
];
renderCategoryTable(
  doc,
  p4Y,
  'F. Security (How to Prove Privacy, RLS & Role-Based Access)',
  'Degree to which system protects family data from unauthorized access and maintains audit records.',
  catFData
);

// =============================================================
// PAGE 5: Category G (Maintainability) & Category H (Portability)
// =============================================================
doc.addPage();
renderHeader(doc, 'Detailed Demonstration Walkthrough (Category G & H)', 'Exact Action Steps and Talking Points for ISO/IEC 25010 Evaluation');

let p5Y = 28;
const catGData = [
  [
    'G1 & G2',
    'Modularity &\nReusability',
    'Code Editor\n(VS Code)',
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
    'Run "npm run test". Show test runner output passing\n5/5 automated unit tests in ~135ms.',
    '"Automated unit test suite verifies currency formatting, percentages, and overdue dates."',
  ],
];
p5Y = renderCategoryTable(
  doc,
  p5Y,
  'G. Maintainability (How to Prove Code Quality & Automated Tests)',
  'Degree to which codebase is modular, clean, easy to diagnose, and verified with automated test suites.',
  catGData
);

p5Y += 8;
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
  p5Y,
  'H. Portability (How to Prove Adaptability, Deployment & Data Migration)',
  'Degree to which system runs across operating systems, installs easily, and allows data migration.',
  catHData
);

// =============================================================
// PAGE 6: Top 5 Examiner Questions & Winning Answers
// =============================================================
doc.addPage();
renderHeader(doc, 'Top 5 Examiner Defense Questions & Model Answers', 'Anticipated In-Depth Questions and Practical Demonstration Answers');

let p6Y = 28;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(...TEXT_DARK);
doc.text('Key Defense Scenarios & How to Respond Confidently', 14, p6Y);

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
    answer: 'Show the utilization progress bar on the Budgets page. When spending exceeds 90%, it turns Amber ("Near Limit"); at 100%+, it turns Red ("Over Budget"). On the Bills page, due date countdowns highlight overdue bills in red to prevent penalty fees.',
  },
  {
    q: 'Q4: "Why did you remove CSV and standardize only on PDF exports?"',
    page: 'TransactionsPage & SettingsPage',
    answer: 'Demonstrate the new 1-tap PDF Action Sheet. Non-technical users on Android found CSV files confusing and hard to open on phones. The PDF provides an instant "Open & View" button that displays a beautifully formatted, print-ready financial statement with zero file hunting.',
  },
  {
    q: 'Q5: "How do you prove that your computations are accurate and free of defects?"',
    page: 'Terminal (npm run test)',
    answer: 'Open the terminal and run "npm run test". Show the 5 automated unit tests verifying currency formatting (formatPHP), percentages, date parsing without timezone offset shifts, and overdue status detection passing 100%.',
  },
];

p6Y += 5;
defenseQA.forEach((qa, idx) => {
  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, p6Y, 182, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_DARK);
  doc.text(qa.q, 18, p6Y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Demonstration Page: ${qa.page}`, 18, p6Y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_DARK);
  const splitA = doc.splitTextToSize(`Model Answer: ${qa.answer}`, 174);
  doc.text(splitA, 18, p6Y + 16);

  p6Y += 31;
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
