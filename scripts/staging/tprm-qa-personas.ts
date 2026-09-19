#!/usr/bin/env npx ts-node
/**
 * Staging-only operator entry for TPRM QA personas.
 * Delegates to backend/src/scripts/tprmQaPersonas.ts and inherits the production abort.
 */
import { spawnSync } from 'child_process';
import path from 'path';

const backend = path.resolve(__dirname, '../../backend');
const result = spawnSync(
    'npx',
    ['ts-node', '--transpile-only', 'src/scripts/tprmQaPersonas.ts', ...process.argv.slice(2)],
    {
        cwd: backend,
        stdio: 'inherit',
        env: process.env,
    }
);
process.exit(result.status ?? 1);
