export const REFRESH_CSRF_HEADER = 'X-Supreme-Requested-With';
export const REFRESH_CSRF_VALUE = 'supreme-browser';

let accessToken: string | null = null;

export function getAccessToken() {
    if (accessToken) return accessToken;
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token');
}

export function setAccessToken(token: string | null) {
    accessToken = token;
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('refreshToken');
    if (!token) {
        localStorage.removeItem('token');
    }
}

export function clearBrowserSessionArtifacts() {
    accessToken = null;
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
}

export function rememberLegacyAccessTokenForTests(token: string) {
    accessToken = token;
}
