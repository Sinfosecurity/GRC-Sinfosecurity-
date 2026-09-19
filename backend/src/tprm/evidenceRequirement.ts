import { ScanStatus } from '@prisma/client';
import type { WorkbookCatalog, WorkbookQuestion } from './workbookCatalog';
import { loadWorkbookCatalog } from './workbookCatalog';

export type EvidenceExpectation = 'REQUIRED' | 'OPTIONAL' | 'NOT_REQUIRED';

export function scanLabel(status?: ScanStatus | string | null) {
    if (status === ScanStatus.CLEAN || status === 'CLEAN' || status === 'Ready') return 'Clean';
    if (status === ScanStatus.PENDING || status === 'PENDING' || status === 'PENDING_SCAN' || status === 'Scanning') return 'Scanning';
    if (status === ScanStatus.INFECTED || status === 'INFECTED' || status === 'QUARANTINED' || status === 'Blocked' || status === 'Rejected') return 'Blocked';
    if (status === 'Uploading' || status === 'UPLOADING') return 'Uploaded';
    if (!status) return null;
    return 'Rejected/unusable';
}

export function isUsableEvidence(status?: ScanStatus | string | null) {
    return status === ScanStatus.CLEAN || status === 'CLEAN' || status === 'Ready' || status === 'Clean';
}

export function evidenceExpectationForQuestion(
    input: {
        controlId?: string | null;
        evidenceRequired?: boolean | null;
        expectedEvidence?: string | null;
        evidenceId?: string | null;
    },
    catalog: WorkbookCatalog = loadWorkbookCatalog()
): EvidenceExpectation {
    const workbook = catalog.questions.find((row) => row.controlId === input.controlId) as WorkbookQuestion | undefined;
    if (workbook) {
        if (workbook.evidenceId) {
            const item = catalog.evidence.find((row) => row.id === workbook.evidenceId);
            return String(item?.required || '').toLowerCase() === 'yes' ? 'REQUIRED' : 'OPTIONAL';
        }
        return workbook.expectedEvidence ? 'OPTIONAL' : 'NOT_REQUIRED';
    }
    if (input.evidenceRequired) return 'REQUIRED';
    if (input.expectedEvidence) return 'OPTIONAL';
    return 'NOT_REQUIRED';
}

export function presentEvidenceAttachment(row: {
    id: string;
    filename: string;
    contentType?: string | null;
    uploadedAt?: Date | string | null;
    createdAt?: Date | string | null;
    scanStatus?: ScanStatus | string | null;
}) {
    const scanState = scanLabel(row.scanStatus) || 'Rejected/unusable';
    return {
        id: row.id,
        filename: row.filename,
        fileType: row.contentType || 'application/octet-stream',
        uploadedAt: row.uploadedAt || row.createdAt || null,
        scanState,
        usable: isUsableEvidence(row.scanStatus),
        unusable: !isUsableEvidence(row.scanStatus),
    };
}
