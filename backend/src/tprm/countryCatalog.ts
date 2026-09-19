export const DONT_KNOW_JURISDICTION = 'dont_know';

export type GeoRegion = 'AFRICA' | 'AMERICAS' | 'ASIA' | 'EUROPE' | 'OCEANIA';

export type CountryRecord = {
    iso2: string;
    label: string;
    region: GeoRegion;
};

const REGION_CODES: Record<GeoRegion, string[]> = {
    AFRICA: [
        'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'EH', 'ER',
        'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG', 'ML', 'MR',
        'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SC', 'SD', 'SH', 'SL', 'SN', 'SO', 'SS', 'ST',
        'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'YT', 'ZA', 'ZM', 'ZW',
    ],
    AMERICAS: [
        'AG', 'AI', 'AR', 'AW', 'BB', 'BL', 'BM', 'BO', 'BQ', 'BR', 'BS', 'BZ', 'CA', 'CL', 'CO', 'CR',
        'CU', 'CW', 'DM', 'DO', 'EC', 'FK', 'GD', 'GF', 'GL', 'GP', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN',
        'KY', 'LC', 'MF', 'MQ', 'MS', 'MX', 'NI', 'PA', 'PE', 'PM', 'PR', 'PY', 'SR', 'SV', 'SX', 'TC',
        'TT', 'US', 'UY', 'VC', 'VE', 'VG', 'VI',
    ],
    ASIA: [
        'AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'BN', 'BT', 'CC', 'CN', 'CX', 'CY', 'GE', 'HK', 'ID', 'IL',
        'IN', 'IO', 'IQ', 'IR', 'JO', 'JP', 'KG', 'KH', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LK', 'MM',
        'MN', 'MO', 'MV', 'MY', 'NP', 'OM', 'PH', 'PK', 'PS', 'QA', 'SA', 'SG', 'SY', 'TH', 'TJ', 'TL',
        'TM', 'TR', 'TW', 'UZ', 'VN', 'YE',
    ],
    EUROPE: [
        'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO',
        'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV',
        'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SJ', 'SK',
        'SM', 'UA', 'VA', 'XK',
    ],
    OCEANIA: [
        'AS', 'AU', 'CK', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF', 'PG',
        'PN', 'PW', 'SB', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS',
    ],
};

const ALIASES: Record<string, string> = {
    USA: 'US',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    UK: 'GB',
    'UNITED KINGDOM': 'GB',
    'GREAT BRITAIN': 'GB',
    UAE: 'AE',
    'UNITED ARAB EMIRATES': 'AE',
    'SOUTH KOREA': 'KR',
    'KOREA, REPUBLIC OF': 'KR',
    RUSSIA: 'RU',
    'CZECH REPUBLIC': 'CZ',
    CZECHIA: 'CZ',
    VIETNAM: 'VN',
    'HONG KONG': 'HK',
    TAIWAN: 'TW',
    PALESTINE: 'PS',
    BOLIVIA: 'BO',
    VENEZUELA: 'VE',
    TANZANIA: 'TZ',
    IRAN: 'IR',
    SYRIA: 'SY',
    MOLDOVA: 'MD',
    MACEDONIA: 'MK',
    'NORTH MACEDONIA': 'MK',
    BRUNEI: 'BN',
    LAOS: 'LA',
    BURMA: 'MM',
    MYANMAR: 'MM',
    IVORY: 'CI',
    "COTE D'IVOIRE": 'CI',
    'CÔTE D’IVOIRE': 'CI',
    SWAZILAND: 'SZ',
    ESWATINI: 'SZ',
    CAPE: 'CV',
    'CAPE VERDE': 'CV',
    NETHERLANDS: 'NL',
    HOLLAND: 'NL',
    NIGERIA: 'NG',
    KENYA: 'KE',
    GHANA: 'GH',
    'SOUTH AFRICA': 'ZA',
    CANADA: 'CA',
    MEXICO: 'MX',
    BRAZIL: 'BR',
    INDIA: 'IN',
    CHINA: 'CN',
    JAPAN: 'JP',
    AUSTRALIA: 'AU',
    SINGAPORE: 'SG',
    GERMANY: 'DE',
    FRANCE: 'FR',
    IRELAND: 'IE',
    SPAIN: 'ES',
    ITALY: 'IT',
};

function displayName(iso2: string) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso2) || iso2;
    } catch {
        return iso2;
    }
}

export const COUNTRY_CATALOG: CountryRecord[] = (Object.entries(REGION_CODES) as Array<[GeoRegion, string[]]>)
    .flatMap(([region, codes]) => codes.map((iso2) => ({
        iso2,
        label: displayName(iso2),
        region,
    })))
    .sort((a, b) => a.label.localeCompare(b.label));

const BY_ISO = new Map(COUNTRY_CATALOG.map((row) => [row.iso2, row]));

export function findCountry(value?: string | null): CountryRecord | null {
    const raw = String(value || '').trim();
    if (!raw || raw.toLowerCase() === DONT_KNOW_JURISDICTION) return null;
    const upper = raw.toUpperCase();
    if (BY_ISO.has(upper)) return BY_ISO.get(upper) || null;
    const alias = ALIASES[upper];
    if (alias && BY_ISO.has(alias)) return BY_ISO.get(alias) || null;
    const byLabel = COUNTRY_CATALOG.find((row) => row.label.toUpperCase() === upper);
    return byLabel || null;
}

export function presentCountryCatalog() {
    return COUNTRY_CATALOG.map((row) => ({ iso2: row.iso2, label: row.label, region: row.region }));
}
