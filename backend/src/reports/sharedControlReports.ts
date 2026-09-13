import { createReportPdf } from './reportLayout';
import { drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { reportId } from './reportTheme';
import { isoDate } from './sendDownload';

type CoverageReport = Awaited<ReturnType<typeof import('../services/sharedControlEvidenceService').coverageReport>>;

export async function renderSharedControlReport(kind: string, report: CoverageReport) {
    const titles: Record<string, string> = {
        'control-coverage': 'Control Coverage Report',
        'evidence-coverage': 'Evidence Coverage Report',
        'framework-readiness': 'Framework Readiness Report',
        'control-testing': 'Control Testing Report',
    };
    const title = titles[kind] || 'Shared Control Report';
    const generatedAt = new Date(report.generatedAt);
    return createReportPdf({
        title,
        subtitle: 'Readiness and mapping from live tenant records. Not a certification or attestation.',
        organizationName: 'This organization',
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('SCC', generatedAt),
        classification: 'Confidential — Operational',
        footerNote: `${report.honesty} Generated ${isoDate(generatedAt)} from live tenant data.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Honesty');
        drawParagraph(doc, report.honesty);
        if (kind === 'control-coverage' || kind === 'framework-readiness') {
            drawSectionTitle(doc, 'Control posture');
            drawKpiRow(doc, [
                { label: 'Controls', value: report.controlCoverage.controlCount },
                { label: 'Implemented', value: report.controlCoverage.implemented },
                { label: 'Tested', value: report.controlCoverage.tested },
                { label: 'Ineffective', value: report.controlCoverage.ineffective, tone: report.controlCoverage.ineffective ? 'high' : 'low' },
            ]);
        }
        if (kind === 'evidence-coverage') {
            drawSectionTitle(doc, 'Evidence reuse');
            drawKpiRow(doc, [
                { label: 'Objects', value: report.evidenceCoverage.objects },
                { label: 'CLEAN usable', value: report.evidenceCoverage.cleanUsable },
                { label: 'Reused', value: report.evidenceCoverage.reused },
            ]);
            drawParagraph(doc, 'Only CLEAN files can be treated as usable supporting evidence. Scan status is never assumed.');
        }
        if (kind === 'framework-readiness') {
            drawSectionTitle(doc, 'Framework readiness');
            drawParagraph(doc, 'Counts are mapped / implemented / tested / gap. They do not mean certified or compliant.');
            drawProfessionalTable(
                doc,
                [
                    { key: 'name', header: 'Framework', width: 180 },
                    { key: 'mapped', header: 'Mapped', width: 70, align: 'right' },
                    { key: 'implemented', header: 'Implemented', width: 80, align: 'right' },
                    { key: 'tested', header: 'Tested', width: 70, align: 'right' },
                    { key: 'gaps', header: 'Gaps', width: 70, align: 'right' },
                ],
                report.frameworkReadiness.frameworks.map((row) => ({
                    name: row.name,
                    mapped: row.mapped,
                    implemented: row.implemented,
                    tested: row.tested,
                    gaps: row.gaps,
                })),
                'No framework packs',
                'Framework identifiers have not been adopted for this organization yet.'
            );
        }
        if (kind === 'control-testing') {
            drawSectionTitle(doc, 'Recent tests');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Test', width: 90 },
                    { key: 'result', header: 'Result', width: 110, badge: true },
                    { key: 'date', header: 'Date', width: 90 },
                    { key: 'finding', header: 'Finding linked', width: 110 },
                ],
                report.controlTesting.slice(0, 40).map((row) => ({
                    id: row.id.slice(0, 8),
                    result: row.result,
                    date: isoDate(row.testedAt),
                    finding: row.findingId ? 'Yes' : 'No',
                })),
                'No control tests',
                'No control tests have been recorded for this organization.'
            );
        }
    });
}
