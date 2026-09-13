import type { AxiosResponse } from 'axios';
import { ApiClientError } from './api';

export function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
    const match = disposition?.match(/filename="([^"]+)"/i);
    return match?.[1] || fallback;
}

export async function downloadBinaryResponse(response: AxiosResponse<Blob>, fallbackFilename: string) {
    const type = String(response.headers['content-type'] || '');
    if (type.includes('application/json')) {
        throw new ApiClientError('The server returned JSON instead of a downloadable file.', response.status);
    }
    const blob = new Blob([response.data], { type: type || 'application/octet-stream' });
    const filename = filenameFromDisposition(response.headers['content-disposition'], fallbackFilename);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return filename;
}

export function downloadErrorMessage(error: unknown): string {
    if (error instanceof ApiClientError) {
        if (error.status === 401) return 'Sign in is required to download this report.';
        if (error.status === 403) {
            if (/plan does not include/i.test(error.message)) {
                return 'This download is not included in the current plan. Private-beta tester organizations can export reports. Ask an organization administrator if you expected access.';
            }
            if (/board packs/i.test(error.message)) {
                return error.message;
            }
            return error.message || 'Your role can view reports but cannot download them. An organization admin, risk manager, assessor, or approver can export.';
        }
        if (error.status === 404) return 'This report cannot be generated because the record was not found.';
        if (error.status === 429) return 'Too many requests. Please try again later.';
        if (error.status === 503) return 'A required provider is unavailable.';
        if (error.status === 500) return 'Report generation failed.';
        return error.message;
    }
    if (error instanceof Error) return error.message;
    return 'Report generation failed.';
}
