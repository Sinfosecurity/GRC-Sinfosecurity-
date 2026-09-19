/**
 * Operator CLI for staging TPRM QA personas.
 * Refuses production. Never prints vendor tokens. Passwords are written to stdout once only.
 */
import { prisma } from '../config/database';
import { assertStagingQaPersonasAllowed } from './stagingQaGuards';
import {
    bootstrapQaUsers,
    publicPersonaCard,
    qaStatus,
    resetQaTestData,
    seedManualGoldenJourneyCase,
} from './stagingQaPersonas';

function command() {
    return String(process.argv[2] || 'status').trim().toLowerCase();
}

function printJson(value: unknown) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
    assertStagingQaPersonasAllowed();
    const cmd = command();
    if (cmd === 'bootstrap-users') {
        const result = await bootstrapQaUsers();
        printJson({
            organization: result.organization,
            personas: result.personas.map(publicPersonaCard),
            vendorUserCreated: result.vendorUserCreated,
            passwordDelivery: result.passwordDelivery,
        });
        process.stdout.write('\n---OPERATOR-ONLY-ONCE---\n');
        for (const persona of result.personas) {
            process.stdout.write(`${persona.email}\t${persona.plaintextPassword || ''}\n`);
        }
        process.stdout.write('---END-OPERATOR-ONLY---\n');
        return;
    }
    if (cmd === 'reset-test-data') {
        printJson(await resetQaTestData());
        return;
    }
    if (cmd === 'seed-manual-case') {
        printJson(await seedManualGoldenJourneyCase());
        return;
    }
    if (cmd === 'status') {
        printJson(await qaStatus());
        return;
    }
    throw new Error('Unknown command. Use bootstrap-users | reset-test-data | seed-manual-case | status.');
}

main()
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
