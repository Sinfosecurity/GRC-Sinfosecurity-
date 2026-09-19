export const DONT_KNOW = "Don't know";

export type IraChoice = { value: string; label: string };

export type IraQuestion = {
    key: string;
    part: 'A' | 'B';
    question: string;
    multiple?: boolean;
    input?: 'choice' | 'jurisdictions';
    storageKey?: string;
    processingKey?: string;
    options: IraChoice[];
};

export const IRA_QUESTIONS: IraQuestion[] = [
    {
        key: 'a1',
        part: 'A',
        question: 'What will the vendor do for us? (choose all that apply)',
        multiple: true,
        options: [
            { value: 'software', label: 'Software we use online / an app / an API' },
            { value: 'cloud', label: 'Hosting our data or systems in their cloud' },
            { value: 'consulting', label: 'Consulting or professional services' },
            { value: 'physical', label: 'Work on our premises or handle our records/equipment' },
            { value: 'staffing', label: 'Staff placed with us' },
            { value: 'hardware', label: 'Hardware or equipment supply' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a2',
        part: 'A',
        question: 'What information will the vendor store, process, or be able to see? (choose all that apply)',
        multiple: true,
        options: [
            { value: 'none', label: 'None / public only' },
            { value: 'internal', label: 'Internal business information' },
            { value: 'confidential', label: 'Confidential business information' },
            { value: 'personal', label: 'Personal data about employees or customers' },
            { value: 'card', label: 'Payment card data' },
            { value: 'health', label: 'Health data' },
            { value: 'credentials', label: 'Passwords or login credentials' },
            { value: 'regulated', label: 'Regulated financial data' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a3',
        part: 'A',
        question: "Roughly how many people's records?",
        options: [
            { value: 'none', label: 'None' },
            { value: 'under_1k', label: 'Under 1,000' },
            { value: '1k_10k', label: '1,000–10,000' },
            { value: '10k_100k', label: '10,000–100,000' },
            { value: 'over_100k', label: 'Over 100,000' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a4',
        part: 'A',
        question: 'What access will the vendor need to our systems?',
        options: [
            { value: 'none', label: 'None' },
            { value: 'files', label: 'We exchange files or log into their site' },
            { value: 'read', label: 'An automated connection that reads our data' },
            { value: 'write', label: 'An automated connection that changes our data' },
            { value: 'admin', label: 'Admin accounts, remote access, or a connection into our network' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a5',
        part: 'A',
        question: 'Is the service reachable from the internet or used by our customers?',
        options: [
            { value: 'internal', label: 'Internal use only' },
            { value: 'internet', label: 'Reachable from the internet' },
            { value: 'customer', label: 'Part of a product or service our customers use' },
            { value: 'both', label: 'Both' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a6',
        part: 'A',
        question: 'Where will our data be stored or handled?',
        input: 'jurisdictions',
        storageKey: 'a6_storage',
        processingKey: 'a6_processing',
        options: [
            { value: 'dont_know', label: "Don't know / Not yet confirmed" },
        ],
    },
    {
        key: 'a7',
        part: 'A',
        question: 'Will the vendor use other companies to deliver this service or handle our data?',
        options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a8',
        part: 'A',
        question: 'Does the service use AI to make decisions or generate content using our data?',
        options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'a9',
        part: 'A',
        question: 'Will vendor staff work on our premises or handle our physical records or equipment?',
        options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'b1',
        part: 'B',
        question: 'If this vendor stopped working tomorrow, what would happen?',
        options: [
            { value: 'manage', label: 'Not much — we would manage' },
            { value: 'workaround', label: 'Inconvenience, work-arounds needed' },
            { value: 'week', label: 'Serious disruption within a week' },
            { value: 'day', label: 'Critical operations or customer commitments would stop within a day' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'b2',
        part: 'B',
        question: 'Could a problem with this vendor (failure, fraud, misuse) cost us money?',
        options: [
            { value: 'no', label: 'Not really' },
            { value: 'noticeable', label: 'A noticeable amount' },
            { value: 'material', label: 'A material amount for the business' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'b3',
        part: 'B',
        question: 'Is this service tied to a law, regulation, licence, audit or contractual obligation?',
        options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'b4',
        part: 'B',
        question: 'If the vendor lost our data or failed publicly, how bad would it be for our customers and reputation?',
        options: [
            { value: 'minor', label: 'Minor' },
            { value: 'noticeable', label: 'Noticeable' },
            { value: 'significant', label: 'Significant harm to customers or the brand' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
    {
        key: 'b5',
        part: 'B',
        question: 'How hard would it be to replace this vendor?',
        options: [
            { value: 'easy', label: 'Easy — alternatives exist' },
            { value: 'months', label: 'Would take months' },
            { value: 'hard', label: 'Very hard — unique technology, data or skills' },
            { value: 'dont_know', label: DONT_KNOW },
        ],
    },
];

export const BASELINE_LITE_KEYS = [
    'VRA-001', 'VRA-004', 'VRA-014', 'VRA-016', 'VRA-017',
    'VRA-023', 'VRA-026', 'VRA-039', 'VRA-043', 'VRA-053',
    'VRA-056', 'VRA-059', 'VRA-062', 'VRA-071',
] as const;

export const BASELINE_LITE_EXCLUDED = ['VRA-007', 'VRA-042', 'VRA-061', 'VRA-073'] as const;

export function isDontKnow(value?: string | null) {
    const raw = String(value || '').trim().toLowerCase();
    return raw === 'dont_know' || raw === "don't know" || raw === 'dont know' || raw.includes('dont_know');
}

export function splitValues(value?: string | null) {
    return String(value || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function missingIraQuestions(answers: Array<{ questionKey: string; response?: string | null }>, questions: IraQuestion[] = IRA_QUESTIONS) {
    return questions.filter((question) => {
        if (question.input === 'jurisdictions') {
            const derived = String(answers.find((row) => row.questionKey === question.key)?.response || '').trim();
            const storage = String(answers.find((row) => row.questionKey === (question.storageKey || 'a6_storage'))?.response || '').trim();
            return !derived && !storage;
        }
        return !String(answers.find((row) => row.questionKey === question.key)?.response || '').trim();
    }).map((question) => question.key);
}

export function isBaselineLiteQuestion(controlId?: string | null) {
    const key = String(controlId || '').toUpperCase();
    return (BASELINE_LITE_KEYS as readonly string[]).includes(key);
}
