import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { paginateBoardNarrative, renderAiBoardPptx, wrapBoardLine } from '../reports/aiBoardPptx';
import { prisma } from '../config/database';

jest.setTimeout(60000);

describe('supreme AI governance board pptx', () => {
    it('builds a widescreen board deck with honesty and no invented trend', async () => {
        const org = await prisma.organization.create({
            data: { name: `AI Board ${Date.now()}`, country: 'US', slug: `ai-board-${Date.now()}` },
        });
        const result = await renderAiBoardPptx(org.id);
        expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
        expect(result.slideCount).toBeGreaterThanOrEqual(12);
        const zip = await JSZip.loadAsync(result.buffer);
        const names = Object.keys(zip.files).filter((name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        expect(names).toHaveLength(result.slideCount);
        const cover = await zip.file('ppt/slides/slide1.xml')?.async('text');
        const posture = await zip.file('ppt/slides/slide2.xml')?.async('text');
        const allSlides = (await Promise.all(names.map((name) => zip.file(name)?.async('text')))).join('');
        expect(cover).toMatch(/Board Risk Committee/);
        expect(cover).toMatch(/not an approval or a legal finding/i);
        expect(cover).toMatch(/xml:space="preserve"/);
        expect(posture).toMatch(/No trend available/);
        expect(allSlides).not.toMatch(/eu ai act high-risk|iso 42001 certified|ai analysis says/i);
        expect(allSlides).not.toMatch(/spcAft=|spcBef=/);
        expect(zip.file('ppt/theme/theme1.xml')).toBeTruthy();
        expect(zip.file('ppt/slideMasters/slideMaster1.xml')).toBeTruthy();
        if (process.env.WRITE_AI_BOARD_PPTX) {
            const dest = path.resolve(process.env.WRITE_AI_BOARD_PPTX);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, result.buffer);
        }
    });

    it('wraps long decision copy instead of cutting it', () => {
        const line = 'AI-00001  Unapproved production AI — AI-00001 is recorded as PRODUCTION without a current human approval. This is not a legal conclusion.';
        const rows = wrapBoardLine(line, 88);
        expect(rows.join(' ')).toBe(line.replace(/\s+/g, ' ').trim());
        expect(rows.some((row) => row.includes('legal conclusion'))).toBe(true);
        const pages = paginateBoardNarrative([
            line,
            'TST-00002  Failed test — TST-00002 BIAS_FAIRNESS is recorded as fail. This is not an invented result.',
        ]);
        const text = pages.flatMap((page) => page.flatMap((block) => block.rows)).join(' ');
        expect(text).toContain('not a legal conclusion');
        expect(text).toContain('not an invented result');
    });
});
