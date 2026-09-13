import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import TemplateCard from '../components/design/TemplateCard';
import { tprmAPI } from '../services/api';

type Template = {
    id: string;
    name: string;
    version: string;
    framework: string;
    organizationId?: string | null;
    source?: string;
    sourceLabel?: string;
    category?: string;
    questionCount?: number;
    domainCount?: number;
    estimatedMinutes?: number;
    evidenceRequired?: boolean;
    purpose?: string;
    sections: Array<{ title: string; questions: Array<{ questionText: string; category: string; weight: number }> }>;
};

function libraryGroup(template: Template) {
    if (template.category) return template.category;
    const haystack = `${template.name} ${template.framework}`;
    if (/inherent/i.test(haystack)) return 'Inherent risk';
    if (/privacy|data protection/i.test(haystack)) return 'Privacy';
    if (/continuity|disaster|resilience|bcdr/i.test(haystack)) return 'Resilience';
    if (/cmmc|nist|iso|soc/i.test(haystack)) return 'Framework-aligned';
    if (/security|identity|incident|cloud/i.test(haystack)) return 'Cybersecurity';
    return 'Due diligence';
}

export default function Questionnaires() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [methodology, setMethodology] = useState<any>(null);
    const [weights, setWeights] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [templateRes, scoringRes] = await Promise.all([tprmAPI.questionnaires(), tprmAPI.scoringMethodology()]);
            setTemplates(templateRes.data.data || []);
            setMethodology(scoringRes.data.data);
            setWeights(JSON.stringify(scoringRes.data.data.active.weights, null, 2));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const publish = async () => {
        setMessage(null);
        try {
            await tprmAPI.publishScoringMethodology({
                name: 'Organization scoring methodology',
                notes: 'Published from the assessment library. Historical ScoreCalculation rows stay unchanged.',
                weights: JSON.parse(weights),
            });
            setMessage('New methodology version published. Future recalculations use it; historical scores are not rewritten.');
            await load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return templates.filter((template) => {
            if (!q) return true;
            return `${template.name} ${template.framework}`.toLowerCase().includes(q);
        });
    }, [templates, query]);

    const groups = useMemo(() => {
        const map = new Map<string, Template[]>();
        for (const template of filtered) {
            const key = libraryGroup(template);
            map.set(key, [...(map.get(key) || []), template]);
        }
        return [...map.entries()];
    }, [filtered]);

    return (
        <Box sx={{ maxWidth: 1100 }}>
            <PageHeader
                title="Assessment library"
                description="Choose a Supreme template by purpose. Framework-aligned assessments do not provide certification."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <TextField fullWidth label="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ mb: 3 }} />
            <QueryState loading={loading} error={error} empty={templates.length === 0} emptyTitle="No templates yet" emptyBody="Supreme assessment templates are created on first open.">
                <Stack spacing={3}>
                    {groups.map(([group, rows]) => (
                        <Box key={group}>
                            <Typography variant="overline">{group}</Typography>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {rows.map((template) => (
                                    <Box key={template.id}>
                                        <TemplateCard template={template} />
                                        {template.source === 'SUPREME' && (
                                            <Button
                                                size="small"
                                                sx={{ mt: 1 }}
                                                onClick={async () => {
                                                    await tprmAPI.cloneQuestionnaire(template.id);
                                                    setMessage('Created an organization template. It is labeled Custom and is separate from the Supreme original.');
                                                    await load();
                                                }}
                                            >
                                                Clone as organization template
                                            </Button>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                    <Surface>
                        <Typography variant="h5">Scoring methodology</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Engine {methodology?.engineVersion || '—'}. Active version {methodology?.active?.version || '—'}. Publishing creates a new version and does not rewrite historical calculations.
                        </Typography>
                        <details>
                            <summary>Advanced scoring weights</summary>
                            <TextField fullWidth multiline minRows={8} value={weights} onChange={(e) => setWeights(e.target.value)} sx={{ mt: 2 }} />
                            <Button sx={{ mt: 2 }} variant="contained" onClick={publish}>Publish new version</Button>
                        </details>
                    </Surface>
                </Stack>
            </QueryState>
        </Box>
    );
}
