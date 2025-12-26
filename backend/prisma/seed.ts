import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo organization
    const demoOrg = await prisma.organization.upsert({
        where: { id: 'demo-org-001' },
        update: {},
        create: {
            id: 'demo-org-001',
            name: 'Sinfosecurity Demo',
            industry: 'Information Technology',
            country: 'USA',
            size: '50-200',
        },
    });

    console.log('✅ Created organization:', demoOrg.name);

    // Create demo admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@sinfosecurity.com' },
        update: {},
        create: {
            email: 'admin@sinfosecurity.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            organizationId: demoOrg.id,
        },
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create demo compliance manager
    const complianceUser = await prisma.user.upsert({
        where: { email: 'compliance@sinfosecurity.com' },
        update: {},
        create: {
            email: 'compliance@sinfosecurity.com',
            password: await bcrypt.hash('Compliance@123', 10),
            firstName: 'Jane',
            lastName: 'Compliance',
            role: 'COMPLIANCE_OFFICER',
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

    // Create demo risk
    const demoRisk = await prisma.risk.create({
        data: {
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

    // Create demo control
    const demoControl = await prisma.control.create({
        data: {
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

    // Link risk and control
    await prisma.riskControl.create({
        data: {
            riskId: demoRisk.id,
            controlId: demoControl.id,
        },
    });

    console.log('✅ Linked risk to control');

    // Create demo policy
    const demoPolicy = await prisma.policy.create({
        data: {
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

