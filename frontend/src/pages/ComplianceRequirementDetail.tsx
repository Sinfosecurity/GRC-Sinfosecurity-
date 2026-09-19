import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { complianceAPI, sccAPI } from '../services/api';

const SECTIONS = ['Overview', 'Controls', 'Evidence', 'Testing', 'Gaps', 'Exceptions', 'Related risks', 'Relationships', 'History'] as const;

export default function ComplianceRequirementDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [data, setData] = useState<any>(null);
    const [owners, setOwners] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [applicability, setApplicability] = useState('APPLICABLE');
    const [rationale, setRationale] = useState('');
    const [ownerUserId, setOwnerUserId] = useState('');

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        Promise.all([complianceAPI.requirement(publicId), complianceAPI.owners().catch(() => ({ data: { data: [] } }))])
            .then(([res, ownerRes]) => {
                setData(res.data.data);
                setApplicability(res.data.data.applicabilityKey);
                setOwnerUserId(res.data.data.ownerUserId || '');
                setOwners(ownerRes.data.data);
            })
            .catch((err) => setError(err.message || 'Unable to load requirement'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [publicId]);

    const saveApplicability = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.setApplicability(publicId!, { applicability, rationale }).then(load).catch((err) => setError(err.message));
    };
    const saveOwner = (event: FormEvent) => {
        event.preventDefault();
        complianceAPI.setOwner(publicId!, { ownerUserId: ownerUserId || null }).then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Compliance' }, { label: 'Frameworks', to: '/compliance/frameworks' }, { label: data?.requirementKey || 'Requirement' }]}
                title={data ? `${data.requirementKey}` : 'Requirement'}
                description={data?.summary}
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Requirement not found" emptyBody="Return to the framework program.">
                {data && (
                    <Stack spacing={2}>
                        <Alert severity="info">{data.honesty}</Alert>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {SECTIONS.map((item) => (
                                <Button key={item} variant={section === item ? 'contained' : 'outlined'} onClick={() => setSection(item)}>{item}</Button>
                            ))}
                        </Stack>
                        {section === 'Overview' && (
                            <Surface>
                                <Typography>Requirement: {data.requirementKey}</Typography>
                                <Typography>Framework: {data.framework} {data.version}</Typography>
                                <Typography>Authority / source: {data.authority || 'Not recorded'}</Typography>
                                <Typography>Jurisdiction: {data.jurisdiction || 'Not recorded'}</Typography>
                                <Typography>Effective: {data.effectiveFrom ? String(data.effectiveFrom).slice(0, 10) : 'Not recorded'}</Typography>
                                <Typography>Applicability: {data.applicability}</Typography>
                                <Typography>Owner: {data.owner}</Typography>
                                {data.nextAction && (
                                    <Alert severity="info" sx={{ my: 1.5 }}>Next: {data.nextAction.label}. {data.nextAction.detail}</Alert>
                                )}
                                {data.sourceUrl && <Typography variant="body2">Source: {data.sourceUrl}</Typography>}
                                {data.applicabilityKey === 'NOT_APPLICABLE' && (
                                    <Typography color="text.secondary">Not applicable rationale: {data.naRationale} · {data.naActor} · {data.naAt ? new Date(data.naAt).toLocaleString() : ''}. This is not pass.</Typography>
                                )}
                                <Stack component="form" onSubmit={saveApplicability} spacing={1} sx={{ mt: 2, maxWidth: 480 }}>
                                    <TextField select label="Applicability" value={applicability} onChange={(event) => setApplicability(event.target.value)}>
                                        <MenuItem value="APPLICABLE">Applicable</MenuItem>
                                        <MenuItem value="NOT_APPLICABLE">Not applicable</MenuItem>
                                        <MenuItem value="UNDER_REVIEW">Under review</MenuItem>
                                        <MenuItem value="NOT_DETERMINED">Not determined</MenuItem>
                                    </TextField>
                                    {applicability === 'NOT_APPLICABLE' && (
                                        <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} required />
                                    )}
                                    <Button type="submit" variant="contained">Save applicability</Button>
                                </Stack>
                                <Stack component="form" onSubmit={saveOwner} spacing={1} sx={{ mt: 2, maxWidth: 480 }}>
                                    <TextField select label="Owner" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}>
                                        <MenuItem value="">Unassigned</MenuItem>
                                        {owners.map((owner) => (
                                            <MenuItem key={owner.id} value={owner.id}>{owner.firstName} {owner.lastName}</MenuItem>
                                        ))}
                                    </TextField>
                                    <Button type="submit">Assign owner</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Controls' && (
                            <Surface>
                                {!data.controls.length && <Typography color="text.secondary">No mapped common controls. This is a gap if the requirement is applicable.</Typography>}
                                {data.controls.map((control: any) => (
                                    <Box key={control.id} sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => navigate(`/control-center/${control.id}`)}>
                                        <Typography fontWeight={700}>{control.controlKey} · {control.title}</Typography>
                                        <Typography color="text.secondary">{control.strength} · {control.implementation} · {control.effectiveness} · Latest test {control.latestTest}</Typography>
                                    </Box>
                                ))}
                            </Surface>
                        )}
                        {section === 'Evidence' && (
                            <Surface>
                                <Alert severity="info" sx={{ mb: 2 }}>{data.existingEvidenceOffer}</Alert>
                                {data.evidence.map((item: any) => (
                                    <Box key={item.id} sx={{ mb: 1 }}>
                                        <Typography>{item.filename} · {item.coverage} · {item.relationship}</Typography>
                                        {item.reuse && (
                                            <Typography color="text.secondary">
                                                Reuse: {item.reuse.controls} control{item.reuse.controls === 1 ? '' : 's'} · {item.reuse.requirements} requirement{item.reuse.requirements === 1 ? '' : 's'} · {item.reuse.programs} program{item.reuse.programs === 1 ? '' : 's'}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                                {data.evidence.map((item: any) => (
                                    <Button key={`open-${item.id}`} size="small" onClick={() => navigate(`/documents?storedObjectId=${item.storedObjectId}`)}>Open {item.filename}</Button>
                                ))}
                                <Button sx={{ mt: 1 }} onClick={() => navigate('/documents')}>Use existing evidence</Button>
                            </Surface>
                        )}
                        {section === 'Testing' && (
                            <Surface>
                                {data.controls.map((control: any) => (
                                    <Typography key={control.id}>{control.controlKey}: {control.latestTest}. Not tested is not pass.</Typography>
                                ))}
                            </Surface>
                        )}
                        {section === 'Gaps' && (
                            <Surface>
                                {data.gaps.map((row: any) => <Typography key={row.publicId}>{row.publicId} · {row.title} · {row.status}</Typography>)}
                            </Surface>
                        )}
                        {section === 'Exceptions' && (
                            <Surface>
                                {data.exceptions.map((row: any) => <Typography key={row.publicId}>{row.publicId} · {row.scope} · {row.status}</Typography>)}
                            </Surface>
                        )}
                        {section === 'Related risks' && (
                            <Surface>
                                {!data.relatedRisks.length && <Typography color="text.secondary">No enterprise risk is linked. Linking records potential impact only.</Typography>}
                                {data.relatedRisks.map((row: any) => (
                                    <Box key={row.publicId} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => navigate(`/risks/${row.publicId}`)}>
                                        <Typography fontWeight={700}>{row.publicId} · {row.title}</Typography>
                                        <Typography color="text.secondary">{row.note}</Typography>
                                    </Box>
                                ))}
                            </Surface>
                        )}
                        {section === 'Relationships' && (
                            <Surface>
                                <Button onClick={() => sccAPI.frameworks()}>Open framework coverage</Button>
                                <Typography color="text.secondary" sx={{ mt: 1 }}>Graph relationships are projected from these records. They are not a second system of record.</Typography>
                            </Surface>
                        )}
                        {section === 'History' && (
                            <Surface>
                                {data.history.map((row: any, index: number) => (
                                    <Box key={`${row.title}-${index}`} sx={{ mb: 1 }}>
                                        <Typography fontWeight={600}>{row.title}{row.change ? ` · ${row.change}` : ''}</Typography>
                                        <Typography color="text.secondary">{row.summary}</Typography>
                                    </Box>
                                ))}
                            </Surface>
                        )}
                    </Stack>
                )}
            </QueryState>
        </>
    );
}
