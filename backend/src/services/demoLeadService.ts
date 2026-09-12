import fs from 'fs';
import { DemoLeadStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';

type JsonlRecord = {
    id: string;
    receivedAt?: string;
    name: string;
    email: string;
    company: string;
    role: string;
    companySize: string;
    primaryNeed: string;
    intent?: string;
    plan?: string;
    selectedPlan?: string;
    source?: string;
    salesNotification: string;
    prospectAcknowledgement: string;
    duplicateOf?: string;
};

export async function persistDemoLead(record: JsonlRecord) {
    try {
        await prisma.demoLead.upsert({
            where: { id: record.id },
            update: {
                salesNotification: record.salesNotification,
                prospectAcknowledgement: record.prospectAcknowledgement,
                duplicateOf: record.duplicateOf,
            },
            create: {
                id: record.id,
                name: record.name,
                email: record.email,
                company: record.company,
                role: record.role,
                companySize: record.companySize,
                primaryNeed: record.primaryNeed,
                intent: record.intent || 'demo',
                selectedPlan: record.selectedPlan || record.plan,
                source: record.source,
                salesNotification: record.salesNotification,
                prospectAcknowledgement: record.prospectAcknowledgement,
                duplicateOf: record.duplicateOf,
                submittedAt: record.receivedAt ? new Date(record.receivedAt) : new Date(),
            },
        });
    } catch {
        // JSONL remains the compatibility path if Postgres is unavailable during a public submit.
    }
}

export async function importJsonlLeads(filePath: string) {
    if (!fs.existsSync(filePath)) return { imported: 0 };
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
    let imported = 0;
    for (const line of lines) {
        try {
            const row = JSON.parse(line) as JsonlRecord;
            if (!row.id || !row.email) continue;
            await persistDemoLead(row);
            imported += 1;
        } catch {
            // skip malformed historical lines
        }
    }
    return { imported };
}

export const demoLeadService = {
    persist: persistDemoLead,
    importJsonlLeads,
    async list() {
        const store = process.env.DEMO_REQUEST_STORE_PATH;
        if (store) {
            await importJsonlLeads(store);
        }
        return prisma.demoLead.findMany({
            orderBy: { submittedAt: 'desc' },
            take: 200,
        });
    },
    async update(input: {
        id: string;
        actorUserId: string;
        leadStatus?: DemoLeadStatus;
        assignedToUserId?: string | null;
        internalNotes?: string;
        lastContactedAt?: Date | null;
        nextAction?: string | null;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        const existing = await prisma.demoLead.findUnique({ where: { id: input.id } });
        if (!existing) throw new ApiError(404, 'Demo request not found');
        const updated = await prisma.demoLead.update({
            where: { id: input.id },
            data: {
                ...(input.leadStatus ? { leadStatus: input.leadStatus } : {}),
                ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId } : {}),
                ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
                ...(input.lastContactedAt !== undefined ? { lastContactedAt: input.lastContactedAt } : {}),
                ...(input.nextAction !== undefined ? { nextAction: input.nextAction } : {}),
            },
        });
        await recordAudit({
            actorUserId: input.actorUserId,
            action: 'platform.lead_updated',
            resourceType: 'DemoLead',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { leadStatus: updated.leadStatus, assignedToUserId: updated.assignedToUserId },
        });
        return updated;
    },
};
