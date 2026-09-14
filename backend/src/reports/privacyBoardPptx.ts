import JSZip from 'jszip';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { isoDate } from './sendDownload';

function xml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const W = 12192000;
const H = 6858000;
const NAVY = '0F172A';
const GOLD = 'C5A46E';
const SLATE = '475569';
const INK = '0F172A';
const MUTED = '64748B';
const CARD = 'F8FAFC';
const LINE = 'E2E8F0';

function solid(color: string) {
    return `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
}

function box(id: number, name: string, x: number, y: number, cx: number, cy: number, fill?: string, stroke?: string) {
    return `<p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6000"/></a:avLst></a:prstGeom>
        ${fill ? solid(fill) : ''}
        ${stroke ? `<a:ln w="12700">${solid(stroke)}</a:ln>` : '<a:ln><a:noFill/></a:ln>'}
      </p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody>
    </p:sp>`;
}

const BASE_SIZE = 1300;
const MIN_SIZE = 1100;
const BASE_CHARS = 88;

export function wrapBoardLine(value: string, maxChars: number): string[] {
    const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return [];
    const rows: string[] = [];
    let line = '';
    for (const word of words) {
        if (word.length > maxChars) {
            if (line) {
                rows.push(line);
                line = '';
            }
            for (let index = 0; index < word.length; index += maxChars) {
                const chunk = word.slice(index, index + maxChars);
                if (index + maxChars < word.length) rows.push(chunk);
                else line = chunk;
            }
            continue;
        }
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars) {
            rows.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) rows.push(line);
    return rows;
}

export function sizeBoardBlock(value: string): { size: number; rows: string[] } {
    let size = BASE_SIZE;
    let chars = BASE_CHARS;
    let rows = wrapBoardLine(value, chars);
    while (rows.length > 5 && size > MIN_SIZE) {
        size -= 100;
        chars = Math.round(BASE_CHARS * (BASE_SIZE / size));
        rows = wrapBoardLine(value, chars);
    }
    return { size, rows: rows.length ? rows : [value.replace(/\s+/g, ' ').trim()] };
}

function lineEmu(size: number) {
    if (size <= 1100) return 240000;
    if (size <= 1200) return 260000;
    return 280000;
}

function run(value: string, size: number, color: string, bold = false) {
    return `<a:r><a:rPr lang="en-US" sz="${size}" b="${bold ? 1 : 0}" dirty="0">${solid(color)}<a:latin typeface="Calibri" pitchFamily="34" charset="0"/></a:rPr><a:t xml:space="preserve">${xml(value)}</a:t></a:r>`;
}

function text(id: number, value: string, x: number, y: number, cx: number, cy: number, size: number, color: string, bold = false, align = 'l') {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    return `<p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="t${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t" lIns="45720" tIns="22860" rIns="45720" bIns="22860"/>
        <a:lstStyle/>
        <a:p>
          <a:pPr algn="${align}"/>
          ${run(cleaned, size, color, bold)}
        </a:p>
      </p:txBody>
    </p:sp>`;
}

function wrappedBox(id: number, rows: string[], size: number, x: number, y: number, cx: number, color = INK) {
    const cy = rows.length * lineEmu(size) + 50000;
    return {
        height: cy,
        xml: `<p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="n${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t" lIns="45720" tIns="8000" rIns="45720" bIns="8000"/>
        <a:lstStyle/>
        ${rows.map((row) => `<a:p><a:pPr algn="l"/>${run(row, size, color)}</a:p>`).join('')}
      </p:txBody>
    </p:sp>`,
    };
}

export function paginateBoardNarrative(items: string[], options?: { reserveNote?: boolean }): { rows: string[]; size: number }[][] {
    const top = 1680000;
    const bottom = options?.reserveNote ? 5480000 : 6360000;
    const pages: { rows: string[]; size: number }[][] = [[]];
    let used = top;
    const gap = 70000;
    const pageBudget = bottom - top;

    const newPage = () => {
        pages.push([]);
        used = top;
    };

    const heightOf = (rows: string[], size: number) => rows.length * lineEmu(size) + 50000;

    for (const item of items.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
        const sized = sizeBoardBlock(item);
        const height = heightOf(sized.rows, sized.size);
        const available = bottom - used - 50000;
        if (height <= available) {
            pages[pages.length - 1].push(sized);
            used += height + gap;
            continue;
        }
        if (pages[pages.length - 1].length > 0) newPage();
        if (height <= pageBudget) {
            pages[pages.length - 1].push(sized);
            used += height + gap;
            continue;
        }
        let offset = 0;
        while (offset < sized.rows.length) {
            const remaining = sized.rows.slice(offset);
            const fit = Math.max(1, Math.floor((bottom - used - 50000) / lineEmu(sized.size)));
            const take = remaining.slice(0, fit);
            pages[pages.length - 1].push({ rows: take, size: sized.size });
            offset += take.length;
            if (offset < sized.rows.length) newPage();
            else used += heightOf(take, sized.size) + gap;
        }
    }
    if (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();
    return pages;
}

function kpi(id: number, value: string, label: string, x: number) {
    const size = value.length > 6 ? 2000 : 2800;
    return `${box(id, `k${id}`, x, 1680000, 2500000, 1280000, CARD, LINE)}
    ${text(id + 1, value, x, 1780000, 2500000, 640000, size, INK, true, 'ctr')}
    ${text(id + 2, label, x, 2420000, 2500000, 420000, 1100, SLATE, false, 'ctr')}`;
}

function footer(page: number, total: number) {
    return `${box(900, 'ft', 0, 6520000, W, 340000, 'F1F5F9')}
    ${text(901, 'Supreme Privacy Board Report  ·  Confidential  ·  Not legal advice', 360000, 6560000, 7800000, 260000, 900, MUTED)}
    ${text(902, `${page} / ${total}`, 10400000, 6560000, 1400000, 260000, 900, MUTED, false, 'r')}`;
}

function header(title: string, subtitle: string) {
    return `${box(3, 'bar', 0, 0, W, 1180000, NAVY)}
    ${box(4, 'gold', 0, 1180000, W, 50000, GOLD)}
    ${text(5, title, 420000, 220000, 11000000, 560000, 2600, 'FFFFFF', true)}
    ${text(6, subtitle, 420000, 740000, 11000000, 320000, 1200, 'CBD5E1')}`;
}

function lines(startId: number, items: string[], x: number, y: number, floor = 6360000) {
    let cursor = y;
    const xml: string[] = [];
    for (const [index, item] of items.filter(Boolean).entries()) {
        if (xml.length >= 5) break;
        const sized = sizeBoardBlock(item);
        const height = sized.rows.length * lineEmu(sized.size) + 50000;
        if (cursor + height > floor) break;
        const box = wrappedBox(startId + index, sized.rows, sized.size, x, cursor, 11300000);
        cursor += box.height + 60000;
        xml.push(box.xml);
    }
    return xml.join('');
}

function bar(id: number, label: string, value: number, max: number, x: number, y: number) {
    const width = max <= 0 ? 0 : Math.max(120000, Math.round((value / max) * 5200000));
    return `${text(id, `${label}  ${value}`, x, y, 3200000, 280000, 1200, SLATE)}
    ${box(id + 1, `bg${id}`, x + 3300000, y + 60000, 5200000, 160000, 'E2E8F0')}
    ${box(id + 2, `fg${id}`, x + 3300000, y + 60000, width, 160000, NAVY)}`;
}

function slide(children: string) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    ${children}
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

export async function renderPrivacyBoardPptx(organizationId: string) {
    const pack = await enterprisePrivacyService.pack(organizationId);
    const generatedAt = new Date();
    const totals = pack.dashboard.totals;
    const attention = pack.dashboard.attention;
    const activities = pack.activities;
    const transfers = pack.transfers;
    const rights = pack.rights;
    const dpias = pack.dpias;
    const retention = pack.retention;
    const maxBar = Math.max(totals.activeActivities, totals.openRightsRequests, totals.transfersRequiringReview, totals.highRiskProcessing, 1);
    const decisionItems = attention.length
        ? attention.map((row) => `${row.publicId}  ${row.type} — ${row.why}`)
        : ['No management decision is required from the current live queue.'];
    const actionItems = attention.length
        ? attention.map((row, index) => `${index + 1}. Review ${row.publicId} — ${row.type}. ${row.why}`)
        : ['1. Maintain current records. No overdue privacy action is recorded.'];
    const decisionPages = paginateBoardNarrative(decisionItems);
    const actionPages = paginateBoardNarrative(actionItems, { reserveNote: true });
    const total = 10 + decisionPages.length + actionPages.length;
    const slides: string[] = [];

    const narrativeSlide = (
        title: string,
        subtitle: string,
        blocks: { rows: string[]; size: number }[],
        page: number,
        note?: string,
    ) => {
        let cursor = 1680000;
        const body = blocks.map((block, index) => {
            const box = wrappedBox(20 + index, block.rows, block.size, 420000, cursor, 11300000);
            cursor += box.height + 70000;
            return box.xml;
        }).join('');
        return slide(`
      ${header(title, subtitle)}
      ${body}
      ${note ? text(80, note, 420000, 5600000, 11000000, 360000, 1200, MUTED) : ''}
      ${footer(page, total)}
    `);
    };

    slides.push(slide(`
      ${box(2, 'cover', 0, 0, W, H, NAVY)}
      ${box(3, 'gold', 420000, 2100000, 1800000, 70000, GOLD)}
      ${text(4, 'SUPREME PRIVACY', 420000, 2280000, 11000000, 400000, 1400, GOLD, true)}
      ${text(5, 'Board Risk Committee report', 420000, 2700000, 11000000, 700000, 3600, 'FFFFFF', true)}
      ${text(6, pack.name, 420000, 3480000, 11000000, 400000, 1800, 'E2E8F0')}
      ${text(7, `${isoDate(generatedAt)}  ·  Live tenant records only  ·  No trend available`, 420000, 4000000, 11000000, 320000, 1300, '94A3B8')}
      ${text(8, 'Prepared for CPO, DPO, General Counsel, CISO, CRO, and the Board Risk Committee.', 420000, 5480000, 11000000, 320000, 1200, 'CBD5E1')}
      ${text(9, 'Recorded operations are not a finding that processing is lawful. Not legal advice.', 420000, 5880000, 11000000, 420000, 1100, '94A3B8')}
    `));

    slides.push(slide(`
      ${header('Privacy posture at a glance', 'Recorded operations, not a finding that processing is lawful.')}
      ${kpi(10, String(totals.activeActivities), 'Active processing', 420000)}
      ${kpi(20, String(totals.openRightsRequests), 'Open rights requests', 3120000)}
      ${kpi(30, String(totals.transfersRequiringReview), 'Transfers in review', 5820000)}
      ${kpi(40, String(totals.highRiskProcessing), 'High-risk processing', 8520000)}
      ${text(50, 'No trend available. Supreme does not invent arrows when history is insufficient.', 420000, 3180000, 11000000, 300000, 1200, MUTED)}
      ${bar(60, 'Active processing', totals.activeActivities, maxBar, 420000, 3600000)}
      ${bar(70, 'Open rights', totals.openRightsRequests, maxBar, 420000, 4080000)}
      ${bar(80, 'Transfers in review', totals.transfersRequiringReview, maxBar, 420000, 4560000)}
      ${bar(90, 'High-risk processing', totals.highRiskProcessing, maxBar, 420000, 5040000)}
      ${footer(2, total)}
    `));

    slides.push(slide(`
      ${header('Processing and data footprint', 'Where personal data is recorded to be processed.')}
      ${kpi(10, String(activities.length), 'Activities in view', 420000)}
      ${kpi(20, String(new Set(activities.flatMap((row) => row.jurisdictions || [])).size), 'Jurisdictions', 3120000)}
      ${kpi(30, String(new Set(activities.flatMap((row) => row.dataCategories?.map((item: { label: string }) => item.label) || [])).size), 'Data categories', 5820000)}
      ${kpi(40, String(new Set(activities.flatMap((row) => row.vendors?.map((item: { name: string }) => item.name) || [])).size), 'Linked processors', 8520000)}
      ${lines(60, activities.slice(0, 6).map((row) => `${row.publicId}  ${row.name}  ·  ${row.status}  ·  ${(row.jurisdictions || []).join(', ') || 'No jurisdiction recorded'}`), 420000, 3200000)}
      ${footer(3, total)}
    `));

    const highRisk = activities.filter((row) => /high|critical/i.test(String(row.riskLevel || '')));
    slides.push(slide(`
      ${header('Highest privacy risks', 'Linked enterprise risk records only. No invented residual scores.')}
      ${kpi(10, String(totals.highRiskProcessing), 'High-risk activities', 420000)}
      ${kpi(20, String(totals.openGaps), 'Open gaps', 3120000)}
      ${kpi(30, String(pack.dashboard.totals.processorsWithIssues || 0), 'Processors with issues', 5820000)}
      ${kpi(40, String(totals.evidenceRefresh || 0), 'Evidence refresh', 8520000)}
      ${lines(60, (highRisk.length ? highRisk : activities).slice(0, 5).map((row) => `${row.publicId}  ${row.name}  ·  ${row.riskLevel || 'Not scored'}`), 420000, 3200000)}
      ${text(90, highRisk.length ? 'Highest recorded privacy risk activities.' : 'No separately scored high-risk activities. Showing recorded activities instead.', 420000, 5600000, 11000000, 300000, 1200, MUTED)}
      ${footer(4, total)}
    `));

    slides.push(slide(`
      ${header('International transfer posture', 'A recorded mechanism is not a finding that a transfer is lawful.')}
      ${kpi(10, String(transfers.length), 'Transfers recorded', 420000)}
      ${kpi(20, String(totals.transfersRequiringReview), 'Review required', 3120000)}
      ${kpi(30, String(transfers.filter((row) => /scc|adequacy|bcr/i.test(String(row.mechanism))).length), 'Mechanism recorded', 5820000)}
      ${kpi(40, 'None', 'Lawfulness claimed', 8520000)}
      ${lines(60, transfers.length ? transfers.slice(0, 5).map((row) => `${row.publicId}  ${row.source} to ${row.destination}  ·  ${row.mechanism}  ·  ${row.status}`) : ['No international transfer is recorded.'], 420000, 3200000)}
      ${footer(5, total)}
    `));

    slides.push(slide(`
      ${header('Rights-request posture', 'Requester identity is withheld from this board view.')}
      ${kpi(10, String(totals.openRightsRequests), 'Open requests', 420000)}
      ${kpi(20, String(totals.overdueRightsRequests), 'Overdue (configured)', 3120000)}
      ${kpi(30, String(rights.length), 'Recorded requests', 5820000)}
      ${kpi(40, 'Configured', 'Deadline model', 8520000)}
      ${lines(60, rights.length ? rights.slice(0, 5).map((row) => `${row.publicId}  ${row.requestType}  ·  ${row.status}  ·  configured due ${row.dueAt ? isoDate(new Date(row.dueAt)) : 'not set'}`) : ['No rights request is recorded.'], 420000, 3200000)}
      ${footer(6, total)}
    `));

    slides.push(slide(`
      ${header('DPIA / assessment posture', 'Screening recommends review. It does not say a DPIA is legally required.')}
      ${kpi(10, String(dpias.length), 'DPIAs recorded', 420000)}
      ${kpi(20, String(totals.dpiasDue), 'DPIAs due', 3120000)}
      ${kpi(30, String(dpias.filter((row) => /complete/i.test(String(row.status))).length), 'Decisions recorded', 5820000)}
      ${kpi(40, 'Review', 'Not legal clearance', 8520000)}
      ${lines(60, dpias.length ? dpias.slice(0, 5).map((row) => `${row.publicId}  ${row.title}  ·  ${row.status}`) : ['No DPIA is recorded.'], 420000, 3200000)}
      ${footer(7, total)}
    `));

    slides.push(slide(`
      ${header('Vendor / processor exposure', 'Third Party identity is reused. Privacy adds role and links only.')}
      ${kpi(10, String(new Set(activities.flatMap((row) => row.vendors?.map((item: { name: string }) => item.name) || [])).size), 'Linked processors', 420000)}
      ${kpi(20, String(pack.dashboard.totals.processorsWithIssues || 0), 'With privacy issues', 3120000)}
      ${kpi(30, String(transfers.length), 'Transfer paths', 5820000)}
      ${kpi(40, String(totals.evidenceRefresh || 0), 'Evidence refresh', 8520000)}
      ${lines(60, activities.slice(0, 5).map((row) => `${row.publicId}  ${(row.vendors || []).slice(0, 2).map((item: { name: string; role: string }) => `${item.name || 'Vendor'} · ${item.role}`).join(' · ') || 'No processor recorded'}`), 420000, 3200000)}
      ${footer(8, total)}
    `));

    slides.push(slide(`
      ${header('Retention / deletion posture', 'Closed tasks are not proof that external-system data is deleted.')}
      ${kpi(10, String(retention.length), 'Retention rules', 420000)}
      ${kpi(20, String(totals.retentionActionsDue), 'Actions due', 3120000)}
      ${kpi(30, String(totals.deletionPending || 0), 'Deletion pending', 5820000)}
      ${kpi(40, 'Manual', 'Auto-delete', 8520000)}
      ${lines(60, retention.length ? retention.slice(0, 5).map((row) => `${row.publicId}  ${row.period}  ·  ${row.due ? 'Due' : 'Scheduled'}`) : ['No retention rule is recorded.'], 420000, 3200000)}
      ${footer(9, total)}
    `));

    slides.push(slide(`
      ${header('Evidence / control health', 'CLEAN presence is not proof. Shared #14 evidence is reused.')}
      ${kpi(10, String(totals.evidenceRefresh || 0), 'Evidence refresh', 420000)}
      ${kpi(20, String(totals.openGaps), 'Open gaps', 3120000)}
      ${kpi(30, 'Shared', 'Control plane', 5820000)}
      ${kpi(40, 'Closed', 'Malware fail-closed', 8520000)}
      ${lines(60, attention.filter((row) => /evidence|control|gap/i.test(row.type)).slice(0, 6).map((row) => `${row.publicId}  ${row.type}: ${row.why}`), 420000, 3200000)}
      ${text(90, attention.some((row) => /evidence|control|gap/i.test(row.type)) ? '' : 'No evidence or control attention items from live records.', 420000, 5800000, 11000000, 300000, 1200, MUTED)}
      ${footer(10, total)}
    `));

    decisionPages.forEach((blocks, index) => {
        slides.push(narrativeSlide(
            index === 0 ? 'Key decisions required' : 'Key decisions required  ·  continued',
            'Human-authoritative. Supreme does not issue legal conclusions.',
            blocks,
            11 + index,
        ));
    });
    actionPages.forEach((blocks, index) => {
        slides.push(narrativeSlide(
            index === 0 ? 'Priority actions / next 90 days' : 'Priority actions / next 90 days  ·  continued',
            'Taken from the live attention queue. No invented program.',
            blocks,
            11 + decisionPages.length + index,
            index === actionPages.length - 1 ? 'Consent collector remains not configured / manual. No trend available.' : undefined,
        ));
    });

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}
</Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);
    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${slides.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}
  <Relationship Id="rId${slides.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
</Relationships>`);
    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId${slides.length + 1}"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}
  </p:sldIdLst>
  <p:sldSz cx="${W}" cy="${H}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);
    zip.file('ppt/theme/theme1.xml', THEME_XML);
    zip.file('ppt/slideMasters/slideMaster1.xml', SLIDE_MASTER_XML);
    zip.file('ppt/slideLayouts/slideLayout1.xml', SLIDE_LAYOUT_XML);
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);
    zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);
    slides.forEach((body, index) => {
        zip.file(`ppt/slides/slide${index + 1}.xml`, body);
        zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);
    });
    return {
        buffer: await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
        filenameParts: ['Supreme-Privacy-Board'],
        slideCount: slides.length,
    };
}

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Supreme Board">
  <a:themeElements>
    <a:clrScheme name="Supreme">
      <a:dk1><a:srgbClr val="0F172A"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1E293B"/></a:dk2>
      <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="C5A46E"/></a:accent1>
      <a:accent2><a:srgbClr val="334155"/></a:accent2>
      <a:accent3><a:srgbClr val="475569"/></a:accent3>
      <a:accent4><a:srgbClr val="94A3B8"/></a:accent4>
      <a:accent5><a:srgbClr val="CBD5E1"/></a:accent5>
      <a:accent6><a:srgbClr val="E2E8F0"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Supreme">
      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Supreme">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="100000"/><a:satMod val="600000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="100000"/><a:satMod val="200000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="91000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><p:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><p:spcBef><a:spcPct val="0"/></p:spcBef><p:buFont typeface="Arial"/><p:buNone/><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:defRPr></p:lvl1pPr></p:titleStyle>
    <p:bodyStyle><p:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></p:lvl1pPr></p:bodyStyle>
    <p:otherStyle><p:defPPr><a:defRPr lang="en-US"/></p:defPPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
