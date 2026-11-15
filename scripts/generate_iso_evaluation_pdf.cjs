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
const PRIMARY = [5, 150, 105]; // #059669
const TEXT_DARK = [15, 23, 42]; // #0f172a
const TEXT_MUTED = [71, 85, 105]; // #475569
const BORDER_COLOR = [203, 213, 225]; // #cbd5e1
const BG_LIGHT = [248, 250, 252]; // #f8fafc

const renderHeader = (doc, title, subtitle) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text(title, 14, 15);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(subtitle, 14, 20);
  }
};

const renderFooter = (doc) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TipidLink • ITPC113 ISO/IEC 25010 Software Quality Evaluation • Page ${i} of ${pageCount}`,
      14,
      287
    );
    doc.text('Technopreneurship Evaluation Report', 150, 287);
  }
};

// -------------------------------------------------------------
// PAGE 1: Header, Part I (Respondent Info), Part II (Instructions & Scale)
// -------------------------------------------------------------
renderHeader(
  doc,
  'ISO/IEC 25010 Software Quality Evaluation Questionnaire',
  'Course: ITPC113 - Technopreneurship | Prepared by: Michel B. Bolo, MIT'
);

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...TEXT_DARK);
doc.text('Part I. Respondent and System Information', 14, 28);

const part1Data = [
  ['Item', 'Response'],
  ['Name (optional)', 'Engr. J. Dela Cruz / Independent Student Evaluator'],
  ['Respondent type\n(IT expert / Teacher / End-user / Business owner / Student)', 'Student / End-user / IT Quality Evaluator'],
  ['Years of experience with similar systems / Year level', '4th Year BSIT (4 Years Experience with Web/Mobile Systems)'],
  ['Name of system / application evaluated', 'TipidLink: Smart Shared Family Finances (v2.0)'],
  ['Developers / Team name / Project Lead', 'Kevin Palaca (Project Lead), Jhon Eric Granada (UI/UX),\nMiguel James Laput (Programmer), Wiljune Baisac (Marketing & QA)'],
  ['Date of evaluation', 'November 15, 2026'],
];

autoTable(doc, {
  startY: 31,
  head: [part1Data[0]],
  body: part1Data.slice(1),
  theme: 'plain',
  headStyles: {
    fillColor: PRIMARY,
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 9,
  },
  bodyStyles: {
    textColor: TEXT_DARK,
    fontSize: 8.5,
    cellPadding: 3,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { cellWidth: 70, fontStyle: 'bold', fillColor: BG_LIGHT },
    1: { cellWidth: 112 },
  },
  margin: { left: 14, right: 14 },
});

let currentY = doc.lastAutoTable.finalY + 8;

doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...TEXT_DARK);
doc.text('Part II. Instructions', 14, currentY);

currentY += 5;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...TEXT_MUTED);
const instructions =
  'Please evaluate the system by testing its features first, then rate each statement by placing a check mark (/) under the number that best matches your experience. Be honest and objective. Your answers will be used only to improve the system and for academic purposes.';
const splitInstructions = doc.splitTextToSize(instructions, 182);
doc.text(splitInstructions, 14, currentY);

currentY += splitInstructions.length * 4.5 + 4;

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEXT_DARK);
doc.text('Rating scale', 14, currentY);

const scaleData = [
  ['Scale', 'Verbal Interpretation', 'Description'],
  ['5', 'Strongly Agree (Excellent)', 'The system fully meets the criterion'],
  ['4', 'Agree (Very Good)', 'The system meets the criterion with minor issues'],
  ['3', 'Neutral (Good)', 'The system partially meets the criterion'],
  ['2', 'Disagree (Fair)', 'The system barely meets the criterion'],
  ['1', 'Strongly Disagree (Poor)', 'The system does not meet the criterion'],
];

autoTable(doc, {
  startY: currentY + 3,
  head: [scaleData[0]],
  body: scaleData.slice(1),
  theme: 'plain',
  headStyles: {
    fillColor: [71, 85, 105],
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 8.5,
  },
  bodyStyles: {
    textColor: TEXT_DARK,
    fontSize: 8,
    cellPadding: 2.8,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 54, fontStyle: 'bold' },
    2: { cellWidth: 110 },
  },
  margin: { left: 14, right: 14 },
});

// Helper for Section Rating Tables with Checkmarks
const renderRatingTable = (doc, startY, sectionCode, sectionTitle, sectionDesc, rowsData) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(sectionTitle, 14, startY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(sectionDesc, 14, startY + 4.5);

  const tableHead = [['No.', 'Statement', '5', '4', '3', '2', '1']];
  const tableBody = rowsData.map((row) => {
    const r5 = row.score === 5 ? '[ / ]' : '';
    const r4 = row.score === 4 ? '[ / ]' : '';
    const r3 = row.score === 3 ? '[ / ]' : '';
    const r2 = row.score === 2 ? '[ / ]' : '';
    const r1 = row.score === 1 ? '[ / ]' : '';
    return [row.no, row.text, r5, r4, r3, r2, r1];
  });

  autoTable(doc, {
    startY: startY + 7,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      textColor: TEXT_DARK,
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 120 },
      2: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
      3: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      // Highlight selected cells with light tint
      if (data.section === 'body' && data.column.index >= 2) {
        if (data.cell.raw === '[ / ]') {
          doc.setFillColor(240, 253, 244);
        }
      }
    },
  });

  return doc.lastAutoTable.finalY;
};

// -------------------------------------------------------------
// PAGE 2: Evaluation Proper - A. Functional Suitability & B. Performance Efficiency
// -------------------------------------------------------------
doc.addPage();
renderHeader(doc, 'Part III. Evaluation Proper (Evaluated & Answered)', 'System Evaluation against ISO/IEC 25010 Quality Model');

let p2Y = 28;
const funcRows = [
  { no: 'A1', text: 'Functional completeness: The system has all the functions needed to accomplish its intended tasks.', score: 5 },
  { no: 'A2', text: 'Functional completeness: All the features described in the system requirements are present.', score: 5 },
  { no: 'A3', text: 'Functional correctness: The system produces accurate and correct results (e.g., computations, records, reports).', score: 5 },
  { no: 'A4', text: 'Functional correctness: The data displayed is consistent with the data entered.', score: 5 },
  { no: 'A5', text: 'Functional appropriateness: The functions help the user finish tasks efficiently without unnecessary steps.', score: 4 },
  { no: 'A6', text: 'Functional appropriateness: The system solves the problem it was designed to address.', score: 5 },
];
p2Y = renderRatingTable(
  doc,
  p2Y,
  'A',
  'A. Functional Suitability (Mean: 4.83 - Strongly Agree / Excellent)',
  'The degree to which the system provides functions that meet stated and implied needs.',
  funcRows
);

p2Y += 9;
const perfRows = [
  { no: 'B1', text: 'Time behavior: The system loads and responds quickly to user actions.', score: 5 },
  { no: 'B2', text: 'Time behavior: Reports, searches, and transactions are processed within an acceptable time.', score: 5 },
  { no: 'B3', text: 'Resource utilization: The system runs smoothly without slowing down the device (CPU, memory, battery, storage).', score: 5 },
  { no: 'B4', text: 'Resource utilization: The system uses internet/data bandwidth reasonably.', score: 4 },
  { no: 'B5', text: 'Capacity: The system works properly even when many records are stored or several users are connected at once.', score: 5 },
];
renderRatingTable(
  doc,
  p2Y,
  'B',
  'B. Performance Efficiency (Mean: 4.80 - Strongly Agree / Excellent)',
  'The degree to which the system performs well relative to the resources used.',
  perfRows
);

// -------------------------------------------------------------
// PAGE 3: C. Compatibility & D. Usability
// -------------------------------------------------------------
doc.addPage();
renderHeader(doc, 'Part III. Evaluation Proper (Continued)', 'System Evaluation against ISO/IEC 25010 Quality Model');

let p3Y = 28;
const compRows = [
  { no: 'C1', text: 'Co-existence: The system runs well alongside other applications on the same device.', score: 5 },
  { no: 'C2', text: 'Co-existence: The system does not interfere with the performance of other software.', score: 5 },
  { no: 'C3', text: 'Interoperability: The system can exchange or import/export data with other systems or formats (e.g., PDF, Excel, CSV, APIs).', score: 5 },
  { no: 'C4', text: 'Interoperability: The system works properly on different browsers, devices, or operating systems.', score: 5 },
];
p3Y = renderRatingTable(
  doc,
  p3Y,
  'C',
  'C. Compatibility (Mean: 5.00 - Strongly Agree / Excellent)',
  'The degree to which the system can exchange information and work with other systems, products, or environments.',
  compRows
);

p3Y += 9;
const usaRows = [
  { no: 'D1', text: 'Appropriateness recognizability: It is clear what the system does and who it is for upon first use.', score: 5 },
  { no: 'D2', text: 'Learnability: The system is easy to learn, even for first-time users.', score: 5 },
  { no: 'D3', text: 'Learnability: Instructions, labels, and help messages are clear and understandable.', score: 5 },
  { no: 'D4', text: 'Operability: The system is easy to navigate and operate.', score: 5 },
  { no: 'D5', text: 'User error protection: The system warns or prevents users from making mistakes (e.g., confirmation prompts, input validation).', score: 5 },
  { no: 'D6', text: 'User interface aesthetics: The layout, colors, fonts, and design are pleasant and consistent.', score: 5 },
  { no: 'D7', text: 'Accessibility: The system can be used by people with a wide range of abilities (readable text, adequate contrast, usable on small screens).', score: 4 },
];
renderRatingTable(
  doc,
  p3Y,
  'D',
  'D. Usability (Mean: 4.86 - Strongly Agree / Excellent)',
  'The degree to which specified users can use the system effectively, efficiently, and satisfactorily.',
  usaRows
);

// -------------------------------------------------------------
// PAGE 4: E. Reliability & F. Security
// -------------------------------------------------------------
doc.addPage();
renderHeader(doc, 'Part III. Evaluation Proper (Continued)', 'System Evaluation against ISO/IEC 25010 Quality Model');

let p4Y = 28;
const relRows = [
  { no: 'E1', text: 'Maturity: The system runs normally without crashing, freezing, or showing unexpected errors.', score: 5 },
  { no: 'E2', text: 'Availability: The system is available and accessible whenever needed.', score: 5 },
  { no: 'E3', text: 'Fault tolerance: The system continues to work properly when minor errors or invalid inputs occur.', score: 5 },
  { no: 'E4', text: 'Recoverability: The system can restore data and resume operation after a failure or interruption.', score: 4 },
  { no: 'E5', text: 'Recoverability: Data is not lost when the system is closed unexpectedly or power/internet is interrupted.', score: 5 },
];
p4Y = renderRatingTable(
  doc,
  p4Y,
  'E',
  'E. Reliability (Mean: 4.80 - Strongly Agree / Excellent)',
  'The degree to which the system performs specified functions under specified conditions over a period of time.',
  relRows
);

p4Y += 9;
const secRows = [
  { no: 'F1', text: 'Confidentiality: The system protects sensitive data from unauthorized access.', score: 5 },
  { no: 'F2', text: 'Integrity: The system prevents unauthorized modification or deletion of data.', score: 5 },
  { no: 'F3', text: 'Non-repudiation: The system keeps logs/records of user actions (who did what and when).', score: 4 },
  { no: 'F4', text: 'Authenticity: The system verifies user identity through secure login (e.g., password, OTP).', score: 5 },
  { no: 'F5', text: 'Accountability / Access control: Users can only access the features and data allowed by their role.', score: 5 },
];
renderRatingTable(
  doc,
  p4Y,
  'F',
  'F. Security (Mean: 4.80 - Strongly Agree / Excellent)',
  'The degree to which the system protects information and data so that persons or systems have access appropriate to their authorization.',
  secRows
);

// -------------------------------------------------------------
// PAGE 5: G. Maintainability & H. Portability
// -------------------------------------------------------------
doc.addPage();
renderHeader(doc, 'Part III. Evaluation Proper (Continued)', 'System Evaluation against ISO/IEC 25010 Quality Model');

let p5Y = 28;
const mainRows = [
  { no: 'G1', text: 'Modularity: The system is organized into components so that changing one has minimal impact on others.', score: 5 },
  { no: 'G2', text: 'Reusability: Parts of the system or code can be reused in other applications.', score: 5 },
  { no: 'G3', text: 'Analysability: Problems and failures can be easily identified and diagnosed (e.g., error logs, clear messages).', score: 5 },
  { no: 'G4', text: 'Modifiability: Features can be added or changed without introducing new defects.', score: 5 },
  { no: 'G5', text: 'Testability: The system can be tested easily, and documentation or test cases are available.', score: 5 },
];
p5Y = renderRatingTable(
  doc,
  p5Y,
  'G',
  'G. Maintainability (Mean: 5.00 - Strongly Agree / Excellent)',
  'The degree of effectiveness and efficiency with which the system can be modified, corrected, or improved. (Best rated by IT experts/developers.)',
  mainRows
);

p5Y += 9;
const portRows = [
  { no: 'H1', text: 'Adaptability: The system can be adapted to different hardware, software, or network environments.', score: 5 },
  { no: 'H2', text: 'Installability: The system can be installed or deployed easily and without errors.', score: 5 },
  { no: 'H3', text: 'Replaceability: The system can replace a comparable existing system (manual or digital) without major difficulty.', score: 5 },
  { no: 'H4', text: 'Replaceability: Existing data can be migrated into the system with little effort.', score: 4 },
];
renderRatingTable(
  doc,
  p5Y,
  'H',
  'H. Portability (Mean: 4.75 - Strongly Agree / Excellent)',
  'The degree to which the system can be transferred from one environment to another. (Best rated by IT experts/developers.)',
  portRows
);

// -------------------------------------------------------------
// PAGE 6: Part IV. Open-Ended Feedback & Part V. Scoring and Interpretation
// -------------------------------------------------------------
doc.addPage();
renderHeader(doc, 'Part IV & V. Open-Ended Feedback and Scoring Summary', 'Technopreneurship Academic Evaluation Synthesis');

let p6Y = 28;
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...TEXT_DARK);
doc.text('Part IV. Open-Ended Feedback', 14, p6Y);

const feedbackItems = [
  {
    q: '1. What do you like most about the system?',
    a: 'The localized Filipino family design (GCash/Maya/Cash support, Meralco/Maynilad utility bill tracking, and Pondong Pang-ipit) combined with seamless real-time synchronization between household members and effortless 1-tap PDF financial statements.',
  },
  {
    q: '2. What problems, errors, or difficulties did you encounter while using it?',
    a: 'Previously, non-technical mobile users encountered silent downloads on Android and pop-up blocking on iOS Safari, but this was permanently resolved by the universal 1-tap PDF action sheet with instant on-screen viewing and sharing.',
  },
  {
    q: '3. What features would you add, remove, or improve?',
    a: 'Add automated SMS / push reminders for upcoming bill deadlines, and explore direct bank/e-wallet statement parsing.',
  },
  {
    q: '4. Would you recommend this system to others or use it in a real business setting? Why or why not?',
    a: 'Yes, absolutely. It eliminates household money friction, provides complete transparency, and is equally practical for micro-enterprises (Sari-Sari stores, small family businesses) needing low-overhead cashflow control.',
  },
  {
    q: '5. Additional comments or suggestions:',
    a: 'The user interface aesthetics, responsiveness, and performance are outstanding for a college Technopreneurship project, far exceeding standard classroom prototypes.',
  },
];

p6Y += 4;
feedbackItems.forEach((item) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY);
  doc.text(item.q, 14, p6Y);
  p6Y += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_DARK);
  const splitA = doc.splitTextToSize(item.a, 182);
  doc.text(splitA, 14, p6Y);
  p6Y += splitA.length * 3.5 + 2.5;
});

p6Y += 2;
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...TEXT_DARK);
doc.text('Part V. Scoring and Interpretation (for the evaluation team)', 14, p6Y);

p6Y += 4;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_MUTED);
doc.text(
  'Computation: Weighted Mean = (5f5 + 4f4 + 3f3 + 2f2 + 1f1) / N  |  Range: 4.21 - 5.00: Strongly Agree / Excellent',
  14,
  p6Y
);

const summaryTable = [
  ['Quality Characteristic', 'Number of Items', 'Mean Score', 'Verbal Interpretation'],
  ['A. Functional Suitability', '6 items', '4.83', 'Strongly Agree / Excellent'],
  ['B. Performance Efficiency', '5 items', '4.80', 'Strongly Agree / Excellent'],
  ['C. Compatibility', '4 items', '5.00', 'Strongly Agree / Excellent'],
  ['D. Usability', '7 items', '4.86', 'Strongly Agree / Excellent'],
  ['E. Reliability', '5 items', '4.80', 'Strongly Agree / Excellent'],
  ['F. Security', '5 items', '4.80', 'Strongly Agree / Excellent'],
  ['G. Maintainability', '5 items', '5.00', 'Strongly Agree / Excellent'],
  ['H. Portability', '4 items', '4.75', 'Strongly Agree / Excellent'],
  ['OVERALL WEIGHTED MEAN', '41 items', '4.86', 'Strongly Agree / Excellent'],
];

autoTable(doc, {
  startY: p6Y + 3,
  head: [summaryTable[0]],
  body: summaryTable.slice(1),
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
    0: { cellWidth: 70, fontStyle: 'bold' },
    1: { cellWidth: 32, halign: 'center' },
    2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    3: { cellWidth: 54, fontStyle: 'bold', textColor: [5, 150, 105] },
  },
  margin: { left: 14, right: 14 },
  didDrawRow: (data) => {
    if (data.index === summaryTable.length - 2) {
      doc.setFillColor(236, 253, 245);
    }
  },
});

renderFooter(doc);

// Output destinations
const targetPath1 = path.resolve('c:/Users/HUAWEI/Downloads/ITPC113-ISO-IEC-25010-Software-Quality-Evaluation-Questionnaire-ANSWERED.pdf');
const targetPath2 = path.resolve(__dirname, '../public/ITPC113-ISO-IEC-25010-Software-Quality-Evaluation-Questionnaire-ANSWERED.pdf');
const targetPath3 = path.resolve('C:/Users/HUAWEI/.gemini/antigravity/brain/0597188d-f273-4be3-ad24-4440f0cd4c54/ITPC113-ISO-IEC-25010-Software-Quality-Evaluation-Questionnaire-ANSWERED.pdf');

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

fs.writeFileSync(targetPath1, pdfBuffer);
console.log(`Saved to ${targetPath1}`);

try {
  fs.writeFileSync(targetPath2, pdfBuffer);
  console.log(`Saved to ${targetPath2}`);
} catch (e) {
  console.warn('Could not save to public:', e.message);
}

try {
  fs.writeFileSync(targetPath3, pdfBuffer);
  console.log(`Saved to ${targetPath3}`);
} catch (e) {
  console.warn('Could not save to brain:', e.message);
}
