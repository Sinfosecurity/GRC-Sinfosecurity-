import { C, FONT, PAGE, contentWidth, riskTone, toneColor } from './reportTheme';
import { ensureSpace, type ReportDoc } from './reportLayout';
import { drawEmptyState, drawSectionTitle } from './reportPrimitives';

export type NamedCount = { label: string; value: number; color?: string };

export function drawBarChart(
    doc: ReportDoc,
    title: string,
    items: NamedCount[],
    emptyMessage: string,
    height = 110
) {
    ensureSpace(doc, height + 28);
    drawSectionTitle(doc, title);
    if (!items.length || items.every((item) => item.value === 0)) {
        drawEmptyState(doc, 'No chart data', emptyMessage);
        return;
    }
    const max = Math.max(...items.map((item) => item.value), 1);
    const width = contentWidth();
    const barH = Math.min(16, (height - 16) / items.length);
    const labelW = 100;
    items.forEach((item) => {
        const y = doc.y;
        doc.font('Helvetica').fontSize(FONT.caption).fillColor(C.muted)
            .text(item.label, 44, y + 3, { width: labelW, lineBreak: false });
        const trackX = 44 + labelW + 8;
        const trackW = width - labelW - 36;
        doc.roundedRect(trackX, y + 2, trackW, barH, 2).fill(C.sand);
        const fillW = item.value > 0 ? Math.max(4, (item.value / max) * trackW) : 0;
        if (fillW) {
            doc.roundedRect(trackX, y + 2, fillW, barH, 2).fill(item.color || toneColor(riskTone(item.label)));
        }
        doc.font('Helvetica-Bold').fontSize(FONT.caption).fillColor(C.ink)
            .text(String(item.value), trackX + fillW + 6, y + 3, { lineBreak: false });
        doc.y = y + barH + 6;
    });
    doc.moveDown(0.4);
}

export function drawTrendChart(
    doc: ReportDoc,
    title: string,
    points: Array<{ label: string; value: number }>,
    emptyMessage: string
) {
    ensureSpace(doc, 168);
    drawSectionTitle(doc, title);
    if (points.length < 2) {
        drawEmptyState(doc, 'Trend not yet established', emptyMessage);
        return;
    }
    const width = contentWidth();
    const height = 110;
    const left = 44;
    const top = doc.y;
    const values = points.map((point) => point.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const span = Math.max(max - min, 1);
    doc.rect(left, top, width, height).fill(C.sand);
    [0.25, 0.5, 0.75].forEach((ratio) => {
        const y = top + height * ratio;
        doc.moveTo(left, y).lineTo(left + width, y).strokeColor(C.hairline).lineWidth(0.6).stroke();
    });
    const coords = points.map((point, index) => {
        const x = left + (index / (points.length - 1)) * width;
        const y = top + height - ((point.value - min) / span) * (height - 12) - 6;
        return { x, y, label: point.label, value: point.value };
    });
    doc.save();
    doc.moveTo(coords[0].x, coords[0].y);
    coords.slice(1).forEach((point) => doc.lineTo(point.x, point.y));
    doc.strokeColor(C.navy).lineWidth(1.6).stroke();
    coords.forEach((point) => {
        doc.circle(point.x, point.y, 2.4).fill(C.gold);
    });
    doc.restore();
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
        .text(points[0].label, left, top + height + 6, { width: 70, lineBreak: false })
        .text(points[points.length - 1].label, left + width - 70, top + height + 6, { width: 70, align: 'right', lineBreak: false });
    const latest = points[points.length - 1];
    const prior = points[points.length - 2];
    const delta = latest.value - prior.value;
    const direction = delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'unchanged';
    doc.font('Helvetica').fontSize(FONT.caption).fillColor(C.muted)
        .text(`Latest average residual ${latest.value} · ${direction}${delta ? ` ${delta > 0 ? '+' : ''}${delta}` : ''}`, left, top + height + 20, { width });
    doc.y = top + height + 38;
}

export function drawRiskHeatmap(
    doc: ReportDoc,
    title: string,
    cells: number[][],
    emptyMessage: string
) {
    ensureSpace(doc, 320);
    drawSectionTitle(doc, title);
    const total = cells.flat().reduce((sum, value) => sum + value, 0);
    if (!total) {
        drawEmptyState(doc, 'Heatmap unavailable', emptyMessage);
        return;
    }
    const likelihoodLabels = ['5 Almost certain', '4 Likely', '3 Possible', '2 Unlikely', '1 Rare'];
    const impacts = ['1 Low', '2', '3', '4', '5 Severe'];
    const left = 92;
    const top = doc.y + 22;
    const size = 52;
    const max = Math.max(...cells.flat(), 1);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
        .text('IMPACT', left, top - 22, { width: 48, lineBreak: false });
    impacts.forEach((label, x) => {
        doc.font('Helvetica').fontSize(7).fillColor(C.muted)
            .text(label, left + x * size, top - 10, { width: size, align: 'center', lineBreak: false });
    });
    likelihoodLabels.forEach((label, displayRow) => {
        const likelihood = 5 - displayRow;
        const row = cells[likelihood - 1] || [0, 0, 0, 0, 0];
        doc.font('Helvetica').fontSize(7).fillColor(C.muted)
            .text(label, 44, top + 16 + displayRow * size, { width: 46 });
        row.forEach((count, x) => {
            const impact = x + 1;
            const score = likelihood * impact;
            const fill = heatmapColor(score, count, max);
            const cx = left + x * size + 3;
            const cy = top + 12 + displayRow * size + 3;
            doc.roundedRect(cx, cy, size - 6, size - 6, 3).fill(fill);
            doc.fillColor(count > 0 ? C.white : C.ink)
                .font('Helvetica-Bold').fontSize(11)
                .text(String(count), cx, cy + 14, { width: size - 6, align: 'center' });
        });
    });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
        .text('LIKELIHOOD ↑  ·  Derived from persisted residual score and vendor criticality. Cell value is vendor count.', 44, top + 12 + 5 * size + 8, { width: contentWidth() });
    doc.y = top + 12 + 5 * size + 28;
}

function heatmapColor(score: number, count: number, max: number): string {
    const intensity = count ? 0.45 + (count / max) * 0.55 : 0.18;
    if (score >= 15) return mix(C.critical, C.sand, intensity);
    if (score >= 10) return mix(C.high, C.sand, intensity);
    if (score >= 6) return mix(C.medium, C.sand, intensity);
    return mix(C.low, C.sand, Math.max(intensity, 0.22));
}

function mix(hex: string, into: string, amount: number): string {
    const a = rgb(hex);
    const b = rgb(into);
    const t = Math.min(1, Math.max(0, amount));
    const n = a.map((value, i) => Math.round(value * t + b[i] * (1 - t)));
    return `#${n.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function rgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '');
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

export function drawScoreMeter(doc: ReportDoc, label: string, value: number, width = 220) {
    const x = PAGE.marginX;
    const y = doc.y;
    doc.font('Helvetica').fontSize(FONT.caption).fillColor(C.muted).text(label.toUpperCase(), x, y, { width, continued: false });
    const trackY = y + 14;
    doc.roundedRect(x, trackY, width, 8, 4).fill(C.sandDeep);
    const stops = [
        { to: 0.4, color: C.low },
        { to: 0.6, color: C.medium },
        { to: 0.8, color: C.high },
        { to: 1, color: C.critical },
    ];
    let prev = 0;
    stops.forEach((stop) => {
        doc.rect(x + prev * width, trackY, (stop.to - prev) * width, 8).fill(stop.color);
        prev = stop.to;
    });
    const marker = x + Math.min(100, Math.max(0, value)) / 100 * width;
    doc.circle(marker, trackY + 4, 5).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink)
        .text(String(Math.round(value)), x + width + 8, trackY - 4, { lineBreak: false });
    doc.y = trackY + 20;
}
