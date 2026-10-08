import PDFDocument from 'pdfkit';

const TZ = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: TZ() }) : '—');

// Builds the vote-receipt PDF. Inputs are only: election details, the
// voter's own name, receipt ID and vote time. The ballot choice is never
// passed in (and isn't stored with the voter record at all), so the PDF
// cannot reveal it.
export const buildReceiptPdf = ({ election, voterName, receiptId, votedAt }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 56, compress: false, info: { Title: `Vote receipt - ${election.title}`, Author: 'Smart Voting System' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const navy = '#1E3A8A';
  const gray = '#475569';
  const width = doc.page.width - 112;

  doc.rect(0, 0, doc.page.width, 96).fill(navy);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Smart Voting System', 56, 30);
  doc.fontSize(12).font('Helvetica').text('Official Vote Receipt', 56, 60);

  doc.moveDown(4).fillColor('#0f172a');
  const row = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(gray).text(label.toUpperCase());
    doc.font('Helvetica').fontSize(13).fillColor('#0f172a').text(value || '—', { width });
    doc.moveDown(0.8);
  };

  row('Election', election.title);
  if (election.description) row('Description', election.description);
  row('Election period', `${fmt(election.startTime)}  to  ${fmt(election.endTime)}`);
  if (voterName) row('Issued to', voterName);
  row('Vote recorded on', fmt(votedAt));

  doc.moveDown(0.5);
  const boxTop = doc.y;
  doc.roundedRect(56, boxTop, width, 70, 8).lineWidth(1.5).stroke(navy);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(gray).text('RECEIPT / REFERENCE ID', 72, boxTop + 14);
  doc.font('Courier-Bold').fontSize(18).fillColor(navy).text(receiptId || 'Not available (vote cast before receipts were introduced)', 72, boxTop + 32, { width: width - 32 });
  doc.y = boxTop + 90;

  doc.font('Helvetica').fontSize(10.5).fillColor(gray).text(
    'This receipt confirms that a vote was recorded for the election above. It does not and cannot show which candidate was chosen - ballots are secret. '
    + 'To check that your vote was counted, open "Verify Receipt" in the Smart Voting System and enter the receipt ID.',
    56, doc.y, { width, lineGap: 3 }
  );

  doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8')
    .text(`Generated ${fmt(new Date())}`, 56, doc.page.height - 80, { width, align: 'center' });
  doc.end();
});
