import { recordAudit } from '../services/auditEventService';
import { downloadFilename, sendBinaryFile } from './sendDownload';
import { renderDecisionBriefPdf } from './decisionBriefPdf';
import { renderExecutivePdf } from './executivePdf';
import { renderVendorScorecardPdf } from './vendorScorecardPdf';
import { renderAssessmentPdf } from './assessmentPdf';
import { renderFindingsCsv, renderFindingsPdf, renderFindingsXlsx } from './findingsExport';
import { renderMonitoringCsv, renderMonitoringPdf } from './monitoringExport';
import { renderBoardPdf, renderBoardPptx } from './boardExport';
import type { ReportFilters } from './portfolioData';

type Actor = { organizationId: string; userId: string };

async function auditedDownload(
    actor: Actor,
    resourceType: string,
    resourceId: string | undefined,
    format: string,
    filenameParts: string[],
    extension: string,
    contentType: string,
    buffer: Buffer,
    res: import('express').Response
) {
    const filename = downloadFilename(filenameParts, extension);
    await recordAudit({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'report.export',
        resourceType,
        resourceId,
        result: 'success',
        metadata: { format, filename },
    });
    sendBinaryFile(res, buffer, contentType, filename);
}

export const reportGenerationService = {
    async decisionBriefPdf(actor: Actor, briefId: string, res: import('express').Response) {
        const { buffer, filenameParts } = await renderDecisionBriefPdf(actor.organizationId, briefId);
        await auditedDownload(actor, 'RiskDecisionBrief', briefId, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async executivePdf(actor: Actor, filters: ReportFilters, res: import('express').Response) {
        const { buffer, filenameParts } = await renderExecutivePdf(actor.organizationId, filters);
        await auditedDownload(actor, 'ExecutiveReport', undefined, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async vendorScorecardPdf(actor: Actor, vendorId: string, res: import('express').Response) {
        const { buffer, filenameParts } = await renderVendorScorecardPdf(actor.organizationId, vendorId);
        await auditedDownload(actor, 'VendorScorecard', vendorId, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async assessmentPdf(actor: Actor, assessmentId: string, res: import('express').Response) {
        const { buffer, filenameParts } = await renderAssessmentPdf(actor.organizationId, assessmentId);
        await auditedDownload(actor, 'VendorAssessment', assessmentId, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async findings(actor: Actor, format: 'pdf' | 'csv' | 'xlsx', filters: ReportFilters, res: import('express').Response) {
        if (format === 'csv') {
            const { buffer, filenameParts } = await renderFindingsCsv(actor.organizationId, filters);
            await auditedDownload(actor, 'VendorIssue', undefined, 'csv', filenameParts, 'csv', 'text/csv', buffer, res);
            return;
        }
        if (format === 'xlsx') {
            const { buffer, filenameParts } = await renderFindingsXlsx(actor.organizationId, filters);
            await auditedDownload(actor, 'VendorIssue', undefined, 'xlsx', filenameParts, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer, res);
            return;
        }
        const { buffer, filenameParts } = await renderFindingsPdf(actor.organizationId, filters);
        await auditedDownload(actor, 'VendorIssue', undefined, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async monitoring(actor: Actor, format: 'pdf' | 'csv', filters: ReportFilters, res: import('express').Response) {
        if (format === 'csv') {
            const { buffer, filenameParts } = await renderMonitoringCsv(actor.organizationId, filters);
            await auditedDownload(actor, 'VendorMonitoring', undefined, 'csv', filenameParts, 'csv', 'text/csv', buffer, res);
            return;
        }
        const { buffer, filenameParts } = await renderMonitoringPdf(actor.organizationId, filters);
        await auditedDownload(actor, 'VendorMonitoring', undefined, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
    async board(actor: Actor, format: 'pdf' | 'pptx', filters: ReportFilters, res: import('express').Response) {
        if (format === 'pptx') {
            const { buffer, filenameParts } = await renderBoardPptx(actor.organizationId, filters);
            await auditedDownload(actor, 'BoardReport', undefined, 'pptx', filenameParts, 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer, res);
            return;
        }
        const { buffer, filenameParts } = await renderBoardPdf(actor.organizationId, filters);
        await auditedDownload(actor, 'BoardReport', undefined, 'pdf', filenameParts, 'pdf', 'application/pdf', buffer, res);
    },
};
