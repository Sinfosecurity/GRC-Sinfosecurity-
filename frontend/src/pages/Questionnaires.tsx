import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import { tprmAPI } from '../services/api';

type Template = {
    id: string;
    name: string;
    version: string;
    framework: string;
    organizationId?: string | null;
    sections: Array<{ title: string; questions: Array<{ questionText: string; category: string; weight: number }> }>;
};

export default function Questionnaires() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [methodology, setMethodology] = useState<any>(null);
    const [weights, setWeights] = useState('');
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
                notes: 'Published from questionnaire administration. Historical ScoreCalculation rows stay unchanged.',
                weights: JSON.parse(weights),
            });
            setMessage('New methodology version published. Future recalculations use it; historical scores are not rewritten.');
            await load();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Box sx={{ maxWidth: 1000 }}>
            <Typography variant="overline" sx={{ color: '#06b6d4', fontWeight: 800, letterSpacing: '0.14em' }}>Questionnaires</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Templates and scoring methodology</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Assessment questions are loaded from the database. Changing weights creates a new methodology version.
            </Typography>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <QueryState loading={loading} error={error} empty={templates.length === 0} emptyTitle="No templates yet" emptyBody="Supreme assessment templates are created on first open. Clone a Supreme template before customizing.">
                <Stack spacing={2}>
                    {templates.map((template) => (
                        <Card key={template.id} sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                            <CardContent>
                                <Typography fontWeight={800}>{template.name} v{template.version}</Typography>
                                <Typography variant="caption" color="text.secondary">{template.framework} · {template.organizationId ? 'organization copy' : 'Supreme template (protected)'}</Typography>
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
                                {template.sections.map((section) => (
                                    <Box key={section.title} sx={{ mt: 1 }}>
                                        <Typography fontWeight={700}>{section.title}</Typography>
                                        {section.questions.map((question) => (
                                            <Typography key={question.questionText} variant="body2" color="text.secondary">
                                                {question.questionText} ({question.category}, weight {question.weight})
                                            </Typography>
                                        ))}
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                    <Card sx={{ bgcolor: 'rgba(15,23,42,0.85)' }}>
                        <CardContent>
                            <Typography variant="h6">Scoring methodology</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Engine formula {methodology?.engineVersion}. Active version {methodology?.active?.version}. Publishing does not mutate historical calculations.
                            </Typography>
                            <TextField fullWidth multiline minRows={12} value={weights} onChange={(e) => setWeights(e.target.value)} />
                            <Button sx={{ mt: 2 }} variant="contained" onClick={publish}>Publish new version</Button>
                        </CardContent>
                    </Card>
                </Stack>
            </QueryState>
        </Box>
    );
}
