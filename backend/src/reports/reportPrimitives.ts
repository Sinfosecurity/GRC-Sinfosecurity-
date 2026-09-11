import { C, FONT, PAGE, contentWidth, humanizeEnum, riskTone, toneColor, type RiskTone } from './reportTheme';
import { addReportPage, ensureSpace, type ReportDoc } from './reportLayout';

export function drawSectionTitle(doc: ReportDoc, title: string, eyebrow?: string) {
    ensureSpace(doc, 36);
    if (eyebrow) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.gold)
            .text(eyebrow.toUpperCase(), PAGE.marginX, doc.y, { characterSpacing: 0.8 });
        doc.moveDown(0.2);
    }
    doc.font('Helvetica-Bold').fontSize(FONT.section).fillColor(C.navy).text(title, PAGE.marginX);
    const y = doc.y + 3;
    doc.moveTo(PAGE.marginX, y).lineTo(PAGE.marginX + 46, y).strokeColor(C.gold).lineWidth(1.5).stroke();
    doc.y = y + 10;
}

export function drawParagraph(doc: ReportDoc, text: string) {
    ensureSpace(doc, 40);
    doc.font('Helvetica').fontSize(FONT.body).fillColor(C.ink)
        .text(text, PAGE.marginX, doc.y, { width: contentWidth(), lineGap: 3 });
    doc.moveDown(0.45);
}

export function drawBullets(doc: ReportDoc, items: string[]) {
    items.forEach((item) => {
        ensureSpace(doc, 22);
        const y = doc.y;
        doc.circle(PAGE.marginX + 3, y + 5, 1.6).fill(C.gold);
        doc.font('Helvetica').fontSize(FONT.body).fillColor(C.ink)
            .text(item, PAGE.marginX + 12, y, { width: contentWidth() - 12, lineGap: 2 });
        doc.moveDown(0.15);
    });
}

export function drawKpiRow(doc: ReportDoc, cards: Array<{ label: string; value: string | number; hint?: string; tone?: RiskTone }>) {
    ensureSpace(doc, 78);
    const gap = 10;
    const width = (contentWidth() - gap * (cards.length - 1)) / cards.length;
    const y = doc.y;
    let maxH = 68;
    cards.forEach((card, index) => {
        const x = PAGE.marginX + index * (width + gap);
        const tone = card.tone || 'neutral';
        doc.roundedRect(x, y, width, 68, 4).fill(C.sand);
        doc.rect(x, y, 4, 68).fill(toneColor(tone));
        const display = String(card.value);
        const valueSize = display.length > 12 ? 11 : display.length > 8 ? 14 : display.length > 5 ? 18 : FONT.kpi;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
            .text(card.label.toUpperCase(), x + 12, y + 10, { width: width - 18, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(valueSize).fillColor(C.navy)
            .text(display, x + 12, y + 26, { width: width - 18, lineBreak: false });
        if (card.hint) {
            doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
                .text(card.hint, x + 12, y + 50, { width: width - 18, lineBreak: false });
        }
    });
    doc.y = y + maxH + 12;
}

export function drawStatusBadge(doc: ReportDoc, x: number, y: number, label: string, width = 72) {
    const tone = riskTone(label);
    const text = humanizeEnum(label);
    doc.roundedRect(x, y, width, 14, 3).fill(toneColor(tone));
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7)
        .text(text, x, y + 3, { width, align: 'center' });
}

export function drawEmptyState(doc: ReportDoc, title: string, body: string) {
    doc.font('Helvetica').fontSize(FONT.small);
    const bodyH = doc.heightOfString(body, { width: contentWidth() - 28 });
    const height = Math.max(64, 38 + bodyH);
    ensureSpace(doc, height + 12);
    const y = doc.y;
    doc.roundedRect(PAGE.marginX, y, contentWidth(), height, 4).fill(C.sand);
    doc.rect(PAGE.marginX, y, 4, height).fill(C.gold);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
        .text(title, PAGE.marginX + 16, y + 12, { width: contentWidth() - 28 });
    doc.font('Helvetica').fontSize(FONT.small).fillColor(C.muted)
        .text(body, PAGE.marginX + 16, y + 30, { width: contentWidth() - 28 });
    doc.y = y + height + 12;
}

export function drawDecisionBanner(doc: ReportDoc, selected?: string | null) {
    const options = [
        { code: 'APPROVE', label: 'APPROVE' },
        { code: 'APPROVE_WITH_CONDITIONS', label: 'APPROVE WITH CONDITIONS' },
        { code: 'ESCALATE', label: 'ESCALATE' },
        { code: 'REJECT', label: 'REJECT' },
        { code: 'RISK_ACCEPTED', label: 'RISK ACCEPTED' },
    ];
    ensureSpace(doc, 86);
    drawSectionTitle(doc, 'Final decision');
    const width = (contentWidth() - 16) / options.length;
    const y = doc.y;
    options.forEach((option, index) => {
        const x = PAGE.marginX + index * (width + 4);
        const active = option.code === selected;
        const tone = riskTone(option.code);
        doc.roundedRect(x, y, width, 42, 3).fill(active ? C.navy : C.sand);
        if (active) doc.roundedRect(x, y, width, 42, 3).strokeColor(C.gold).lineWidth(1.4).stroke();
        doc.fillColor(active ? C.gold : C.muted).font('Helvetica-Bold').fontSize(6.5)
            .text(option.label, x + 3, y + 10, { width: width - 6, align: 'center' });
        if (active) {
            doc.rect(x, y + 38, width, 4).fill(toneColor(tone));
        }
    });
    doc.y = y + 54;
}

export type TableColumn = {
    key: string;
    header: string;
    width: number;
    align?: 'left' | 'right' | 'center';
    badge?: boolean;
};

export function drawProfessionalTable(
    doc: ReportDoc,
    columns: TableColumn[],
    rows: Array<Record<string, string | number | null | undefined>>,
    emptyTitle: string,
    emptyBody: string
) {
    if (!rows.length) {
        drawEmptyState(doc, emptyTitle, emptyBody);
        return;
    }
    const headerH = 22;
    const drawHeader = () => {
        ensureSpace(doc, 48);
        let x = PAGE.marginX;
        const y = doc.y;
        doc.rect(PAGE.marginX, y, contentWidth(), headerH).fill(C.navy);
        columns.forEach((column) => {
            doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
                .text(column.header.toUpperCase(), x + 5, y + 7, { width: column.width - 10, align: column.align || 'left' });
            x += column.width;
        });
        doc.y = y + headerH;
    };
    drawHeader();
    rows.forEach((row, index) => {
        const heights = columns.map((column) => {
            const value = String(row[column.key] ?? '—');
            doc.font('Helvetica').fontSize(FONT.table);
            return Math.max(22, doc.heightOfString(value, { width: column.width - 10 }) + 10);
        });
        const rowH = Math.min(54, Math.max(...heights));
        if (doc.y + rowH > PAGE.height - PAGE.contentBottom) {
            addReportPage(doc);
            drawHeader();
        }
        const y = doc.y;
        doc.rect(PAGE.marginX, y, contentWidth(), rowH).fill(index % 2 === 0 ? C.white : C.sand);
        let x = PAGE.marginX;
        columns.forEach((column) => {
            const value = String(row[column.key] ?? '—');
            if (column.badge) {
                doc.rect(x, y, 3, rowH).fill(toneColor(riskTone(value)));
                doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(FONT.table)
                    .text(humanizeEnum(value), x + 8, y + 6, { width: column.width - 12, align: column.align || 'left', height: rowH - 8 });
            } else {
                doc.fillColor(C.ink).font('Helvetica').fontSize(FONT.table)
                    .text(value, x + 5, y + 6, { width: column.width - 10, align: column.align || 'left', height: rowH - 8 });
            }
            x += column.width;
        });
        doc.y = y + rowH;
    });
    doc.moveDown(0.5);
}

export function drawKeyValueGrid(doc: ReportDoc, rows: Array<[string, string]>, columns = 2) {
    const width = contentWidth() / columns;
    let rowY = doc.y;
    rows.forEach((row, index) => {
        const col = index % columns;
        if (col === 0) {
            ensureSpace(doc, 34);
            rowY = doc.y;
        }
        const x = PAGE.marginX + col * width;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
            .text(row[0].toUpperCase(), x, rowY, { width: width - 12 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink)
            .text(row[1] || '—', x, rowY + 12, { width: width - 12 });
        if (col === columns - 1 || index === rows.length - 1) {
            doc.y = rowY + 32;
        }
    });
    doc.moveDown(0.2);
}

export function drawCallout(doc: ReportDoc, title: string, body: string, tone: RiskTone = 'neutral') {
    doc.font('Helvetica').fontSize(FONT.small);
    const bodyH = doc.heightOfString(body, { width: contentWidth() - 28 });
    const height = Math.max(62, 38 + bodyH);
    ensureSpace(doc, height + 12);
    const y = doc.y;
    doc.roundedRect(PAGE.marginX, y, contentWidth(), height, 4).fill(C.sand);
    doc.rect(PAGE.marginX, y, 4, height).fill(toneColor(tone));
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
        .text(title, PAGE.marginX + 16, y + 12, { width: contentWidth() - 28 });
    doc.font('Helvetica').fontSize(FONT.small).fillColor(C.ink)
        .text(body, PAGE.marginX + 16, y + 30, { width: contentWidth() - 28 });
    doc.y = y + height + 12;
}

export function drawComparisonBars(
    doc: ReportDoc,
    bars: Array<{ label: string; value: number; color: string }>
) {
    ensureSpace(doc, 70);
    bars.forEach((bar) => {
        const y = doc.y;
        doc.font('Helvetica').fontSize(FONT.caption).fillColor(C.muted)
            .text(bar.label, PAGE.marginX, y, { width: 90 });
        doc.roundedRect(PAGE.marginX + 96, y + 2, 300, 8, 4).fill(C.sandDeep);
        doc.roundedRect(PAGE.marginX + 96, y + 2, Math.max(4, (Math.min(100, bar.value) / 100) * 300), 8, 4).fill(bar.color);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink)
            .text(String(Math.round(bar.value)), PAGE.marginX + 404, y, { lineBreak: false });
        doc.y = y + 18;
    });
    doc.moveDown(0.3);
}
