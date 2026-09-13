const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function neutralizeSpreadsheetValue(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (FORMULA_PREFIX.test(text)) {
        return `'${text}`;
    }
    return text;
}

export function csvEscape(value: unknown): string {
    const text = neutralizeSpreadsheetValue(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
