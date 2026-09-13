export function sanitizeHeaderValue(value: string): string {
    return String(value || '').replace(/[\r\n\0]+/g, ' ').trim();
}
