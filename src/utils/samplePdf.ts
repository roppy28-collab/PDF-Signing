import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates a clean, professional 2-page sample agreement PDF
 * for instant testing of the drag-and-drop and signing flow.
 */
export async function createSamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // --- Page 1 ---
  const page1 = pdfDoc.addPage([595.28, 841.89]); // Standard A4
  const { width, height } = page1.getSize();

  // Header Title
  page1.drawText('MUTUAL NON-DISCLOSURE AGREEMENT', {
    x: 50,
    y: height - 80,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.22),
  });

  page1.drawText('Document ID: NDA-2026-0841  •  Strictly Confidential', {
    x: 50,
    y: height - 102,
    size: 9,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.6),
  });

  // Divider line
  page1.drawLine({
    start: { x: 50, y: height - 115 },
    end: { x: width - 50, y: height - 115 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  const bodyLines = [
    'This Mutual Non-Disclosure Agreement (the "Agreement") is entered into by and between the',
    'Parties for the purpose of preventing the unauthorized disclosure of Confidential Information.',
    '',
    '1. DEFINITION OF CONFIDENTIAL INFORMATION',
    'For purposes of this Agreement, "Confidential Information" shall include all information or',
    'material that has or could have commercial value or other utility in the business in which',
    'Disclosing Party is engaged. If Information is in written form, the Disclosing Party shall label',
    'or stamp the materials with the word "Confidential" or some similar warning.',
    '',
    '2. EXCLUSIONS FROM CONFIDENTIALITY',
    'Receiving Party\'s obligations under this Agreement do not extend to information that is: (a) publicly',
    'known at the time of disclosure or subsequently becomes publicly known through no fault of the',
    'Receiving Party; (b) discovered or created by the Receiving Party before disclosure by Disclosing Party;',
    'or (c) learned by the Receiving Party through legitimate means other than from the Disclosing Party.',
    '',
    '3. OBLIGATIONS OF RECEIVING PARTY',
    'Receiving Party shall hold and maintain the Confidential Information in strictest confidence for',
    'the sole and exclusive benefit of the Disclosing Party. Receiving Party shall carefully restrict access',
    'to Confidential Information to employees, contractors, and third parties as is reasonably required.',
    '',
    '4. TERM AND APPLICABILITY',
    'The non-disclosure provisions of this Agreement shall survive the termination of this Agreement',
    'and Receiving Party\'s duty to hold Confidential Information in confidence shall remain in effect',
    'until such time as Disclosing Party releases Receiving Party from such obligation in writing.'
  ];

  let currentY = height - 150;
  for (const line of bodyLines) {
    if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
      currentY -= 6;
      page1.drawText(line, {
        x: 50,
        y: currentY,
        size: 10.5,
        font: fontBold,
        color: rgb(0.18, 0.22, 0.3),
      });
      currentY -= 16;
    } else {
      page1.drawText(line, {
        x: 50,
        y: currentY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.25, 0.28, 0.35),
      });
      currentY -= 15;
    }
  }

  // Footer
  page1.drawText('Page 1 of 2  —  Continue to Page 2 for Signature Block', {
    x: 50,
    y: 40,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });

  // --- Page 2 ---
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  
  page2.drawText('SIGNATURE EXECUTION & ACKNOWLEDGEMENT', {
    x: 50,
    y: height - 80,
    size: 15,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.22),
  });

  page2.drawText('IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date signed below.', {
    x: 50,
    y: height - 105,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  });

  // Disclosing Party Box
  page2.drawRectangle({
    x: 50,
    y: height - 290,
    width: 235,
    height: 160,
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.99),
  });
  page2.drawText('PARTY A (DISCLOSING ENTITY)', {
    x: 65,
    y: height - 150,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  page2.drawText('Company: Apex Global Technologies Ltd.', {
    x: 65,
    y: height - 175,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });
  page2.drawText('Representative: Marcus Sterling', {
    x: 65,
    y: height - 195,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });
  page2.drawText('Title: Managing Director', {
    x: 65,
    y: height - 215,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });
  page2.drawLine({
    start: { x: 65, y: height - 260 },
    end: { x: 260, y: height - 260 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.7),
  });
  page2.drawText('Authorized Signature', {
    x: 65,
    y: height - 275,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });

  // Receiving Party Box (Target for user signature)
  page2.drawRectangle({
    x: 310,
    y: height - 290,
    width: 235,
    height: 160,
    borderColor: rgb(0.2, 0.45, 0.85),
    borderWidth: 1.5,
    color: rgb(0.97, 0.99, 1.0),
  });
  page2.drawText('PARTY B (SIGNING RECIPIENT)', {
    x: 325,
    y: height - 150,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.35, 0.75),
  });
  page2.drawText('Signatory: Recipient Full Legal Name', {
    x: 325,
    y: height - 175,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });
  page2.drawText('Date: ' + new Date().toISOString().split('T')[0], {
    x: 325,
    y: height - 195,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });

  // Signature placement line
  page2.drawLine({
    start: { x: 325, y: height - 260 },
    end: { x: 520, y: height - 260 },
    thickness: 1,
    color: rgb(0.2, 0.45, 0.85),
  });
  page2.drawText('Place Signature Here  [Drag & Sign]', {
    x: 345,
    y: height - 275,
    size: 8.5,
    font: fontBold,
    color: rgb(0.2, 0.45, 0.85),
  });

  // Footer
  page2.drawText('Page 2 of 2  •  Executed Agreement Copy', {
    x: 50,
    y: 40,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });

  return await pdfDoc.save();
}
