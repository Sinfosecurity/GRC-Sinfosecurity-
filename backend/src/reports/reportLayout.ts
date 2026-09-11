import PDFDocument from 'pdfkit';
import { C, FONT, PAGE, contentWidth } from './reportTheme';

export type ReportMeta = {
    title: string;
    organizationName: string;
    reportDate: string;
    generatedAt: Date;
    reportId: string;
    subtitle?: string;
    classification?: string;
    methodologyVersion?: string;
    footerNote?: string;
};

export type ReportDoc = PDFKit.PDFDocument & { __meta?: ReportMeta; __firstPage?: boolean };

export async function collectPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return createReportPdf({
        title: 'Supreme Risk Report',
        organizationName: 'Organization',
        reportDate: new Date().toISOString().slice(0, 10),
        generatedAt: new Date(),
        reportId: 'SR-RPT',
    }, draw);
}

export function createReportPdf(meta: ReportMeta, draw: (doc: ReportDoc) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER',
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            bufferPages: true,
            info: {
                Title: meta.title,
                Author: 'Supreme Risk',
                Creator: 'Supreme Risk',
                Subject: `${meta.organizationName} · ${meta.classification || 'Confidential'}`,
            },
        }) as ReportDoc;
        doc.__meta = meta;
        doc.__firstPage = true;
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        drawCoverHeader(doc, meta);
        draw(doc);
        drawAllFooters(doc, meta);
        doc.end();
    });
}

export function drawCoverHeader(doc: ReportDoc, meta: ReportMeta) {
    doc.rect(0, 0, PAGE.width, 78).fill(C.navy);
    doc.rect(0, 78, PAGE.width, 3).fill(C.gold);
    doc.rect(0, 81, PAGE.width, 36).fill(C.sand);
    doc.fillColor(C.gold).font('Helvetica-Bold').fontSize(8.5)
        .text('SUPREME RISK', PAGE.marginX, 14, { characterSpacing: 1.2 });
    doc.fillColor(C.goldSoft).font('Helvetica').fontSize(8)
        .text((meta.classification || 'CONFIDENTIAL').toUpperCase(), PAGE.width - PAGE.marginX - 200, 14, { width: 200, align: 'right' });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20)
        .text(meta.title, PAGE.marginX, 32, { width: contentWidth() });
    if (meta.subtitle) {
        doc.fillColor('#D7DEE6').font('Helvetica').fontSize(8)
            .text(meta.subtitle, PAGE.marginX, 58, { width: contentWidth(), lineBreak: false });
    }
    doc.fillColor(C.muted).font('Helvetica').fontSize(8)
        .text(
            [meta.organizationName, `Report date ${meta.reportDate}`, meta.reportId, formatGenerated(meta)].filter(Boolean).join('   ·   '),
            PAGE.marginX,
            92,
            { width: contentWidth(), lineBreak: false }
        );
    doc.y = PAGE.contentTop;
}

export function drawRunningHeader(doc: ReportDoc, meta: ReportMeta) {
    doc.rect(0, 0, PAGE.width, 38).fill(C.navy);
    doc.rect(0, 38, PAGE.width, 2).fill(C.gold);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8)
        .text('SUPREME RISK', PAGE.marginX, 13);
    doc.fillColor(C.goldSoft).font('Helvetica').fontSize(8)
        .text(`${meta.title}  ·  ${meta.organizationName}`, PAGE.marginX + 92, 13, { width: 320 });
    doc.fillColor('#D7DEE6').font('Helvetica').fontSize(8)
        .text(meta.reportId, PAGE.width - PAGE.marginX - 140, 13, { width: 140, align: 'right' });
    doc.y = PAGE.runningTop;
}

export function addReportPage(doc: ReportDoc) {
    doc.addPage({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.__firstPage = false;
    if (doc.__meta) drawRunningHeader(doc, doc.__meta);
}

export function ensureSpace(doc: ReportDoc, height = 72) {
    if (doc.y + height > PAGE.height - PAGE.contentBottom) {
        addReportPage(doc);
    }
}

export function drawAllFooters(doc: ReportDoc, meta: ReportMeta) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.moveTo(PAGE.marginX, PAGE.height - 48).lineTo(PAGE.width - PAGE.marginX, PAGE.height - 48)
            .strokeColor(C.rule).lineWidth(0.6).stroke();
        const left = `Supreme Risk  ·  Confidential  ·  ${meta.organizationName}`;
        const mid = meta.methodologyVersion ? `Methodology ${meta.methodologyVersion}` : meta.footerNote || meta.reportId;
        const right = `${meta.reportDate}  ·  Page ${i + 1} of ${range.count}`;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
            .text(left, PAGE.marginX, PAGE.footerY, { width: 230, lineBreak: false });
        doc.text(mid, PAGE.marginX + 230, PAGE.footerY, { width: 150, align: 'center', lineBreak: false });
        doc.text(right, PAGE.width - PAGE.marginX - 144, PAGE.footerY, {
            width: 144,
            align: 'right',
            lineBreak: false,
        });
    }
}

function formatGenerated(meta: ReportMeta): string {
    return `Generated ${meta.generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
