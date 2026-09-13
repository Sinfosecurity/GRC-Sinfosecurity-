import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import { tprmAPI } from '../services/api';

type Template = {
    id: string;
    name: string;
    version: string;
    framework: string;
    organizationId?: string | null;
    sections: Array<{ title: string; questions: Array<{ questionText: string; category: string; weight: number }> }>;
};

function libraryGroup(name: string, framework: string) {
    if (/inherent/i.test(name)) return 'Inherent risk';
    if (/privacy|data protection/i.test(name + framework)) return 'Privacy';
    if (/continuity|disaster|resilience|bcdr/i.test(name + framework)) return 'Resilience';
    if (/cmmc|nist|iso|soc/i.test(name + framework)) return 'Framework-aligned';
    if (/security|identity|incident|cloud/i.test(name + framework)) return 'Cybersecurity';
    return 'Other';
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
            const key = libraryGroup(template.name, template.framework);
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
                                {rows.map((template) => {
                                    const questions = template.sections.reduce((sum, section) => sum + section.questions.length, 0);
                                    return (
                                        <Surface key={template.id}>
                                            <Typography variant="subtitle1">{template.name}</Typography>
                                            <Typography variant="body2">
                                                {questions} questions · {template.sections.length} sections · v{template.version}
                                            </Typography>
                                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                {template.framework} · {template.organizationId ? 'Organization copy' : 'Supreme template'}
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                Aligned assessment — does not provide certification.
                                            </Typography>
                                            {!template.organizationId && (
                                                <Button
                                                    size="small"
                                                    sx={{ mt: 1 }}
                                                    onClick={async () => {
                                                        await tprmAPI.cloneQuestionnaire(template.id);
                                                        setMessage('Created an organization copy. Supreme originals stay unchanged.');
                                                        await load();
                                                    }}
                                                >
                                                    Clone for this organization
                                                </Button>
                                            )}
                                        </Surface>
                                    );
                                })}
                            </Stack>
                        </Box>
                    ))}
                    <Surface>
                        <Typography variant="h5">Scoring methodology</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Engine {methodology?.engineVersion}. Active version {methodology?.active?.version}. Publishing does not rewrite historical calculations.
                        </Typography>
                        <TextField fullWidth multiline minRows={10} value={weights} onChange={(e) => setWeights(e.target.value)} />
                        <Button sx={{ mt: 2 }} variant="contained" onClick={publish}>Publish new version</Button>
                    </Surface>
                </Stack>
            </QueryState>
        </Box>
    );
}
