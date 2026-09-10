import PDFDocument from 'pdfkit';

export type PdfSection = {
    heading: string;
    rows?: Array<[string, string]>;
    paragraphs?: string[];
    bullets?: string[];
};

const NAVY = '#0f172a';
const GOLD = '#b45309';
const RULE = '#cbd5e1';
const MUTED = '#475569';

export function collectPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true, info: { Author: 'Supreme Risk', Creator: 'Supreme Risk' } });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        draw(doc);
        doc.end();
    });
}

export function drawBrandHeader(
    doc: PDFKit.PDFDocument,
    input: { organizationName: string; title: string; subtitle?: string; reportDate: string }
) {
    doc.rect(0, 0, doc.page.width, 72).fill(NAVY);
    doc.fillColor('#f8fafc').font('Helvetica-Bold').fontSize(11).text('SUPREME RISK', 48, 18, { continued: true });
    doc.font('Helvetica').fontSize(9).fillColor('#fbbf24').text('  ·  CONFIDENTIAL', { continued: false });
    doc.fillColor('#e2e8f0').fontSize(9).text(input.organizationName, 48, 36);
    doc.fillColor('#94a3b8').fontSize(8).text(input.reportDate, 400, 36, { width: 164, align: 'right' });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text(input.title, 48, 92);
    if (input.subtitle) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(input.subtitle, 48, 116);
        doc.moveDown(0.6);
    } else {
        doc.moveDown(1);
    }
    doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
    doc.moveDown(0.8);
}

export function drawFooter(doc: PDFKit.PDFDocument, note: string) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).fillColor(MUTED).text(
            `Supreme Risk  ·  ${note}  ·  Page ${i + 1} of ${range.count}`,
            48,
            doc.page.height - 36,
            { width: doc.page.width - 96, align: 'center' }
        );
    }
}

export function ensureSpace(doc: PDFKit.PDFDocument, height = 80) {
    if (doc.y + height > doc.page.height - 56) {
        doc.addPage();
    }
}

export function drawKeyValue(doc: PDFKit.PDFDocument, rows: Array<[string, string]>, columns = 2) {
    const pageWidth = doc.page.width - 96;
    const colWidth = pageWidth / columns;
    let x = 48;
    let y = doc.y;
    rows.forEach((row, index) => {
        if (index > 0 && index % columns === 0) {
            y += 32;
            x = 48;
            ensureSpace(doc, 40);
            y = Math.max(y, doc.y);
        }
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(row[0].toUpperCase(), x, y, { width: colWidth - 12 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(row[1] || '—', x, y + 12, { width: colWidth - 12 });
        x += colWidth;
    });
    doc.y = y + 40;
}

export function drawSection(doc: PDFKit.PDFDocument, section: PdfSection) {
    ensureSpace(doc, 64);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text(section.heading);
    doc.moveTo(48, doc.y + 2).lineTo(220, doc.y + 2).strokeColor(RULE).lineWidth(1).stroke();
    doc.moveDown(0.6);
    if (section.rows?.length) {
        drawKeyValue(doc, section.rows);
    }
    (section.paragraphs || []).forEach((paragraph) => {
        ensureSpace(doc, 48);
        doc.font('Helvetica').fontSize(10).fillColor('#1e293b').text(paragraph || '—', { lineGap: 3 });
        doc.moveDown(0.4);
    });
    (section.bullets || []).forEach((bullet) => {
        ensureSpace(doc, 24);
        doc.font('Helvetica').fontSize(10).fillColor('#1e293b').text(`•  ${bullet}`, { indent: 8, lineGap: 2 });
    });
    doc.moveDown(0.5);
}

export function drawDecisionStrip(doc: PDFKit.PDFDocument, selected?: string | null) {
    const options: Array<{ code: string; label: string }> = [
        { code: 'APPROVE', label: 'APPROVE' },
        { code: 'APPROVE_WITH_CONDITIONS', label: 'APPROVE WITH CONDITIONS' },
        { code: 'ESCALATE', label: 'ESCALATE' },
        { code: 'REJECT', label: 'REJECT' },
        { code: 'RISK_ACCEPTED', label: 'RISK ACCEPTED' },
    ];
    ensureSpace(doc, 70);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text('Final decision');
    doc.moveDown(0.4);
    const width = (doc.page.width - 96 - 16) / options.length;
    const y = doc.y;
    options.forEach((option, index) => {
        const x = 48 + index * (width + 4);
        const active = option.code === selected;
        doc.roundedRect(x, y, width, 36, 3).fillAndStroke(active ? '#0f172a' : '#f8fafc', active ? GOLD : RULE);
        doc.fillColor(active ? '#fbbf24' : MUTED).font('Helvetica-Bold').fontSize(6.5)
            .text(option.label, x + 4, y + 13, { width: width - 8, align: 'center' });
    });
    doc.y = y + 48;
}
