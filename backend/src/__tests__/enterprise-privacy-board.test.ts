import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { renderPrivacyBoardPptx } from '../reports/privacyBoardPptx';
import { prisma } from '../config/database';

jest.setTimeout(60000);

describe('supreme privacy board pptx', () => {
    it('builds a 12-slide widescreen board deck with honesty and no invented trend', async () => {
        const org = await prisma.organization.create({
            data: { name: `Privacy Board ${Date.now()}`, country: 'US', slug: `priv-board-${Date.now()}` },
        });
        const result = await renderPrivacyBoardPptx(org.id);
        expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
        expect(result.slideCount).toBe(12);
        const zip = await JSZip.loadAsync(result.buffer);
        const names = Object.keys(zip.files).filter((name) => name.startsWith('ppt/slides/slide'));
        expect(names).toHaveLength(12);
        const cover = await zip.file('ppt/slides/slide1.xml')?.async('text');
        const posture = await zip.file('ppt/slides/slide2.xml')?.async('text');
        expect(cover).toMatch(/Board Risk Committee/);
        expect(cover).toMatch(/Not legal advice|not a finding that processing is lawful/i);
        expect(cover).toMatch(/xml:space="preserve"/);
        expect(posture).toMatch(/No trend available/);
        expect(posture).not.toMatch(/>Notrendavailable</);
        expect(`${cover}${posture}`).not.toMatch(/you must notify/i);
        expect(`${cover}${posture}`).not.toMatch(/this processing is GDPR compliant/i);
        expect(zip.file('ppt/theme/theme1.xml')).toBeTruthy();
        expect(zip.file('ppt/slideMasters/slideMaster1.xml')).toBeTruthy();
        expect(zip.file('ppt/slideLayouts/slideLayout1.xml')).toBeTruthy();
        if (process.env.WRITE_BOARD_PPTX) {
            const dest = path.resolve(process.env.WRITE_BOARD_PPTX);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, result.buffer);
        }
    });
});
