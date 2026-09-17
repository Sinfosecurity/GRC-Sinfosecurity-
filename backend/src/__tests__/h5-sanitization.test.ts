import { sanitizeInput } from '../middleware/sanitization';

function run(body: Record<string, unknown>, query: Record<string, unknown> = {}, params: Record<string, unknown> = {}) {
    const req: any = { body, query, params };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    sanitizeInput(req, res, next);
    return { req, res, next };
}

describe('H-5 input preservation', () => {
    it('stores passwords, angle brackets, ampersands, and Name <email> verbatim', () => {
        const { req, next } = run({
            password: 'P@ss<w0rd>!',
            newPassword: 'Winter<2026>Secure!',
            contact: 'QA Test Contact <qa-test-vendor@example.com>',
            answer: 'Encryption keys rotate every <90 days via KMS',
            note: 'if a<b then',
            spend: 'Revenue < 5m and > 1m',
            legalName: 'Smith & Sons <script>x</script>',
        });
        expect(next).toHaveBeenCalled();
        expect(req.body.password).toBe('P@ss<w0rd>!');
        expect(req.body.newPassword).toBe('Winter<2026>Secure!');
        expect(req.body.contact).toBe('QA Test Contact <qa-test-vendor@example.com>');
        expect(req.body.answer).toBe('Encryption keys rotate every <90 days via KMS');
        expect(req.body.note).toBe('if a<b then');
        expect(req.body.spend).toBe('Revenue < 5m and > 1m');
        expect(req.body.legalName).toBe('Smith & Sons <script>x</script>');
    });

    it('rejects a null byte instead of rewriting the rest of the string', () => {
        const { res, next } = run({ name: 'Vendor\0 truncated' });
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
