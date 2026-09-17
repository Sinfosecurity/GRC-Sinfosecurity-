import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import QueryState from '../components/QueryState';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import { tprmAPI } from '../services/api';
import ScoringMethodologyEditor from '../components/ScoringMethodologyEditor';
import { useAuth } from '../contexts/AuthContext';
import { canSeeNav } from '../security/navAccess';

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
    const { user } = useAuth();
    const canManage = canSeeNav(user?.role, 'questionnaire.manage', user?.permissions);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [methodology, setMethodology] = useState<any>(null);
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [templateRes, scoringRes] = await Promise.all([tprmAPI.questionnaires(), tprmAPI.scoringMethodology()]);
            setTemplates(templateRes.data.data || []);
            setMethodology(scoringRes.data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const groups = useMemo(() => Array.from(new Set(templates.map(libraryGroup))).sort(), [templates]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return templates.filter((template) => {
            if (group && libraryGroup(template) !== group) return false;
            if (!q) return true;
            return `${template.name} ${template.framework} ${template.purpose || ''}`.toLowerCase().includes(q);
        });
    }, [templates, query, group]);

    return (
        <WorkspaceFrame purpose="register">
            <PageHeader
                title="Assessment library"
                description="Choose a Supreme template by purpose. Framework-aligned assessments do not provide certification."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, mb: 2 }}>
                <TextField fullWidth label="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} />
                <TextField select label="Group" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">All groups</MenuItem>
                    {groups.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
            </Box>
            <QueryState loading={loading} error={error} empty={templates.length === 0} emptyTitle="No templates yet" emptyBody="Supreme assessment templates are created on first open.">
                <Surface padded={false}>
                    <AppTable
                        embedded
                        pageSize={8}
                        rows={filtered}
                        rowKey={(row) => row.id}
                        searchPlaceholder="Filter this page"
                        searchValue={(row) => `${row.name} ${row.framework} ${libraryGroup(row)}`}
                        columns={[
                            { id: 'name', label: 'Template', sortValue: (row) => row.name, render: (row) => (
                                <Box>
                                    <Typography variant="subtitle2">{row.name}</Typography>
                                    <Typography variant="body2">{row.purpose || row.framework}</Typography>
                                </Box>
                            ) },
                            { id: 'group', label: 'Group', hideOnMobile: true, sortValue: (row) => libraryGroup(row), render: (row) => libraryGroup(row) },
                            { id: 'source', label: 'Source', hideOnMobile: true, render: (row) => row.sourceLabel || row.source || '—' },
                            { id: 'questions', label: 'Questions', hideOnMobile: true, sortValue: (row) => row.questionCount || 0, render: (row) => row.questionCount ?? '—' },
                            { id: 'action', label: 'Action', render: (row) => row.source === 'SUPREME' ? (
                                <Button
                                    size="small"
                                    onClick={async () => {
                                        await tprmAPI.cloneQuestionnaire(row.id);
                                        setMessage('Created an organization template. It is labeled Custom and is separate from the Supreme original.');
                                        await load();
                                    }}
                                >
                                    Clone as organization template
                                </Button>
                            ) : '—' },
                        ]}
                    />
                </Surface>
            </QueryState>
            {!loading && methodology && (
                <Box
                    component="details"
                    sx={{
                        mt: 3,
                        '& > summary': { cursor: 'pointer', fontWeight: 700, mb: 1.5, listStylePosition: 'outside' },
                    }}
                >
                    <Typography component="summary" variant="subtitle1">Scoring methodology</Typography>
                    <ScoringMethodologyEditor methodology={methodology} onPublished={() => load(true)} canManage={canManage} />
                </Box>
            )}
        </WorkspaceFrame>
    );
}
