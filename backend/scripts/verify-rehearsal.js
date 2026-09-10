const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    try {
        const vendor = await prisma.vendor.findUnique({ where: { id: 'vendor_rehearsal_baseline' } });
        const risk = await prisma.risk.findUnique({ where: { id: 'risk_rehearsal_baseline' } });
        const org = await prisma.organization.findUnique({ where: { id: 'org_rehearsal_baseline' } });
        if (!vendor || vendor.name !== 'Baseline Vendor Intact') {
            throw new Error('Vendor data was not intact after migration');
        }
        if (!risk || risk.title !== 'Baseline GRC risk') {
            throw new Error('GRC risk data was not intact after migration');
        }
        if (!org || org.plan == null || org.status == null) {
            throw new Error('Organization SaaS fields are not available');
        }
        await prisma.refreshToken.findMany({ take: 1 });
        await prisma.storedObject.findMany({ take: 1 });
        await prisma.auditEvent.findMany({ take: 1 });
        const fks = await prisma.$queryRaw`
            SELECT conname FROM pg_constraint WHERE conname = 'RefreshToken_userId_fkey'
        `;
        if (!Array.isArray(fks) || fks.length < 1) {
            throw new Error('RefreshToken foreign key missing');
        }
        const indexes = await prisma.$queryRaw`
            SELECT indexname FROM pg_indexes WHERE indexname = 'Organization_status_idx'
        `;
        if (!Array.isArray(indexes) || indexes.length < 1) {
            throw new Error('Organization_status_idx missing');
        }
        console.log('REHEARSAL_VERIFICATION=PASS');
        console.log(JSON.stringify({
            vendorIntact: vendor.name,
            riskIntact: risk.title,
            orgPlan: org.plan,
            orgStatus: org.status,
            saasModels: ['RefreshToken', 'StoredObject', 'AuditEvent'],
        }));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error('REHEARSAL_VERIFICATION=FAIL', error.message);
    process.exit(1);
});
