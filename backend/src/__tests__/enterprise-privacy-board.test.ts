import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { paginateBoardNarrative, renderPrivacyBoardPptx, wrapBoardLine } from '../reports/privacyBoardPptx';
import { prisma } from '../config/database';

jest.setTimeout(60000);

describe('supreme privacy board pptx', () => {
    it('builds a 12-slide widescreen board deck with honesty and no invented trend', async () => {
        const org = await prisma.organization.create({
            data: { name: `Privacy Board ${Date.now()}`, country: 'US', slug: `priv-board-${Date.now()}` },
        });
        const result = await renderPrivacyBoardPptx(org.id);
        expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
        expect(result.slideCount).toBeGreaterThanOrEqual(12);
        const zip = await JSZip.loadAsync(result.buffer);
        const names = Object.keys(zip.files).filter((name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        expect(names).toHaveLength(result.slideCount);
        const cover = await zip.file('ppt/slides/slide1.xml')?.async('text');
        const posture = await zip.file('ppt/slides/slide2.xml')?.async('text');
        const allSlides = (await Promise.all(names.map((name) => zip.file(name)?.async('text')))).join('');
        expect(cover).toMatch(/Board Risk Committee/);
        expect(cover).toMatch(/Not legal advice|not a finding that processing is lawful/i);
        expect(cover).toMatch(/xml:space="preserve"/);
        expect(posture).toMatch(/No trend available/);
        expect(posture).not.toMatch(/>Notrendavailable</);
        expect(`${cover}${posture}`).not.toMatch(/you must notify/i);
        expect(`${cover}${posture}`).not.toMatch(/this processing is GDPR compliant/i);
        expect(allSlides).not.toMatch(/spcAft=|spcBef=/);
        expect(zip.file('ppt/theme/theme1.xml')).toBeTruthy();
        expect(zip.file('ppt/slideMasters/slideMaster1.xml')).toBeTruthy();
        expect(zip.file('ppt/slideLayouts/slideLayout1.xml')).toBeTruthy();
        if (process.env.WRITE_BOARD_PPTX) {
            const dest = path.resolve(process.env.WRITE_BOARD_PPTX);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, result.buffer);
        }
    });

    it('wraps long decision copy instead of cutting it at 140 characters', () => {
        const line = 'GAP-00001  Open privacy-related gap — GAP-00001 500.07 is mapped to controls that are not implemented. A gap is remaining work, not a legal conclusion.';
        const rows = wrapBoardLine(line, 88);
        expect(rows.join(' ')).toBe(line.replace(/\s+/g, ' ').trim());
        expect(rows.some((row) => row.includes('legal conclusion'))).toBe(true);
        const pages = paginateBoardNarrative([
            line,
            'XFR-00004  Transfer requiring review — XFR-00004 US-NY → IE is recorded as review required. This is not a lawfulness finding.',
        ]);
        const text = pages.flatMap((page) => page.flatMap((block) => block.rows)).join(' ');
        expect(text).toContain('not a legal conclusion');
        expect(text).toContain('not a lawfulness finding');
        expect(text).not.toMatch(/legal c$/);
    });

    it('opens a continuation page when decision copy exceeds one region', () => {
        const items = Array.from({ length: 12 }, (_, index) => (
            `${index + 1}. GAP-0000${index} Open privacy-related gap — control ${index} is mapped but not implemented. A gap is remaining work, not a legal conclusion.`
        ));
        const pages = paginateBoardNarrative(items);
        expect(pages.length).toBeGreaterThan(1);
        expect(pages.flatMap((page) => page.flatMap((block) => block.rows)).join(' ')).toContain('not a legal conclusion');
        expect(pages.every((page) => page.every((block) => !block.rows.join(' ').match(/\sA$/)))).toBe(true);
    });

    it('keeps a decision item together instead of leaving a one-word widow on the prior slide', () => {
        const first = 'XFR-00001  Transfer requiring review — XFR-00001 US-NY → IE is recorded as review required. This is not a lawfulness finding.';
        const second = 'GAP-00002  Open privacy-related gap — GAP-00002 500.07 has no current ready evidence. A gap is remaining work, not a legal conclusion.';
        const filler = Array.from({ length: 6 }, (_, index) => (
            `${index + 1}. Review XFR-0000${index} — Transfer requiring review. US-NY → IE is recorded as review required. This is not a lawfulness finding.`
        ));
        const pages = paginateBoardNarrative([...filler, first, second]);
        const flattened = pages.map((page) => page.map((block) => block.rows.join(' ')));
        expect(flattened.flat().some((row) => row.includes('not a legal conclusion'))).toBe(true);
        expect(flattened.flat().some((row) => row.trim() === 'A')).toBe(false);
        expect(flattened.some((page) => page.some((row) => row.includes('GAP-00002') && row.includes('legal conclusion')))).toBe(true);
    });
});
