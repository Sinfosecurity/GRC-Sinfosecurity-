/**
 * One-time first Platform Owner bootstrap.
 * Refuses to run when any platform owner already exists.
 * Never prints or stores a default password. The generated password is written once to stdout.
 */
import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword, randomToken, timingSafeEqualString } from '../services/passwordService';
import { recordAudit } from '../services/auditEventService';

const OWNER_ROLES = [Role.PLATFORM_OWNER, Role.PLATFORM_ADMIN, Role.SUPERADMIN];

async function main() {
    if (process.env.PLATFORM_OWNER_BOOTSTRAP_ENABLED !== 'true') {
        throw new Error('Bootstrap is disabled. Set PLATFORM_OWNER_BOOTSTRAP_ENABLED=true intentionally.');
    }
    const expected = process.env.PLATFORM_OWNER_BOOTSTRAP_TOKEN || '';
    const provided = process.env.PLATFORM_OWNER_BOOTSTRAP_TOKEN_INPUT || expected;
    if (!expected || expected.length < 32 || !timingSafeEqualString(expected, provided)) {
        throw new Error('Bootstrap token is missing or does not match.');
    }
    const email = (process.env.PLATFORM_OWNER_BOOTSTRAP_EMAIL || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
        throw new Error('PLATFORM_OWNER_BOOTSTRAP_EMAIL is required.');
    }

    const existingOwners = await prisma.user.count({
        where: { role: { in: OWNER_ROLES }, status: UserAccountStatus.ACTIVE },
    });
    if (existingOwners > 0) {
        throw new Error('A platform owner already exists. Bootstrap is unavailable.');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('A user with that email already exists. Bootstrap refused.');
    }

    const password = `Sr#${randomToken(12)}A1`;
    const orgName = process.env.PLATFORM_OWNER_BOOTSTRAP_ORG || 'Supreme Internal';
    const organization = await prisma.organization.upsert({
        where: { slug: 'supreme-internal' },
        update: {},
        create: {
            name: orgName,
            slug: 'supreme-internal',
            country: 'US',
            status: 'ACTIVE',
            plan: 'ENTERPRISE',
            isDemo: false,
        },
    });

    const user = await prisma.user.create({
        data: {
            email,
            hashedPassword: await hashPassword(password),
            firstName: process.env.PLATFORM_OWNER_BOOTSTRAP_FIRST_NAME || 'Platform',
            lastName: process.env.PLATFORM_OWNER_BOOTSTRAP_LAST_NAME || 'Owner',
            role: Role.PLATFORM_OWNER,
            organizationId: organization.id,
            status: UserAccountStatus.ACTIVE,
            passwordChangedAt: new Date(),
            mfaEnabled: false,
        },
    });

    await recordAudit({
        organizationId: organization.id,
        actorUserId: user.id,
        action: 'platform.owner_bootstrapped',
        resourceType: 'User',
        resourceId: user.id,
        result: 'success',
        metadata: { method: 'cli' },
    });

    process.stdout.write(
        [
            'Platform Owner created.',
            `email=${email}`,
            `id=${user.id}`,
            'password=<printed-once-below>',
            password,
            'Enroll MFA at /admin/login before using /platform.',
            'Bootstrap will refuse to run again while an owner exists.',
            '',
        ].join('\n')
    );
}

main()
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
