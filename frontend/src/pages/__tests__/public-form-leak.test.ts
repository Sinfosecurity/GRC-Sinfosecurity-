import { readFileSync } from 'node:fs';
import path from 'node:path';

const publicForms = [
    '../RequestDemo.tsx',
    '../Register.tsx',
    '../Login.tsx',
    '../ForgotPassword.tsx',
    '../Activate.tsx',
    '../Pricing.tsx',
];

describe('public form technical-state leak prevention', () => {
    it('does not render internal delivery or provider states on public forms', () => {
        for (const relative of publicForms) {
            const source = readFileSync(path.join(__dirname, relative), 'utf8');
            expect(source, relative).not.toMatch(/NOT_CONFIGURED/);
            expect(source, relative).not.toMatch(/SENDGRID|RESEND|SMTP/);
            expect(source, relative).not.toMatch(/deliveryStatus/);
            expect(source, relative).not.toMatch(/response\.data\.delivery/);
        }
    });
});
