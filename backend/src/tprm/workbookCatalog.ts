import { readFileSync } from 'fs';
import { join } from 'path';

export const TPRM_CATALOG_VERSION = 'workbook-1.0.0';

export type WorkbookQuestion = {
    controlId: string;
    domain: string;
    topic: string;
    question: string;
    guidance: string;
    expectedEvidence: string;
    weight: number;
    pack: string;
    evidenceId?: string | null;
};

export type WorkbookCatalog = {
    catalogVersion: string;
    source: string;
    inherentRisk: Array<{ id: string; topic: string; question: string }>;
    scopePacks: Array<{ pack: string; useWhen: string; questions: number | null }>;
    questions: WorkbookQuestion[];
    evidence: Array<{ id: string; request: string; domain: string; required?: string | null }>;
};

export const WORKBOOK_PACK_KEYS = [
    { key: 'baseline', name: 'Baseline', templateKey: 'tprm-baseline', workbookName: 'Baseline' },
    { key: 'personal-sensitive-data', name: 'Personal and Sensitive Data', templateKey: 'tprm-personal-sensitive-data', workbookName: 'Personal and Sensitive Data' },
    { key: 'software-api', name: 'Software and API', templateKey: 'tprm-software-api', workbookName: 'Software and API' },
    { key: 'cloud-hosting', name: 'Cloud Hosting', templateKey: 'tprm-cloud-hosting', workbookName: 'Cloud Hosting' },
    { key: 'privileged-network', name: 'Privileged and Network Access', templateKey: 'tprm-privileged-network', workbookName: 'Privileged and Network Access' },
    { key: 'critical-operations', name: 'Critical Operations', templateKey: 'tprm-critical-operations', workbookName: 'Critical Operations' },
    { key: 'regulated-service', name: 'Regulated Service', templateKey: 'tprm-regulated-service', workbookName: 'Regulated Service' },
    { key: 'physical-delivery', name: 'Physical Delivery', templateKey: 'tprm-physical-delivery', workbookName: 'Physical Delivery' },
] as const;

export type WorkbookPackKey = typeof WORKBOOK_PACK_KEYS[number]['key'];

let cached: WorkbookCatalog | null = null;

function catalogPath() {
    return join(__dirname, '../../../docs/tprm/workbook-catalog.json');
}

export function loadWorkbookCatalog(): WorkbookCatalog {
    if (cached) return cached;
    const raw = JSON.parse(readFileSync(catalogPath(), 'utf8')) as WorkbookCatalog;
    cached = raw;
    return raw;
}

export function workbookPackCounts(catalog: WorkbookCatalog = loadWorkbookCatalog()) {
    const counts: Record<string, number> = {};
    for (const pack of WORKBOOK_PACK_KEYS) counts[pack.key] = 0;
    for (const question of catalog.questions) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.workbookName === question.pack);
        if (pack) counts[pack.key] += 1;
    }
    return counts;
}

export function workbookControlIdsForPacks(packKeys: string[], catalog: WorkbookCatalog = loadWorkbookCatalog()) {
    const wanted = new Set<string>();
    for (const key of packKeys) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.key === key || row.templateKey === key);
        if (pack) wanted.add(pack.workbookName);
    }
    return catalog.questions.filter((row) => wanted.has(row.pack)).map((row) => row.controlId);
}

export function workbookEvidenceForDomains(domains: string[], catalog: WorkbookCatalog = loadWorkbookCatalog()) {
    const wanted = new Set(domains);
    return catalog.evidence.filter((row) => wanted.has(row.domain));
}

export function workbookDomainsForPacks(packKeys: string[], catalog: WorkbookCatalog = loadWorkbookCatalog()) {
    const wanted = new Set<string>();
    for (const key of packKeys) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.key === key || row.templateKey === key);
        if (pack) wanted.add(pack.workbookName);
    }
    return [...new Set(catalog.questions.filter((row) => wanted.has(row.pack)).map((row) => row.domain))];
}

export function assertWorkbookCatalogShape(catalog: WorkbookCatalog = loadWorkbookCatalog()) {
    const counts = workbookPackCounts(catalog);
    return {
        catalogVersion: catalog.catalogVersion,
        inherentRiskCount: catalog.inherentRisk.length,
        packCount: WORKBOOK_PACK_KEYS.length,
        questionCount: catalog.questions.length,
        packCounts: counts,
        weights: [...new Set(catalog.questions.map((row) => row.weight))].sort((a, b) => a - b),
        evidenceCount: catalog.evidence.length,
        evidenceDomains: [...new Set(catalog.evidence.map((row) => row.domain))].sort(),
    };
}
