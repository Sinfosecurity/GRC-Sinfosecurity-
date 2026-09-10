import { Response } from 'express';

export function downloadFilename(parts: Array<string | null | undefined>, extension: string): string {
    const body = parts
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join('-')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120);
    return `${body || 'Supreme-Risk-Report'}.${extension}`;
}

export function sendBinaryFile(
    res: Response,
    buffer: Buffer,
    contentType: string,
    filename: string
) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
}

export function isoDate(value?: Date | string | null): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toISOString().slice(0, 10);
}
