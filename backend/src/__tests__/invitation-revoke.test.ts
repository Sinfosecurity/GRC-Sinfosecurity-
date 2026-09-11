import request from 'supertest';
import { app } from '../server';
import { authService } from '../services/authService';

jest.setTimeout(60000);

describe('invitation revoke', () => {
    const suffix = `${Date.now()}`;
    const password = 'AdminPass1x';
    let token = '';
    let invitationId = '';
    let inviteToken = '';

    beforeAll(async () => {
        const signup = await request(app).post('/api/v1/auth/signup').send({
            email: `revoke-admin-${suffix}@org.test`,
            password,
            firstName: 'Revoke',
            lastName: 'Admin',
            organizationName: `Revoke Org ${suffix}`,
            country: 'US',
        });
        expect(signup.status).toBe(201);
        token = signup.body.data.token;
        const invite = await request(app)
            .post('/api/v1/users/invite')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: `invitee-${suffix}@org.test`, role: 'VIEWER' });
        expect(invite.status).toBe(201);
        invitationId = invite.body.data.invitation.id;
        inviteToken = invite.body.data.token;
    });

    it('revokes a pending invitation and blocks accept', async () => {
        const revoked = await request(app)
            .post(`/api/v1/users/invitations/${invitationId}/revoke`)
            .set('Authorization', `Bearer ${token}`);
        expect(revoked.status).toBe(200);
        expect(revoked.body.data.status).toBe('REVOKED');

        await expect(
            authService.acceptInvitation(inviteToken, {
                password: 'InviteePass1x',
                firstName: 'Invite',
                lastName: 'Ee',
            })
        ).rejects.toThrow(/invalid or expired/i);
    });
});
