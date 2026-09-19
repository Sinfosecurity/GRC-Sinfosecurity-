import { DONT_KNOW_JURISDICTION, findCountry, type CountryRecord } from './countryCatalog';
import { splitValues } from './iraCatalog';

export type GeographicClass = 'country' | 'region' | 'outside' | 'dont_know';

export type JurisdictionPersist = {
    answers: Record<string, string>;
    derived: GeographicClass | '';
    storage: string[];
    processing: string[];
    organizationCountry: CountryRecord | null;
    methodologyGap: 'ORG_COUNTRY_UNMAPPED' | 'INVALID_COUNTRY' | null;
    gapMessage: string | null;
};

function unique(values: string[]) {
    return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function codesOf(raw?: string | null) {
    return unique(splitValues(raw));
}

export function persistIraJurisdictions(answers: Record<string, string>, organizationCountry?: string | null): JurisdictionPersist {
    const storage = codesOf(answers.a6_storage);
    const processing = codesOf(answers.a6_processing);
    const captured = storage.length > 0 || processing.length > 0;
    const org = findCountry(organizationCountry);

    if (!captured) {
        const legacy = String(answers.a6 || '').trim() as GeographicClass | '';
        return {
            answers,
            derived: legacy || '',
            storage,
            processing,
            organizationCountry: org,
            methodologyGap: null,
            gapMessage: null,
        };
    }

    if (storage.includes(DONT_KNOW_JURISDICTION) || processing.includes(DONT_KNOW_JURISDICTION)) {
        return {
            answers: { ...answers, a6: 'dont_know' },
            derived: 'dont_know',
            storage,
            processing,
            organizationCountry: org,
            methodologyGap: null,
            gapMessage: null,
        };
    }

    const selected = unique([...storage, ...processing].filter((code) => code !== DONT_KNOW_JURISDICTION));
    const unresolved = selected.filter((code) => !findCountry(code));
    if (unresolved.length) {
        return {
            answers,
            derived: '',
            storage,
            processing,
            organizationCountry: org,
            methodologyGap: 'INVALID_COUNTRY',
            gapMessage: `These jurisdiction codes are not in the standard country catalog: ${unresolved.join(', ')}.`,
        };
    }

    if (!org) {
        return {
            answers,
            derived: '',
            storage,
            processing,
            organizationCountry: null,
            methodologyGap: 'ORG_COUNTRY_UNMAPPED',
            gapMessage: 'Geographic risk cannot be scored until the organization country is a standard catalog country. Selected jurisdictions were stored and were not converted into a new risk score.',
        };
    }

    const mapped = selected.map((code) => findCountry(code)!);
    const derived: GeographicClass = mapped.every((row) => row.iso2 === org.iso2)
        ? 'country'
        : mapped.every((row) => row.region === org.region)
            ? 'region'
            : 'outside';

    return {
        answers: {
            ...answers,
            a6: derived,
            a6_storage: storage.join('|'),
            a6_processing: processing.join('|'),
        },
        derived,
        storage,
        processing,
        organizationCountry: org,
        methodologyGap: null,
        gapMessage: null,
    };
}

export function presentJurisdictions(answers: Record<string, string>, organizationCountry?: string | null) {
    const persisted = persistIraJurisdictions(answers, organizationCountry);
    return {
        storageCountries: persisted.storage.filter((code) => code !== DONT_KNOW_JURISDICTION),
        processingCountries: persisted.processing.filter((code) => code !== DONT_KNOW_JURISDICTION),
        dontKnow: persisted.derived === 'dont_know' || persisted.storage.includes(DONT_KNOW_JURISDICTION) || persisted.processing.includes(DONT_KNOW_JURISDICTION),
        derivedClass: persisted.derived || null,
        organizationCountry: persisted.organizationCountry,
        methodologyGap: persisted.methodologyGap,
    };
}
