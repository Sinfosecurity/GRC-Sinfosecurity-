import net from 'net';

function write(socket: net.Socket, line: string) {
    socket.write(`${line}\r\n`);
}

function readReply(socket: net.Socket): Promise<string> {
    return new Promise((resolve, reject) => {
        const onData = (chunk: Buffer) => {
            socket.off('error', onError);
            resolve(chunk.toString('utf8'));
        };
        const onError = (error: Error) => {
            socket.off('data', onData);
            reject(error);
        };
        socket.once('data', onData);
        socket.once('error', onError);
    });
}

export async function sendSmtpMail(input: { to: string; subject: string; body: string }) {
    const host = process.env.SMTP_HOST;
    if (!host) {
        throw new Error('SMTP_HOST is not configured');
    }
    const port = Number(process.env.SMTP_PORT || 25);
    const from = process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'noreply@supremerisk.com';
    const socket = net.createConnection({ host, port });
    await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('error', reject);
    });
    await readReply(socket);
    write(socket, `EHLO supreme-risk`);
    await readReply(socket);
    write(socket, `MAIL FROM:<${from}>`);
    await readReply(socket);
    write(socket, `RCPT TO:<${input.to}>`);
    await readReply(socket);
    write(socket, 'DATA');
    await readReply(socket);
    write(socket, `From: ${from}`);
    write(socket, `To: ${input.to}`);
    write(socket, `Subject: ${input.subject}`);
    write(socket, '');
    write(socket, input.body.replace(/\r?\n\./g, '\n..'));
    write(socket, '.');
    await readReply(socket);
    write(socket, 'QUIT');
    socket.end();
}
