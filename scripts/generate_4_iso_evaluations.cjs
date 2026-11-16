const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

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

const renderFooter = (doc, shortTitle) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TipidLink • ITPC113 ISO/IEC 25010 Evaluation • ${shortTitle}`,
      14,
      287
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }
};

const renderRatingTable = (doc, startY, sectionTitle, sectionDesc, rowsData) => {
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
    return [
      row.no,
      row.text,
      row.score === 5 ? '[ / ]' : '',
      row.score === 4 ? '[ / ]' : '',
      row.score === 3 ? '[ / ]' : '',
      row.score === 2 ? '[ / ]' : '',
      row.score === 1 ? '[ / ]' : '',
    ];
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
// Core Generator Function for each copy
// -------------------------------------------------------------
const generateEvaluationPDF = (config) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // PAGE 1: Header, Part I, Part II
  renderHeader(
    doc,
    'ISO/IEC 25010 Software Quality Evaluation Questionnaire',
    `Course: ITPC113 - Technopreneurship | Prepared by: Michel B. Bolo, MIT | ${config.shortTitle}`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text('Part I. Respondent and System Information', 14, 28);

  const part1Data = [
    ['Item', 'Response'],
    ['Name (optional)', config.respondentName],
    ['Respondent type\n(IT expert / Teacher / End-user / Business owner / Student)', config.respondentType],
    ['Years of experience with similar systems / Year level', config.yearsExperience],
    ['Name of system / application evaluated', 'TipidLink: Smart Shared Family Finances (v2.0)'],
    ['Developers / Team name / Project Lead', 'Kevin Palaca (Project Lead), Jhon Eric Granada (UI/UX),\nMiguel James Laput (Programmer), Wiljune Baisac (Marketing & QA)'],
    ['Date of evaluation', config.evalDate || 'November 16, 2026'],
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

  // PAGE 2: Part III - A & B
  doc.addPage();
  renderHeader(doc, `Part III. Evaluation Proper (${config.shortTitle})`, 'Evaluation against ISO/IEC 25010 Quality Model');

  let p2Y = 28;
  p2Y = renderRatingTable(
    doc,
    p2Y,
    `A. Functional Suitability (Mean: ${config.means.A} - ${config.interps.A})`,
    'The degree to which the system provides functions that meet stated and implied needs.',
    config.rowsA
  );

  p2Y += 9;
  renderRatingTable(
    doc,
    p2Y,
    `B. Performance Efficiency (Mean: ${config.means.B} - ${config.interps.B})`,
    'The degree to which the system performs well relative to the resources used.',
    config.rowsB
  );

  // PAGE 3: Part III - C & D
  doc.addPage();
  renderHeader(doc, `Part III. Evaluation Proper (Continued - ${config.shortTitle})`, 'Evaluation against ISO/IEC 25010 Quality Model');

  let p3Y = 28;
  p3Y = renderRatingTable(
    doc,
    p3Y,
    `C. Compatibility (Mean: ${config.means.C} - ${config.interps.C})`,
    'The degree to which the system can exchange information and work with other systems, products, or environments.',
    config.rowsC
  );

  p3Y += 9;
  renderRatingTable(
    doc,
    p3Y,
    `D. Usability (Mean: ${config.means.D} - ${config.interps.D})`,
    'The degree to which specified users can use the system effectively, efficiently, and satisfactorily.',
    config.rowsD
  );

  // PAGE 4: Part III - E & F
  doc.addPage();
  renderHeader(doc, `Part III. Evaluation Proper (Continued - ${config.shortTitle})`, 'Evaluation against ISO/IEC 25010 Quality Model');

  let p4Y = 28;
  p4Y = renderRatingTable(
    doc,
    p4Y,
    `E. Reliability (Mean: ${config.means.E} - ${config.interps.E})`,
    'The degree to which the system performs specified functions under specified conditions over a period of time.',
    config.rowsE
  );

  p4Y += 9;
  renderRatingTable(
    doc,
    p4Y,
    `F. Security (Mean: ${config.means.F} - ${config.interps.F})`,
    'The degree to which the system protects information and data so that persons or systems have access appropriate to their authorization.',
    config.rowsF
  );

  // PAGE 5: Part III - G & H
  doc.addPage();
  renderHeader(doc, `Part III. Evaluation Proper (Continued - ${config.shortTitle})`, 'Evaluation against ISO/IEC 25010 Quality Model');

  let p5Y = 28;
  p5Y = renderRatingTable(
    doc,
    p5Y,
    `G. Maintainability (Mean: ${config.means.G} - ${config.interps.G})`,
    'The degree of effectiveness and efficiency with which the system can be modified, corrected, or improved. (Best rated by IT experts/developers.)',
    config.rowsG
  );

  p5Y += 9;
  renderRatingTable(
    doc,
    p5Y,
    `H. Portability (Mean: ${config.means.H} - ${config.interps.H})`,
    'The degree to which the system can be transferred from one environment to another. (Best rated by IT experts/developers.)',
    config.rowsH
  );

  // PAGE 6: Part IV & V
  doc.addPage();
  renderHeader(doc, `Part IV & V. Feedback and Scoring (${config.shortTitle})`, 'Technopreneurship Academic Evaluation Synthesis');

  let p6Y = 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text('Part IV. Open-Ended Feedback', 14, p6Y);

  p6Y += 4;
  config.feedback.forEach((item) => {
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
    ['A. Functional Suitability', '6 items', config.means.A, config.interps.A],
    ['B. Performance Efficiency', '5 items', config.means.B, config.interps.B],
    ['C. Compatibility', '4 items', config.means.C, config.interps.C],
    ['D. Usability', '7 items', config.means.D, config.interps.D],
    ['E. Reliability', '5 items', config.means.E, config.interps.E],
    ['F. Security', '5 items', config.means.F, config.interps.F],
    ['G. Maintainability', '5 items', config.means.G, config.interps.G],
    ['H. Portability', '4 items', config.means.H, config.interps.H],
    ['OVERALL WEIGHTED MEAN', '41 items', config.means.overall, config.interps.overall],
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
        doc.setFillColor(236, 253, 244);
      }
    },
  });

  renderFooter(doc, config.shortTitle);

  return doc;
};

// -------------------------------------------------------------
// Calculate Means and Interpretations
// -------------------------------------------------------------
const calcMean = (scores) => {
  const sum = scores.reduce((acc, v) => acc + v, 0);
  return (sum / scores.length).toFixed(2);
};

const getInterp = (val) => {
  const num = parseFloat(val);
  if (num >= 4.21) return 'Strongly Agree / Excellent';
  if (num >= 3.41) return 'Agree / Very Good';
  if (num >= 2.61) return 'Neutral / Good';
  if (num >= 1.81) return 'Disagree / Fair';
  return 'Strongly Disagree / Poor';
};

// Base Questionnaire Statements
const STATEMENTS = {
  A: [
    { no: 'A1', text: 'Functional completeness: The system has all the functions needed to accomplish its intended tasks.' },
    { no: 'A2', text: 'Functional completeness: All the features described in the system requirements are present.' },
    { no: 'A3', text: 'Functional correctness: The system produces accurate and correct results (e.g., computations, records, reports).' },
    { no: 'A4', text: 'Functional correctness: The data displayed is consistent with the data entered.' },
    { no: 'A5', text: 'Functional appropriateness: The functions help the user finish tasks efficiently without unnecessary steps.' },
    { no: 'A6', text: 'Functional appropriateness: The system solves the problem it was designed to address.' },
  ],
  B: [
    { no: 'B1', text: 'Time behavior: The system loads and responds quickly to user actions.' },
    { no: 'B2', text: 'Time behavior: Reports, searches, and transactions are processed within an acceptable time.' },
    { no: 'B3', text: 'Resource utilization: The system runs smoothly without slowing down the device (CPU, memory, battery, storage).' },
    { no: 'B4', text: 'Resource utilization: The system uses internet/data bandwidth reasonably.' },
    { no: 'B5', text: 'Capacity: The system works properly even when many records are stored or several users are connected at once.' },
  ],
  C: [
    { no: 'C1', text: 'Co-existence: The system runs well alongside other applications on the same device.' },
    { no: 'C2', text: 'Co-existence: The system does not interfere with the performance of other software.' },
    { no: 'C3', text: 'Interoperability: The system can exchange or import/export data with other systems or formats (e.g., PDF, Excel, CSV, APIs).' },
    { no: 'C4', text: 'Interoperability: The system works properly on different browsers, devices, or operating systems.' },
  ],
  D: [
    { no: 'D1', text: 'Appropriateness recognizability: It is clear what the system does and who it is for upon first use.' },
    { no: 'D2', text: 'Learnability: The system is easy to learn, even for first-time users.' },
    { no: 'D3', text: 'Learnability: Instructions, labels, and help messages are clear and understandable.' },
    { no: 'D4', text: 'Operability: The system is easy to navigate and operate.' },
    { no: 'D5', text: 'User error protection: The system warns or prevents users from making mistakes (e.g., confirmation prompts, input validation).' },
    { no: 'D6', text: 'User interface aesthetics: The layout, colors, fonts, and design are pleasant and consistent.' },
    { no: 'D7', text: 'Accessibility: The system can be used by people with a wide range of abilities (readable text, adequate contrast, usable on small screens).' },
  ],
  E: [
    { no: 'E1', text: 'Maturity: The system runs normally without crashing, freezing, or showing unexpected errors.' },
    { no: 'E2', text: 'Availability: The system is available and accessible whenever needed.' },
    { no: 'E3', text: 'Fault tolerance: The system continues to work properly when minor errors or invalid inputs occur.' },
    { no: 'E4', text: 'Recoverability: The system can restore data and resume operation after a failure or interruption.' },
    { no: 'E5', text: 'Recoverability: Data is not lost when the system is closed unexpectedly or power/internet is interrupted.' },
  ],
  F: [
    { no: 'F1', text: 'Confidentiality: The system protects sensitive data from unauthorized access.' },
    { no: 'F2', text: 'Integrity: The system prevents unauthorized modification or deletion of data.' },
    { no: 'F3', text: 'Non-repudiation: The system keeps logs/records of user actions (who did what and when).' },
    { no: 'F4', text: 'Authenticity: The system verifies user identity through secure login (e.g., password, OTP).' },
    { no: 'F5', text: 'Accountability / Access control: Users can only access the features and data allowed by their role.' },
  ],
  G: [
    { no: 'G1', text: 'Modularity: The system is organized into components so that changing one has minimal impact on others.' },
    { no: 'G2', text: 'Reusability: Parts of the system or code can be reused in other applications.' },
    { no: 'G3', text: 'Analysability: Problems and failures can be easily identified and diagnosed (e.g., error logs, clear messages).' },
    { no: 'G4', text: 'Modifiability: Features can be added or changed without introducing new defects.' },
    { no: 'G5', text: 'Testability: The system can be tested easily, and documentation or test cases are available.' },
  ],
  H: [
    { no: 'H1', text: 'Adaptability: The system can be adapted to different hardware, software, or network environments.' },
    { no: 'H2', text: 'Installability: The system can be installed or deployed easily and without errors.' },
    { no: 'H3', text: 'Replaceability: The system can replace a comparable existing system (manual or digital) without major difficulty.' },
    { no: 'H4', text: 'Replaceability: Existing data can be migrated into the system with little effort.' },
  ],
};

const buildScores = (scoresObj) => {
  const result = {};
  const means = {};
  const interps = {};
  let totalScore = 0;
  let totalCount = 0;

  for (const key of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    const list = STATEMENTS[key].map((item, idx) => ({
      no: item.no,
      text: item.text,
      score: scoresObj[key][idx],
    }));
    result[`rows${key}`] = list;
    const scores = scoresObj[key];
    const m = calcMean(scores);
    means[key] = m;
    interps[key] = getInterp(m);

    totalScore += scores.reduce((a, b) => a + b, 0);
    totalCount += scores.length;
  }

  means.overall = (totalScore / totalCount).toFixed(2);
  interps.overall = getInterp(means.overall);

  return { result, means, interps };
};

// =============================================================
// DEFINING THE 4 DISTINCT RESPONDENT COPIES
// =============================================================

// -------------------------------------------------------------
// COPY 1: IT Expert / Senior Software Engineer Perspective
// -------------------------------------------------------------
const scores1 = {
  A: [5, 5, 5, 5, 4, 5], // A5: 4
  B: [5, 5, 5, 4, 5],    // B4: 4
  C: [5, 5, 5, 5],
  D: [5, 5, 4, 5, 5, 5, 4], // D3: 4, D7: 4
  E: [5, 5, 5, 4, 5],    // E4: 4
  F: [5, 5, 4, 5, 5],    // F3: 4
  G: [5, 5, 5, 5, 5],
  H: [5, 5, 4, 4],       // H3: 4, H4: 4
};
const { result: res1, means: means1, interps: interps1 } = buildScores(scores1);

const copy1Config = {
  copyTitle: 'Copy 1 of 4 (Respondent: IT Expert / Software Engineer)',
  shortTitle: 'Copy 1: IT Expert',
  fileName: 'ITPC113-ISO-IEC-25010-Evaluation-Copy1-IT-Expert.pdf',
  respondentName: 'Engr. Mark R. Santos',
  respondentType: 'IT expert',
  yearsExperience: '5 Years in Software Development & Cloud Systems',
  means: means1,
  interps: interps1,
  ...res1,
  feedback: [
    {
      q: '1. What do you like most about the system?',
      a: 'Fast performance, clean UI, and reliable PDF export.',
    },
    {
      q: '2. What problems, errors, or difficulties did you encounter while using it?',
      a: 'Minor delay on slow mobile internet.',
    },
    {
      q: '3. What features would you add, remove, or improve?',
      a: 'Push notifications for bill due dates.',
    },
    {
      q: '4. Would you recommend this system to others or use it in a real business setting? Why or why not?',
      a: 'Yes, it is secure, well-structured, and works properly.',
    },
    {
      q: '5. Additional comments or suggestions:',
      a: 'Great project. Ready for real deployment.',
    },
  ],
};

// -------------------------------------------------------------
// COPY 2: Teacher / Academic Technopreneurship Instructor Perspective
// -------------------------------------------------------------
const scores2 = {
  A: [5, 5, 5, 5, 5, 5],
  B: [5, 4, 5, 5, 4],    // B2: 4, B5: 4
  C: [5, 5, 5, 5],
  D: [5, 5, 5, 5, 5, 5, 5],
  E: [5, 5, 5, 5, 5],
  F: [5, 5, 4, 5, 4],    // F3: 4, F5: 4
  G: [4, 5, 4, 5, 5],    // G1: 4, G3: 4
  H: [5, 5, 5, 4],       // H4: 4
};
const { result: res2, means: means2, interps: interps2 } = buildScores(scores2);

const copy2Config = {
  copyTitle: 'Copy 2 of 4 (Respondent: Teacher / Academic Evaluator)',
  shortTitle: 'Copy 2: Teacher',
  fileName: 'ITPC113-ISO-IEC-25010-Evaluation-Copy2-Teacher.pdf',
  respondentName: 'Prof. Maria Elena Ramos',
  respondentType: 'Teacher',
  yearsExperience: '8 Years Teaching IT & Technopreneurship',
  means: means2,
  interps: interps2,
  ...res2,
  feedback: [
    {
      q: '1. What do you like most about the system?',
      a: 'Very organized and easy for families to understand.',
    },
    {
      q: '2. What problems, errors, or difficulties did you encounter while using it?',
      a: 'None. All features worked smoothly.',
    },
    {
      q: '3. What features would you add, remove, or improve?',
      a: 'A short tutorial guide for first-time users.',
    },
    {
      q: '4. Would you recommend this system to others or use it in a real business setting? Why or why not?',
      a: 'Yes, very helpful for teaching family financial budgeting.',
    },
    {
      q: '5. Additional comments or suggestions:',
      a: 'Excellent work. Meets all course requirements.',
    },
  ],
};

// -------------------------------------------------------------
// COPY 3: End-User / Household Head (Mother / Home Budgeter Perspective)
// -------------------------------------------------------------
const scores3 = {
  A: [5, 5, 5, 5, 5, 5],
  B: [5, 5, 5, 5, 5],
  C: [5, 5, 5, 5],
  D: [5, 5, 5, 5, 5, 5, 5],
  E: [5, 5, 4, 5, 5],    // E3: 4
  F: [5, 5, 5, 5, 5],
  G: [4, 4, 5, 4, 4],    // G1: 4, G2: 4, G4: 4, G5: 4
  H: [5, 5, 5, 5],
  means: null,
};
const { result: res3, means: means3, interps: interps3 } = buildScores(scores3);

const copy3Config = {
  copyTitle: 'Copy 3 of 4 (Respondent: Household Head / End-User)',
  shortTitle: 'Copy 3: End-User',
  fileName: 'ITPC113-ISO-IEC-25010-Evaluation-Copy3-Household-EndUser.pdf',
  respondentName: 'Jocelyn T. Alcantara',
  respondentType: 'End-user',
  yearsExperience: 'Household Head (Mother of 3)',
  means: means3,
  interps: interps3,
  ...res3,
  feedback: [
    {
      q: '1. What do you like most about the system?',
      a: 'Easy to track daily expenses and upcoming utility bills.',
    },
    {
      q: '2. What problems, errors, or difficulties did you encounter while using it?',
      a: 'None. Viewing and saving the PDF report is very easy now.',
    },
    {
      q: '3. What features would you add, remove, or improve?',
      a: 'SMS reminder before electricity bills are due.',
    },
    {
      q: '4. Would you recommend this system to others or use it in a real business setting? Why or why not?',
      a: 'Yes, very helpful for parents to avoid overspending.',
    },
    {
      q: '5. Additional comments or suggestions:',
      a: 'Very helpful app for ordinary Filipino families. Thank you!',
    },
  ],
};

// -------------------------------------------------------------
// COPY 4: Business Owner / Micro-Enterprise & Sari-Sari Store Operator
// -------------------------------------------------------------
const scores4 = {
  A: [5, 5, 5, 5, 4, 5], // A5: 4
  B: [5, 5, 5, 4, 5],    // B4: 4
  C: [5, 5, 5, 5],
  D: [5, 4, 5, 5, 5, 5, 4], // D2: 4, D7: 4
  E: [5, 5, 5, 4, 5],    // E4: 4
  F: [5, 5, 5, 5, 5],
  G: [5, 5, 4, 4, 5],    // G3: 4, G4: 4
  H: [5, 5, 5, 4],       // H4: 4
};
const { result: res4, means: means4, interps: interps4 } = buildScores(scores4);

const copy4Config = {
  copyTitle: 'Copy 4 of 4 (Respondent: Business Owner / Micro-Enterprise)',
  shortTitle: 'Copy 4: Business Owner',
  fileName: 'ITPC113-ISO-IEC-25010-Evaluation-Copy4-Business-Owner.pdf',
  respondentName: "Roberto 'Tito Bert' Mendoza",
  respondentType: 'Business owner',
  yearsExperience: '10 Years Small Business Owner (Sari-Sari Store)',
  means: means4,
  interps: interps4,
  ...res4,
  feedback: [
    {
      q: '1. What do you like most about the system?',
      a: 'Quick PDF reports for daily store sales and expenses.',
    },
    {
      q: '2. What problems, errors, or difficulties did you encounter while using it?',
      a: 'None encountered so far.',
    },
    {
      q: '3. What features would you add, remove, or improve?',
      a: 'Attach receipt photos to transactions.',
    },
    {
      q: '4. Would you recommend this system to others or use it in a real business setting? Why or why not?',
      a: 'Yes, great for small shops and sari-sari stores.',
    },
    {
      q: '5. Additional comments or suggestions:',
      a: 'Affordable, fast, and practical. Good job!',
    },
  ],
};

const allCopies = [copy1Config, copy2Config, copy3Config, copy4Config];

allCopies.forEach((cfg) => {
  const doc = generateEvaluationPDF(cfg);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  const destDownload = path.resolve(`c:/Users/HUAWEI/Downloads/${cfg.fileName}`);
  const destPublic = path.resolve(__dirname, `../public/${cfg.fileName}`);
  const destBrain = path.resolve(
    `C:/Users/HUAWEI/.gemini/antigravity/brain/0597188d-f273-4be3-ad24-4440f0cd4c54/${cfg.fileName}`
  );

  fs.writeFileSync(destDownload, pdfBuffer);
  console.log(`Saved: ${destDownload}`);

  try {
    fs.writeFileSync(destPublic, pdfBuffer);
    console.log(`Saved: ${destPublic}`);
  } catch (e) {
    console.warn('Public save warn:', e.message);
  }

  try {
    fs.writeFileSync(destBrain, pdfBuffer);
    console.log(`Saved: ${destBrain}`);
  } catch (e) {
    console.warn('Brain save warn:', e.message);
  }
});

console.log('All 4 distinct evaluation PDF copies successfully generated!');
