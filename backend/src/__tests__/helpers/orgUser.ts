import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../../server';
import { prisma } from '../../config/database';

const API = '/api/v1';

export async function createOrgUser(input: {
    organizationId: string;
    email: string;
    password: string;
    role: Role;
    firstName?: string;
    lastName?: string;
}) {
    const existing = await prisma.user.findFirstOrThrow({ where: { organizationId: input.organizationId } });
    const user = await prisma.user.create({
        data: {
            email: input.email,
            hashedPassword: existing.hashedPassword,
            firstName: input.firstName || 'Pat',
            lastName: input.lastName || 'Colleague',
            role: input.role,
            organizationId: input.organizationId,
            status: 'ACTIVE',
        },
    });
    const login = await request(app).post(`${API}/auth/login`).send({
        email: input.email,
        password: input.password,
        plane: 'CUSTOMER',
    });
    return { user, token: login.body.data.token as string };
}
