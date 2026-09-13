import { deliveryLabel } from '../invitationDelivery';

describe('customer invitation delivery labels', () => {
    it('keeps invitation email states separate from provider internals', () => {
        expect(deliveryLabel('sent')).toBe('Sent');
        expect(deliveryLabel('delivered')).toBe('Delivered');
        expect(deliveryLabel('bounced')).toBe('Bounced');
        expect(deliveryLabel('failed')).toBe('Delivery problem');
        expect(deliveryLabel('unknown')).toBe('Unknown');
        expect(deliveryLabel('queued')).toBe('Unknown');
        expect(deliveryLabel('SMTP timeout')).toBe('Unknown');
        expect(deliveryLabel('RESEND 403')).toBe('Unknown');
    });
});
