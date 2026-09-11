import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const staging = process.env.APP_ENVIRONMENT === 'staging';
    const demoOrg = await prisma.organization.upsert({
        where: { id: 'demo-org-001' },
        update: {
            isDemo: !staging,
            slug: staging ? 'supreme-risk-staging' : 'supreme-risk-demo',
            name: staging ? 'Supreme Risk Staging Workspace' : 'Supreme Risk Demo Workspace',
        },
        create: {
            id: 'demo-org-001',
            name: staging ? 'Supreme Risk Staging Workspace' : 'Supreme Risk Demo Workspace',
            industry: 'Information Technology',
            country: 'USA',
            size: '50-200',
            slug: staging ? 'supreme-risk-staging' : 'supreme-risk-demo',
            status: 'TRIAL',
            plan: 'PROFESSIONAL',
            isDemo: !staging,
        },
    });

    console.log('✅ Created organization:', demoOrg.name);

    // Create demo admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@sinfosecurity.com' },
        update: {
            hashedPassword,
            role: 'ORGANIZATION_ADMIN',
            organizationId: demoOrg.id,
            status: 'ACTIVE',
        },
        create: {
            email: 'admin@sinfosecurity.com',
            hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ORGANIZATION_ADMIN',
            organizationId: demoOrg.id,
        },
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create demo compliance manager
    const hashedAssessorPassword = await bcrypt.hash('Compliance@123', 10);
    const complianceUser = await prisma.user.upsert({
        where: { email: 'compliance@sinfosecurity.com' },
        update: {
            hashedPassword: hashedAssessorPassword,
            role: 'ASSESSOR',
            organizationId: demoOrg.id,
            status: 'ACTIVE',
        },
        create: {
            email: 'compliance@sinfosecurity.com',
            hashedPassword: hashedAssessorPassword,
            firstName: 'Jane',
            lastName: 'Compliance',
            role: 'ASSESSOR',
            organizationId: demoOrg.id,
        },
    });

    console.log('✅ Created compliance user:', complianceUser.email);

    // Create demo compliance framework (GDPR)
    const gdprFramework = await prisma.complianceFramework.upsert({
        where: { id: 'gdpr-001' },
        update: {},
        create: {
            id: 'gdpr-001',
            name: 'GDPR Compliance',
            type: 'GDPR',
            version: '2023',
            organizationId: demoOrg.id,
            score: 68,
        },
    });

    console.log('✅ Created GDPR framework');

    // Create ISO 27001 framework
    const isoFramework = await prisma.complianceFramework.upsert({
        where: { id: 'iso27001-001' },
        update: {},
        create: {
            id: 'iso27001-001',
            name: 'ISO 27001:2022',
            type: 'ISO27001',
            version: '2022',
            organizationId: demoOrg.id,
            score: 72,
        },
    });

    console.log('✅ Created ISO 27001 framework');

    const demoRisk = await prisma.risk.upsert({
        where: { id: 'demo-risk-001' },
        update: {},
        create: {
            id: 'demo-risk-001',
            title: 'Data Breach Risk',
            description: 'Potential unauthorized access to customer data',
            category: 'CYBERSECURITY',
            likelihood: 4,
            impact: 5,
            riskScore: 20,
            status: 'ASSESSED',
            ownerId: adminUser.id,
            organizationId: demoOrg.id,
            mitigation: 'Implement MFA and encryption',
        },
    });

    console.log('✅ Created demo risk:', demoRisk.title);

    const demoControl = await prisma.control.upsert({
        where: { id: 'demo-control-001' },
        update: {},
        create: {
            id: 'demo-control-001',
            name: 'Multi-Factor Authentication',
            description: 'Require MFA for all user accounts',
            type: 'PREVENTIVE',
            category: 'Access Control',
            status: 'IMPLEMENTED',
            effectiveness: 5,
            organizationId: demoOrg.id,
        },
    });

    console.log('✅ Created demo control:', demoControl.name);

    await prisma.riskControl.upsert({
        where: { riskId_controlId: { riskId: demoRisk.id, controlId: demoControl.id } },
        update: {},
        create: {
            riskId: demoRisk.id,
            controlId: demoControl.id,
        },
    });

    console.log('✅ Linked risk to control');

    const demoPolicy = await prisma.policy.upsert({
        where: { id: 'demo-policy-001' },
        update: {},
        create: {
            id: 'demo-policy-001',
            title: 'Information Security Policy',
            description: 'Organization-wide security policy',
            content: '# Information Security Policy\n\nThis policy defines...',
            version: '1.0',
            status: 'PUBLISHED',
            category: 'Security',
            ownerId: adminUser.id,
            organizationId: demoOrg.id,
            approvedAt: new Date(),
            effectiveDate: new Date(),
        },
    });

    console.log('✅ Created demo policy:', demoPolicy.title);

    await prisma.vendor.upsert({
        where: { id: 'demo-vendor-cloud-001' },
        update: {},
        create: {
            id: 'demo-vendor-cloud-001',
            name: 'Northwind Cloud',
            legalName: 'Northwind Cloud LLC',
            vendorType: 'SAAS',
            category: 'CLOUD_HOSTING',
            tier: 'CRITICAL',
            status: 'ACTIVE',
            organizationId: demoOrg.id,
            primaryContact: 'Alex Rivera',
            contactEmail: 'alex@northwind-cloud.example',
            website: 'https://northwind-cloud.example',
            servicesProvided: 'Cloud infrastructure, identity, and backup',
            inherentRiskScore: 72,
            residualRiskScore: 48,
            criticalityLevel: 'CRITICAL',
            dataTypesAccessed: ['PII', 'IP'],
            geographicFootprint: ['USA'],
            regulatoryScope: ['SOC2', 'ISO27001'],
            onboardedAt: new Date(),
            nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
    });

    await prisma.vendor.upsert({
        where: { id: 'demo-vendor-payroll-001' },
        update: {},
        create: {
            id: 'demo-vendor-payroll-001',
            name: 'Harbor Payroll',
            legalName: 'Harbor Payroll Inc',
            vendorType: 'SAAS',
            category: 'HR_PAYROLL',
            tier: 'HIGH',
            status: 'ACTIVE',
            organizationId: demoOrg.id,
            primaryContact: 'Sam Patel',
            contactEmail: 'sam@harbor-payroll.example',
            website: 'https://harbor-payroll.example',
            servicesProvided: 'Payroll processing and benefits administration',
            inherentRiskScore: 58,
            residualRiskScore: 36,
            criticalityLevel: 'HIGH',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['USA', 'Canada'],
            regulatoryScope: ['SOC2'],
            onboardedAt: new Date(),
            nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('✅ Created demo vendors');

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('📋 Demo Credentials:');
    console.log('   Admin: admin@sinfosecurity.com / Admin@123');
    console.log('   Compliance: compliance@sinfosecurity.com / Compliance@123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

