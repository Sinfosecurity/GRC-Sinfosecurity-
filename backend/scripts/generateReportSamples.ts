import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';
import { renderBoardPdf } from '../src/reports/boardExport';
import { renderExecutivePdf } from '../src/reports/executivePdf';
import { renderFindingsPdf } from '../src/reports/findingsExport';
import { renderMonitoringPdf } from '../src/reports/monitoringExport';
import { renderDecisionBriefPdf } from '../src/reports/decisionBriefPdf';
import { renderVendorScorecardPdf } from '../src/reports/vendorScorecardPdf';
import { renderAssessmentPdf } from '../src/reports/assessmentPdf';
import { downloadFilename } from '../src/reports/sendDownload';

async function main() {
    const outDir = process.env.REPORT_QA_DIR || path.join('/tmp', 'supreme-risk-report-qa');
    fs.mkdirSync(outDir, { recursive: true });

    const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!organization) throw new Error('No organization in database');

    const vendor = await prisma.vendor.findFirst({
        where: { organizationId: organization.id },
        orderBy: { residualRiskScore: 'desc' },
    }) || await prisma.vendor.findFirst({ where: { name: { contains: 'Northwind' } } });

    const brief = vendor
        ? await prisma.riskDecisionBrief.findFirst({ where: { organizationId: organization.id, vendorId: vendor.id }, orderBy: { createdAt: 'desc' } })
        : await prisma.riskDecisionBrief.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } });

    const assessment = vendor
        ? await prisma.vendorAssessment.findFirst({ where: { organizationId: organization.id, vendorId: vendor.id }, orderBy: { createdAt: 'desc' } })
        : await prisma.vendorAssessment.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: 'desc' } });

    const jobs: Array<{ name: string; run: () => Promise<{ buffer: Buffer; filenameParts: string[] }> }> = [
        { name: 'board', run: () => renderBoardPdf(organization.id) },
        { name: 'executive', run: () => renderExecutivePdf(organization.id) },
        { name: 'findings', run: () => renderFindingsPdf(organization.id) },
        { name: 'monitoring', run: () => renderMonitoringPdf(organization.id) },
    ];
    if (brief) jobs.push({ name: 'decision-brief', run: () => renderDecisionBriefPdf(organization.id, brief.id) });
    if (vendor) jobs.push({ name: 'vendor-scorecard', run: () => renderVendorScorecardPdf(organization.id, vendor.id) });
    if (assessment) jobs.push({ name: 'assessment', run: () => renderAssessmentPdf(organization.id, assessment.id) });

    const manifest: Array<{ name: string; file: string; bytes: number }> = [];
    for (const job of jobs) {
        const { buffer, filenameParts } = await job.run();
        const file = downloadFilename(filenameParts, 'pdf');
        const dest = path.join(outDir, file);
        fs.writeFileSync(dest, buffer);
        manifest.push({ name: job.name, file, bytes: buffer.length });
        console.log(`${job.name}\t${file}\t${buffer.length}`);
    }
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
        organization: organization.name,
        vendor: vendor?.name,
        briefId: brief?.id,
        assessmentId: assessment?.id,
        files: manifest,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
