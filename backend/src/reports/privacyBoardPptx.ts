import JSZip from 'jszip';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { PRIVACY_HONESTY } from '../services/enterprisePrivacyEngine';
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
        <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
        ${fill ? solid(fill) : ''}
        ${stroke ? `<a:ln w="12700">${solid(stroke)}</a:ln>` : '<a:ln><a:noFill/></a:ln>'}
      </p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody>
    </p:sp>`;
}

function text(id: number, value: string, x: number, y: number, cx: number, cy: number, size: number, color: string, bold = false, align = 'l') {
    return `<p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="t${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t"/>
        <a:lstStyle/>
        <a:p>
          <a:pPr algn="${align}"/>
          <a:r><a:rPr lang="en-US" sz="${size}" b="${bold ? 1 : 0}" dirty="0">${solid(color)}</a:rPr><a:t>${xml(value.slice(0, 220))}</a:t></a:r>
        </a:p>
      </p:txBody>
    </p:sp>`;
}

function kpi(id: number, value: string, label: string, x: number) {
    return `${box(id, `k${id}`, x, 1680000, 2500000, 1280000, CARD, LINE)}
    ${text(id + 1, value, x, 1780000, 2500000, 700000, 2800, INK, true, 'ctr')}
    ${text(id + 2, label, x, 2480000, 2500000, 360000, 1100, SLATE, false, 'ctr')}`;
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

function lines(startId: number, items: string[], x: number, y: number) {
    return items.slice(0, 7).map((item, index) => text(startId + index, item, x, y + index * 380000, 11000000, 360000, 1400, INK)).join('');
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
    const slides: string[] = [];

    slides.push(slide(`
      ${box(2, 'cover', 0, 0, W, H, NAVY)}
      ${box(3, 'gold', 420000, 2100000, 1800000, 70000, GOLD)}
      ${text(4, 'SUPREME PRIVACY', 420000, 2280000, 11000000, 400000, 1400, GOLD, true)}
      ${text(5, 'Board Risk Committee report', 420000, 2700000, 11000000, 700000, 3600, 'FFFFFF', true)}
      ${text(6, pack.name, 420000, 3480000, 11000000, 400000, 1800, 'E2E8F0')}
      ${text(7, `${isoDate(generatedAt)}  ·  Live tenant records only  ·  No trend available`, 420000, 4000000, 11000000, 320000, 1300, '94A3B8')}
      ${text(8, 'Prepared for CPO, DPO, General Counsel, CISO, CRO, and the Board Risk Committee.', 420000, 5480000, 11000000, 320000, 1200, 'CBD5E1')}
      ${text(9, PRIVACY_HONESTY, 420000, 5880000, 11000000, 600000, 1000, '94A3B8')}
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
      ${footer(2, 12)}
    `));

    slides.push(slide(`
      ${header('Processing and data footprint', 'Where personal data is recorded to be processed.')}
      ${kpi(10, String(activities.length), 'Activities in view', 420000)}
      ${kpi(20, String(new Set(activities.flatMap((row) => row.jurisdictions || [])).size), 'Jurisdictions', 3120000)}
      ${kpi(30, String(new Set(activities.flatMap((row) => row.dataCategories?.map((item: { label: string }) => item.label) || [])).size), 'Data categories', 5820000)}
      ${kpi(40, String(new Set(activities.flatMap((row) => row.vendors?.map((item: { name: string }) => item.name) || [])).size), 'Linked processors', 8520000)}
      ${lines(60, activities.slice(0, 6).map((row) => `${row.publicId}  ${row.name}  ·  ${row.status}  ·  ${(row.jurisdictions || []).join(', ') || 'No jurisdiction recorded'}`), 420000, 3200000)}
      ${footer(3, 12)}
    `));

    const highRisk = activities.filter((row) => /high|critical/i.test(String(row.riskLevel || '')));
    slides.push(slide(`
      ${header('Highest privacy risks', 'Linked Supreme Risk records only. No invented residual scores.')}
      ${kpi(10, String(totals.highRiskProcessing), 'High-risk activities', 420000)}
      ${kpi(20, String(totals.openGaps), 'Open gaps', 3120000)}
      ${kpi(30, String(pack.dashboard.totals.processorsWithIssues || 0), 'Processors with issues', 5820000)}
      ${kpi(40, String(totals.evidenceRefresh || 0), 'Evidence refresh', 8520000)}
      ${lines(60, (highRisk.length ? highRisk : activities).slice(0, 6).map((row) => `${row.publicId}  ${row.name}  ·  risk ${row.riskLevel || 'Not scored'}`), 420000, 3200000)}
      ${text(90, highRisk.length ? '' : 'No separately scored high-risk activities. Showing recorded activities instead.', 420000, 5800000, 11000000, 300000, 1200, MUTED)}
      ${footer(4, 12)}
    `));

    slides.push(slide(`
      ${header('International transfer posture', 'A recorded mechanism is not a finding that a transfer is lawful.')}
      ${kpi(10, String(transfers.length), 'Transfers recorded', 420000)}
      ${kpi(20, String(totals.transfersRequiringReview), 'Review required', 3120000)}
      ${kpi(30, String(transfers.filter((row) => /scc|adequacy|bcr/i.test(String(row.mechanism))).length), 'Mechanism recorded', 5820000)}
      ${kpi(40, 'None invented', 'Lawfulness finding', 8520000)}
      ${lines(60, (transfers.length ? transfers : [{ publicId: '—', source: 'No transfer', destination: 'recorded', mechanism: '—', status: '—' }]).slice(0, 6).map((row) => `${row.publicId}  ${row.source} → ${row.destination}  ·  ${row.mechanism}  ·  ${row.status}`), 420000, 3200000)}
      ${footer(5, 12)}
    `));

    slides.push(slide(`
      ${header('Rights-request posture', 'Requester identity is withheld from this board view.')}
      ${kpi(10, String(totals.openRightsRequests), 'Open requests', 420000)}
      ${kpi(20, String(totals.overdueRightsRequests), 'Overdue (configured)', 3120000)}
      ${kpi(30, String(rights.length), 'Recorded requests', 5820000)}
      ${kpi(40, 'Configured', 'Deadline model', 8520000)}
      ${lines(60, (rights.length ? rights : [{ publicId: '—', requestType: 'No rights request recorded', status: '—', dueAt: null }]).slice(0, 6).map((row) => `${row.publicId}  ${row.requestType}  ·  ${row.status}  ·  configured due ${row.dueAt ? isoDate(new Date(row.dueAt)) : 'not set'}`), 420000, 3200000)}
      ${footer(6, 12)}
    `));

    slides.push(slide(`
      ${header('DPIA / assessment posture', 'Screening recommends review. It does not say a DPIA is legally required.')}
      ${kpi(10, String(dpias.length), 'DPIAs recorded', 420000)}
      ${kpi(20, String(totals.dpiasDue), 'DPIAs due', 3120000)}
      ${kpi(30, String(dpias.filter((row) => /complete/i.test(String(row.status))).length), 'Decisions recorded', 5820000)}
      ${kpi(40, 'Review', 'Not legal clearance', 8520000)}
      ${lines(60, (dpias.length ? dpias : [{ publicId: '—', title: 'No DPIA recorded', status: '—' }]).slice(0, 6).map((row) => `${row.publicId}  ${row.title}  ·  ${row.status}`), 420000, 3200000)}
      ${footer(7, 12)}
    `));

    slides.push(slide(`
      ${header('Vendor / processor exposure', 'Third Party identity is reused. Privacy adds role and links only.')}
      ${kpi(10, String(new Set(activities.flatMap((row) => row.vendors?.map((item: { name: string }) => item.name) || [])).size), 'Linked processors', 420000)}
      ${kpi(20, String(pack.dashboard.totals.processorsWithIssues || 0), 'With privacy issues', 3120000)}
      ${kpi(30, String(transfers.length), 'Transfer paths', 5820000)}
      ${kpi(40, String(totals.evidenceRefresh || 0), 'Evidence refresh', 8520000)}
      ${lines(60, activities.slice(0, 6).map((row) => `${row.publicId}  processors: ${(row.vendors || []).map((item: { name: string; role: string }) => `${item.name || 'Vendor'} (${item.role})`).join(', ') || 'None recorded'}`), 420000, 3200000)}
      ${footer(8, 12)}
    `));

    slides.push(slide(`
      ${header('Retention / deletion posture', 'Closed tasks are not proof that external-system data is deleted.')}
      ${kpi(10, String(retention.length), 'Retention rules', 420000)}
      ${kpi(20, String(totals.retentionActionsDue), 'Actions due', 3120000)}
      ${kpi(30, String(totals.deletionPending || 0), 'Deletion pending', 5820000)}
      ${kpi(40, 'Manual', 'Auto-delete', 8520000)}
      ${lines(60, (retention.length ? retention : [{ publicId: '—', period: 'No retention rule recorded', due: false }]).slice(0, 6).map((row) => `${row.publicId}  ${row.period}  ·  ${row.due ? 'Due' : 'Scheduled'}`), 420000, 3200000)}
      ${footer(9, 12)}
    `));

    slides.push(slide(`
      ${header('Evidence / control health', 'CLEAN presence is not proof. Shared #14 evidence is reused.')}
      ${kpi(10, String(totals.evidenceRefresh || 0), 'Evidence refresh', 420000)}
      ${kpi(20, String(totals.openGaps), 'Open gaps', 3120000)}
      ${kpi(30, 'Shared', 'Control plane', 5820000)}
      ${kpi(40, 'Fail-closed', 'Malware policy', 8520000)}
      ${lines(60, attention.filter((row) => /evidence|control|gap/i.test(row.type)).slice(0, 6).map((row) => `${row.publicId}  ${row.type}: ${row.why}`), 420000, 3200000)}
      ${text(90, attention.some((row) => /evidence|control|gap/i.test(row.type)) ? '' : 'No evidence or control attention items from live records.', 420000, 5800000, 11000000, 300000, 1200, MUTED)}
      ${footer(10, 12)}
    `));

    slides.push(slide(`
      ${header('Key decisions required', 'Human-authoritative. Supreme does not issue legal conclusions.')}
      ${lines(20, (attention.length ? attention : [{ publicId: '—', type: 'No decision required', why: 'No management action is required from the current live queue.' }]).slice(0, 7).map((row) => `${row.publicId}  ${row.type} — ${row.why}`), 420000, 1600000)}
      ${footer(11, 12)}
    `));

    slides.push(slide(`
      ${header('Priority actions / next 90 days', 'Taken from the live attention queue. No invented program.')}
      ${lines(20, (attention.length ? attention : [{ publicId: '—', type: 'Maintain current records', why: 'No overdue privacy action is recorded.' }]).slice(0, 7).map((row, index) => `${index + 1}. Review ${row.publicId} — ${row.type}`), 420000, 1600000)}
      ${text(90, 'Consent collector remains not configured / manual. No trend available.', 420000, 5600000, 11000000, 300000, 1200, MUTED)}
      ${footer(12, 12)}
    `));

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}
</Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);
    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${slides.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}
</Relationships>`);
    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    ${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}
  </p:sldIdLst>
  <p:sldSz cx="${W}" cy="${H}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);
    slides.forEach((body, index) => zip.file(`ppt/slides/slide${index + 1}.xml`, body));
    return {
        buffer: await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
        filenameParts: ['Supreme-Privacy-Board'],
        slideCount: slides.length,
    };
}
