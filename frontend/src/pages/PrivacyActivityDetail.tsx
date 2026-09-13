import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import StatusBadge from '../components/design/StatusBadge';
import Surface from '../components/design/Surface';
import AppTable from '../components/design/AppTable';
import QueryState from '../components/QueryState';
import { privacyAPI, vendorAPI } from '../services/api';

const SECTIONS = ['Overview', 'Purpose & Basis', 'Data', 'Data Subjects', 'Systems', 'Vendors', 'Transfers', 'Risks', 'Controls', 'Evidence', 'DPIA', 'Retention', 'Rights', 'Relationships', 'History'] as const;

export default function PrivacyActivityDetail() {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [purpose, setPurpose] = useState('Claims servicing');
    const [basisType, setBasisType] = useState('CONTRACT');
    const [rationale, setRationale] = useState('');
    const [dataKind, setDataKind] = useState('IDENTITY');
    const [subjectKind, setSubjectKind] = useState('CUSTOMERS');
    const [systemName, setSystemName] = useState('');
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
    const [vendorId, setVendorId] = useState('');
    const [privacyRole, setPrivacyRole] = useState('PROCESSOR');

    const load = () => {
        if (!publicId) return;
        setLoading(true);
        privacyAPI.activity(publicId)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.message || 'Unable to load processing activity'))
            .finally(() => setLoading(false));
    };

    useEffect(load, [publicId]);

    useEffect(() => {
        vendorAPI.getAll()
            .then((res) => {
                const rows = res.data?.vendors || res.data?.data?.vendors || [];
                setVendors(rows.map((row: { id: string; name: string }) => ({ id: row.id, name: row.name })));
            })
            .catch(() => setVendors([]));
    }, []);

    const run = (event: FormEvent, action: () => Promise<unknown>) => {
        event.preventDefault();
        action().then(load).catch((err) => setError(err.message));
    };

    return (
        <>
            <PageHeader
                crumbs={[{ label: 'Privacy', to: '/privacy-ops' }, { label: 'Processing activities', to: '/privacy-ops/activities' }, { label: publicId || 'Activity' }]}
                title={data ? `${data.publicId} ${data.name}` : 'Processing activity'}
                description="Full-page ROPA workspace. Recorded basis is not a lawfulness finding."
            />
            <QueryState loading={loading} error={error} empty={!data} emptyTitle="Activity not found" emptyBody="Return to processing activities and open a recorded item.">
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
                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                    <StatusBadge tone="neutral" label={data.status} />
                                    <StatusBadge tone="neutral" label={data.controllerRole} />
                                </Stack>
                                <Typography>{data.description || 'No description recorded.'}</Typography>
                                <Typography>Business process: {data.businessProcess || 'Not recorded'}</Typography>
                                <Typography>Owner: {data.owner}</Typography>
                                <Typography>Source: {data.sourceOfData || 'Not recorded'}</Typography>
                                <Typography>Storage: {(data.storageLocations || []).join(', ') || 'Not recorded'}</Typography>
                                <Typography>Jurisdictions: {(data.jurisdictions || []).join(', ') || 'Not recorded'}</Typography>
                                <Typography>Risk level: {data.riskLevel}</Typography>
                                <Typography sx={{ mt: 2 }} fontWeight={700}>Structured flow</Typography>
                                <Typography>{[data.flow.source, ...(data.flow.systems || []), data.flow.businessProcess, ...(data.flow.vendors || []), ...(data.flow.recipients || []), ...(data.flow.storage || []), ...(data.flow.jurisdictions || [])].filter(Boolean).join(' → ')}</Typography>
                            </Surface>
                        )}
                        {section === 'Purpose & Basis' && (
                            <Surface>
                                <Typography variant="h6" sx={{ mb: 1 }}>Recorded purposes</Typography>
                                {!data.purposes.length && <Typography color="text.secondary">No purpose is recorded.</Typography>}
                                {data.purposes.map((row: any) => (
                                    <Stack key={row.name} spacing={0.5} sx={{ mb: 1.5 }}>
                                        <Typography fontWeight={700}>{row.name}</Typography>
                                        <Typography color="text.secondary">{row.summary || 'No summary'}</Typography>
                                        {row.bases.map((basis: any) => (
                                            <Typography key={basis.rationale}>{basis.basisType} · {basis.regime} · {basis.status}. {basis.honesty}</Typography>
                                        ))}
                                    </Stack>
                                ))}
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addPurpose(publicId!, { name: purpose }))} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                                    <TextField label="Purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
                                    <Button type="submit">Add purpose</Button>
                                </Stack>
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addBasis(publicId!, { purposeName: purpose, basisType, rationale, regime: 'GDPR' }))} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
                                    <TextField select label="Recorded basis" value={basisType} onChange={(event) => setBasisType(event.target.value)} sx={{ minWidth: 200 }}>
                                        {['CONTRACT', 'CONSENT', 'LEGAL_OBLIGATION', 'LEGITIMATE_INTERESTS', 'BUSINESS_PURPOSE', 'OTHER'].map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                                    </TextField>
                                    <TextField label="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} required />
                                    <Button type="submit">Record basis</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Data' && (
                            <Surface>
                                <AppTable rows={data.dataCategories} rowKey={(row: any) => row.label} emptyTitle="No personal data categories" emptyBody="Add only categories that apply to this activity." columns={[
                                    { id: 'label', label: 'Category', render: (row: any) => row.label },
                                    { id: 'kind', label: 'Kind', render: (row: any) => row.kind },
                                    { id: 'sensitive', label: 'Sensitive recorded', render: (row: any) => row.sensitive ? 'Yes — metadata only' : 'No' },
                                ]} />
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addData(publicId!, { kind: dataKind, label: dataKind.replace(/_/g, ' '), sensitive: ['HEALTH', 'BIOMETRIC', 'CRIMINAL_LEGAL'].includes(dataKind) }))} direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                    <TextField select label="Data category" value={dataKind} onChange={(event) => setDataKind(event.target.value)} sx={{ minWidth: 220 }}>
                                        {[{ key: 'IDENTITY', label: 'Identity' }, { key: 'CONTACT', label: 'Contact' }, { key: 'FINANCIAL', label: 'Financial' }, { key: 'EMPLOYMENT', label: 'Employment' }, { key: 'HEALTH', label: 'Health' }, { key: 'LOCATION', label: 'Location' }, { key: 'ONLINE_IDENTIFIERS', label: 'Online Identifiers' }, { key: 'SPECIAL_CATEGORY', label: 'Special Category Data' }].map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                    </TextField>
                                    <Button type="submit">Add category</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Data Subjects' && (
                            <Surface>
                                <AppTable rows={data.dataSubjects} rowKey={(row: any) => row.label} emptyTitle="No data subjects" emptyBody="Not every category applies to every tenant." columns={[
                                    { id: 'label', label: 'Category', render: (row: any) => row.label },
                                    { id: 'kind', label: 'Kind', render: (row: any) => row.kind },
                                ]} />
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addSubject(publicId!, { kind: subjectKind }))} direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                    <TextField select label="Data subject" value={subjectKind} onChange={(event) => setSubjectKind(event.target.value)} sx={{ minWidth: 220 }}>
                                        {[{ key: 'CUSTOMERS', label: 'Customers' }, { key: 'EMPLOYEES', label: 'Employees' }, { key: 'APPLICANTS', label: 'Applicants' }, { key: 'CONTRACTORS', label: 'Contractors' }, { key: 'PROSPECTS', label: 'Prospects' }, { key: 'WEBSITE_VISITORS', label: 'Website Visitors' }, { key: 'SUPPLIERS', label: 'Suppliers' }].map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                    </TextField>
                                    <Button type="submit">Add subject</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Systems' && (
                            <Surface>
                                <AppTable rows={data.systems} rowKey={(row: any) => row.name || 'system'} emptyTitle="No systems" emptyBody="Link a system used by this processing activity." columns={[
                                    { id: 'name', label: 'System', render: (row: any) => row.name || 'Not named' },
                                    { id: 'role', label: 'Role', render: (row: any) => row.role },
                                ]} />
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addParty(publicId!, { partyType: 'SYSTEM', systemName }))} direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                    <TextField label="System name" value={systemName} onChange={(event) => setSystemName(event.target.value)} />
                                    <Button type="submit">Link system</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Vendors' && (
                            <Surface>
                                <AppTable rows={data.vendors} rowKey={(row: any) => row.vendorId || row.name || 'vendor'} emptyTitle="No processors" emptyBody="Reuse an existing Third Party vendor. Privacy does not create a second vendor database." columns={[
                                    { id: 'name', label: 'Vendor', render: (row: any) => row.name || 'Linked vendor' },
                                    { id: 'role', label: 'Privacy role', render: (row: any) => row.role },
                                    { id: 'jurisdiction', label: 'Jurisdiction', render: (row: any) => row.jurisdiction || 'Not recorded' },
                                    { id: 'open', label: '', render: (row: any) => row.vendorId ? <Button onClick={() => navigate(`/privacy-ops/vendors/${row.vendorId}`)}>Open vendor privacy</Button> : null },
                                ]} />
                                <Stack component="form" onSubmit={(event) => run(event, () => privacyAPI.addParty(publicId!, { partyType: 'VENDOR', vendorId, privacyRole }))} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                                    <TextField select label="Existing vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)} sx={{ minWidth: 260 }} required>
                                        {vendors.map((vendor) => <MenuItem key={vendor.id} value={vendor.id}>{vendor.name}</MenuItem>)}
                                    </TextField>
                                    <TextField select label="Privacy role" value={privacyRole} onChange={(event) => setPrivacyRole(event.target.value)} sx={{ minWidth: 200 }}>
                                        {[{ key: 'PROCESSOR', label: 'Processor' }, { key: 'SUBPROCESSOR', label: 'Subprocessor' }, { key: 'CONTROLLER', label: 'Controller' }, { key: 'JOINT_CONTROLLER', label: 'Joint Controller' }, { key: 'RECIPIENT', label: 'Recipient' }, { key: 'SERVICE_PROVIDER', label: 'Service Provider' }].map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                    </TextField>
                                    <Button type="submit" disabled={!vendorId}>Link vendor</Button>
                                </Stack>
                            </Surface>
                        )}
                        {section === 'Transfers' && (
                            <Surface>
                                <AppTable rows={data.transfers} rowKey={(row: any) => row.publicId} emptyTitle="No transfers" emptyBody="Record an international transfer when one exists." columns={[
                                    { id: 'publicId', label: 'Transfer', render: (row: any) => row.publicId },
                                    { id: 'path', label: 'Path', render: (row: any) => `${row.source} → ${row.destination}` },
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                ]} />
                            </Surface>
                        )}
                        {section === 'Risks' && (
                            <Surface>
                                <Typography>Linked privacy risks come from Supreme Risk. No invented residual scores.</Typography>
                                <AppTable rows={(data.affected?.privacyRisks || []).map((label: string) => ({ label }))} rowKey={(row: any) => row.label} emptyTitle="No linked privacy risks" emptyBody="Link an existing enterprise risk if one applies." columns={[{ id: 'label', label: 'Risk', render: (row: any) => row.label }]} />
                            </Surface>
                        )}
                        {section === 'Controls' && (
                            <Surface>
                                <AppTable rows={(data.affected?.controls || []).map((label: string) => ({ label }))} rowKey={(row: any) => row.label} emptyTitle="No linked controls" emptyBody="Reuse shared controls. Presence of a control is not proof." columns={[{ id: 'label', label: 'Control', render: (row: any) => row.label }]} />
                            </Surface>
                        )}
                        {section === 'Evidence' && (
                            <Surface>
                                <Typography sx={{ mb: 1 }}>Evidence stays in the shared CLEAN store. A file is not a finding that processing is lawful.</Typography>
                                <AppTable rows={(data.affected?.evidence || []).map((label: string) => ({ label }))} rowKey={(row: any) => row.label} emptyTitle="No linked CLEAN evidence" emptyBody="Link a shared control that already has evidence. Presence of a file is not proof." columns={[{ id: 'label', label: 'Evidence', render: (row: any) => row.label }]} />
                            </Surface>
                        )}
                        {section === 'DPIA' && (
                            <Surface>
                                <AppTable rows={data.dpias} rowKey={(row: any) => row.publicId} emptyTitle="No DPIAs" emptyBody="Screening can recommend review. It does not say a DPIA is legally required." columns={[
                                    { id: 'publicId', label: 'DPIA', render: (row: any) => row.publicId },
                                    { id: 'title', label: 'Title', render: (row: any) => row.title },
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                ]} />
                            </Surface>
                        )}
                        {section === 'Retention' && (
                            <Surface>
                                <Typography>Retention summary: {data.retentionSummary || 'Not recorded'}</Typography>
                                <AppTable rows={data.retentionRules} rowKey={(row: any) => row.publicId} emptyTitle="No retention rules" emptyBody="Supreme surfaces due work. It does not auto-delete customer data." columns={[
                                    { id: 'publicId', label: 'Rule', render: (row: any) => row.publicId },
                                    { id: 'period', label: 'Period', render: (row: any) => row.period },
                                ]} />
                            </Surface>
                        )}
                        {section === 'Rights' && (
                            <Surface>
                                <AppTable rows={data.rightsRequests} rowKey={(row: any) => row.publicId} emptyTitle="No linked rights requests" emptyBody="Requester identity is withheld from this list." columns={[
                                    { id: 'publicId', label: 'Request', render: (row: any) => row.publicId },
                                    { id: 'requestType', label: 'Type', render: (row: any) => row.requestType },
                                    { id: 'status', label: 'Status', render: (row: any) => row.status },
                                ]} />
                            </Surface>
                        )}
                        {section === 'Relationships' && (
                            <Surface>
                                <Typography>What is affected uses recorded links only.</Typography>
                                <Typography>Systems: {(data.affected?.systems || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Vendors: {(data.affected?.vendors || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Data: {(data.affected?.dataCategories || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Subjects: {(data.affected?.dataSubjects || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Jurisdictions: {(data.affected?.jurisdictions || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Transfers: {(data.affected?.transfers || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Privacy risks: {(data.affected?.privacyRisks || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Controls: {(data.affected?.controls || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Evidence: {(data.affected?.evidence || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Requirements: {(data.affected?.requirements || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Gaps: {(data.affected?.gaps || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>DPIAs: {(data.affected?.dpias || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Rights requests: {(data.affected?.rightsRequests || []).join(', ') || 'None recorded'}</Typography>
                                <Typography>Retention: {(data.affected?.retentionRules || []).join(', ') || 'None recorded'}</Typography>
                            </Surface>
                        )}
                        {section === 'History' && (
                            <Surface>
                                <AppTable rows={data.history || []} rowKey={(row: any) => `${row.eventType}-${row.createdAt}`} emptyTitle="No history" emptyBody="Material changes appear here in customer language." columns={[
                                    { id: 'eventType', label: 'Event', render: (row: any) => row.eventType },
                                    { id: 'summary', label: 'What happened', render: (row: any) => row.summary },
                                ]} />
                            </Surface>
                        )}
                    </Stack>
                )}
            </QueryState>
        </>
    );
}
