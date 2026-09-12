import net from 'net';
import tls from 'tls';

export type SmtpDelivery = {
    messageId?: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

const SMTP_TIMEOUT_MS = 20000;

function smtpPassword(env: NodeJS.ProcessEnv = process.env) {
    return env.SMTP_PASSWORD || env.SMTP_PASS || '';
}

export function smtpAuthConfigured(env: NodeJS.ProcessEnv = process.env) {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && smtpPassword(env));
}

function commandLabel(command?: string, label?: string) {
    if (label) return label;
    if (!command) return 'reply';
    return command.split(' ')[0] || 'reply';
}

async function readReply(socket: SmtpSocket): Promise<{ code: number; text: string }> {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const onData = (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(/\r?\n/);
            for (const line of lines) {
                const match = line.match(/^(\d{3}) (.*)$/);
                if (match) {
                    cleanup();
                    resolve({ code: Number(match[1]), text: buffer.trim() });
                    return;
                }
            }
        };
        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };
        const onTimeout = () => {
            cleanup();
            reject(new Error('SMTP timeout'));
        };
        const cleanup = () => {
            socket.off('data', onData);
            socket.off('error', onError);
            socket.off('timeout', onTimeout);
        };
        socket.on('data', onData);
        socket.once('error', onError);
        socket.once('timeout', onTimeout);
    });
}

function write(socket: SmtpSocket, line: string) {
    socket.write(`${line}\r\n`);
}

async function expect(socket: SmtpSocket, allowed: number[], command?: string, label?: string) {
    if (command !== undefined) {
        write(socket, command);
    }
    const reply = await readReply(socket);
    if (!allowed.includes(reply.code)) {
        throw new Error(`SMTP ${commandLabel(command, label)} failed (${reply.code})`);
    }
    return reply;
}

function attachTimeout<T extends SmtpSocket>(socket: T): T {
    socket.setTimeout(SMTP_TIMEOUT_MS);
    return socket;
}

function connectPlain(host: string, port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
        const socket = attachTimeout(net.createConnection({ host, port }));
        socket.once('connect', () => resolve(socket));
        socket.once('error', reject);
        socket.once('timeout', () => reject(new Error('SMTP timeout')));
    });
}

function connectTls(host: string, port: number): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
        const secure = attachTimeout(tls.connect({ host, port, servername: host }));
        secure.once('secureConnect', () => resolve(secure));
        secure.once('error', reject);
        secure.once('timeout', () => reject(new Error('SMTP timeout')));
    });
}

function upgradeTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
        const secure = attachTimeout(tls.connect({ socket, servername: host }));
        secure.once('secureConnect', () => resolve(secure));
        secure.once('error', reject);
        secure.once('timeout', () => reject(new Error('SMTP timeout')));
    });
}

function implicitTls(port: number, env: NodeJS.ProcessEnv) {
    return env.SMTP_SECURE === 'true' || port === 465;
}

function shouldStartTls(port: number, ehloText: string, env: NodeJS.ProcessEnv) {
    if (implicitTls(port, env)) return false;
    if (port === 587 || env.SMTP_SECURE === 'starttls') return true;
    return /STARTTLS/i.test(ehloText);
}

async function authenticate(socket: SmtpSocket, env: NodeJS.ProcessEnv) {
    const user = env.SMTP_USER;
    const password = smtpPassword(env);
    if (!user || !password) {
        return false;
    }
    await expect(socket, [334], 'AUTH LOGIN', 'AUTH');
    await expect(socket, [334], Buffer.from(user).toString('base64'), 'AUTH');
    await expect(socket, [235], Buffer.from(password).toString('base64'), 'AUTH');
    return true;
}

async function openSession(env: NodeJS.ProcessEnv): Promise<SmtpSocket> {
    const host = env.SMTP_HOST;
    if (!host) {
        throw new Error('SMTP_HOST is not configured');
    }
    const port = Number(env.SMTP_PORT || 587);
    let socket: SmtpSocket = implicitTls(port, env)
        ? await connectTls(host, port)
        : await connectPlain(host, port);
    await expect(socket, [220]);
    const ehlo = await expect(socket, [250], 'EHLO supreme-risk');
    if (shouldStartTls(port, ehlo.text, env)) {
        await expect(socket, [220], 'STARTTLS');
        socket = await upgradeTls(socket as net.Socket, host);
        await expect(socket, [250], 'EHLO supreme-risk');
    }
    return socket;
}

export async function verifySmtpConnection(env: NodeJS.ProcessEnv = process.env): Promise<{ authenticated: boolean }> {
    const socket = await openSession(env);
    try {
        const authenticated = await authenticate(socket, env);
        await expect(socket, [221], 'QUIT');
        return { authenticated };
    } finally {
        socket.end();
    }
}

export async function sendSmtpMail(
    input: { to: string; subject: string; body: string },
    env: NodeJS.ProcessEnv = process.env
): Promise<SmtpDelivery> {
    const fromEmail = env.SMTP_FROM_EMAIL || env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
        throw new Error('SMTP_FROM_EMAIL is not configured');
    }
    const fromName = env.SMTP_FROM_NAME || env.SENDGRID_FROM_NAME || 'Supreme Risk';
    const socket = await openSession(env);
    try {
        await authenticate(socket, env);
        await expect(socket, [250], `MAIL FROM:<${fromEmail}>`, 'MAIL');
        await expect(socket, [250], `RCPT TO:<${input.to}>`, 'RCPT');
        await expect(socket, [354], 'DATA');
        write(socket, `From: ${fromName} <${fromEmail}>`);
        write(socket, `To: ${input.to}`);
        write(socket, `Subject: ${input.subject}`);
        write(socket, 'MIME-Version: 1.0');
        write(socket, 'Content-Type: text/plain; charset=utf-8');
        write(socket, '');
        write(socket, input.body.replace(/\r?\n\./g, '\n..'));
        const queued = await expect(socket, [250], '.');
        await expect(socket, [221], 'QUIT');
        const idMatch = queued.text.match(/<([^>]+)>/);
        return { messageId: idMatch?.[1] };
    } finally {
        socket.end();
    }
}
