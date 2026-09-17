import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import Surface from '../components/design/Surface';
import QueryState from '../components/QueryState';
import { PageShell } from '../components/experience/ExperienceKit';
import { identityAPI } from '../services/api';

const ROLES = ['VIEWER', 'AUDITOR', 'BUSINESS_OWNER', 'APPROVER', 'ASSESSOR', 'RISK_MANAGER', 'ORGANIZATION_ADMIN'];

type Overview = {
    sso: { key: string; label: string };
    protocol: string | null;
    domain: { key: string; label: string; value?: string };
    jit: string;
    scim: { key: string; label: string };
    ssoEnforcement: string;
    provisionedUsers: number;
    lastSuccessfulSso: string | null;
    lastProvisioningActivity: string | null;
    recoveryAdministrator: boolean;
};

export default function IdentityAccess() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [providers, setProviders] = useState<any[]>([]);
    const [tokens, setTokens] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [onceToken, setOnceToken] = useState<string | null>(null);
    const [domainToken, setDomainToken] = useState<string | null>(null);
    const [domainName, setDomainName] = useState('');
    const [group, setGroup] = useState('');
    const [role, setRole] = useState('VIEWER');
    const provider = providers[0];

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [over, list, scim, events] = await Promise.all([
                identityAPI.overview(),
                identityAPI.providers(),
                identityAPI.scimTokens(),
                identityAPI.activity(),
            ]);
            setOverview(over.data.data);
            setProviders(list.data.data || []);
            setTokens(scim.data.data || []);
            setActivity(events.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Unable to load identity settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const run = async (work: () => Promise<void>, success: string) => {
        setError(null);
        setMessage(null);
        try {
            await work();
            setMessage(success);
            await load();
        } catch (err: any) {
            setError(err.message || 'Unable to save');
        }
    };

    const createProvider = (protocol: 'SAML' | 'OIDC') => run(async () => {
        await identityAPI.createProvider({ protocol, displayName: protocol === 'SAML' ? 'Company SAML' : 'Company OIDC' });
    }, 'Identity provider created. It is not verified until you test the connection.');

    const saveSaml = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!provider) return;
        const data = new FormData(event.currentTarget);
        run(async () => {
            await identityAPI.updateProvider(provider.id, {
                displayName: String(data.get('displayName') || ''),
                idpEntityId: String(data.get('idpEntityId') || ''),
                ssoUrl: String(data.get('ssoUrl') || ''),
                idpCertificate: String(data.get('idpCertificate') || ''),
            });
        }, 'Provider configuration saved. Status remains not verified until a test succeeds.');
    };

    return (
        <PageShell>
            <PageHeader
                crumbs={[{ label: 'Administration' }, { label: 'Identity & Access' }]}
                title="Identity & Access"
                description="Connect your identity provider, verify a domain, choose provisioning, and enable Company SSO. Green states appear only after a real test or verified domain."
            />
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {onceToken && <Alert severity="warning" sx={{ mb: 2 }}>Copy this provisioning token now. Supreme will not show it again.</Alert>}
            <QueryState loading={loading} error={error}>
            <Surface>
                <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} aria-label="Identity and access sections">
                    <Tab label="Overview" />
                    <Tab label="Single Sign-On" />
                    <Tab label="Domains" />
                    <Tab label="Provisioning" />
                    <Tab label="Role Mapping" />
                    <Tab label="Security Policy" />
                    <Tab label="Activity" />
                </Tabs>

                {tab === 0 && overview && (
                    <Grid container spacing={2}>
                        {[
                            ['Single Sign-On', overview.sso.label],
                            ['Protocol', overview.protocol || 'Not configured'],
                            ['Domain', overview.domain.value ? `${overview.domain.label}: ${overview.domain.value}` : overview.domain.label],
                            ['JIT provisioning', overview.jit],
                            ['Provisioning', overview.scim.label],
                            ['SSO enforcement', overview.ssoEnforcement],
                            ['Provisioned users', String(overview.provisionedUsers)],
                            ['Last successful SSO', overview.lastSuccessfulSso ? new Date(overview.lastSuccessfulSso).toLocaleString() : 'None'],
                            ['Last provisioning activity', overview.lastProvisioningActivity ? new Date(overview.lastProvisioningActivity).toLocaleString() : 'None'],
                            ['Recovery administrator', overview.recoveryAdministrator ? 'Set' : 'Not set'],
                        ].map(([label, value]) => (
                            <Grid item xs={12} sm={6} md={4} key={label}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="overline">{label}</Typography>
                                        <Typography variant="h6">{value}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {tab === 1 && (
                    <Stack spacing={2}>
                        <Typography>
                            1. Choose a protocol. 2. Give Supreme’s service-provider details to your identity provider.
                            3. Enter the identity provider configuration. 4. Map attributes and groups. 5. Test the connection.
                            6. Verify a domain. 7. Choose provisioning. 8. Review, then enable. Company SSO cannot be required until a test succeeds and a recovery administrator is set.
                        </Typography>
                        {!provider && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button variant="contained" onClick={() => createProvider('SAML')}>Start SAML setup</Button>
                                <Button variant="outlined" onClick={() => createProvider('OIDC')}>Start OIDC setup</Button>
                            </Stack>
                        )}
                        {provider && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 1 }}>{provider.displayName}</Typography>
                                    <Typography sx={{ mb: 2 }}>Status: {provider.status?.label}</Typography>
                                    {provider.saml && (
                                        <Box component="form" onSubmit={saveSaml}>
                                            <Stack spacing={2}>
                                                <TextField name="displayName" label="Display name" defaultValue={provider.displayName} />
                                                <TextField label="Assertion Consumer Service URL" value={provider.saml.acsUrl} InputProps={{ readOnly: true }} />
                                                <TextField label="Service provider entity ID" value={provider.saml.spEntityId} InputProps={{ readOnly: true }} />
                                                <Button href={provider.saml.metadataUrl} target="_blank" rel="noreferrer">Download service provider metadata</Button>
                                                <TextField name="idpEntityId" label="Identity provider entity ID" defaultValue={provider.saml.idpEntityId || ''} />
                                                <TextField name="ssoUrl" label="Single sign-on URL" defaultValue={provider.saml.ssoUrl || ''} />
                                                <TextField name="idpCertificate" label="X.509 signing certificate" defaultValue="" multiline minRows={4} helperText={provider.saml.certificateConfigured ? 'A certificate is stored. Paste a replacement only if you are rotating it.' : 'Paste the public signing certificate.'} />
                                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                    <Button type="submit" variant="contained">Save configuration</Button>
                                                    <Button onClick={() => run(async () => {
                                                        const result = await identityAPI.testProvider(provider.id);
                                                        if (result.data.data?.redirectTo) window.location.href = result.data.data.redirectTo;
                                                    }, 'Opening the identity provider for a test sign-in.')}>Test connection</Button>
                                                    <Button onClick={() => run(async () => { await identityAPI.enableProvider(provider.id, true); }, 'Company SSO enabled.')}>Enable</Button>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    )}
                                    {provider.oidc && (
                                        <Stack spacing={2}>
                                            <TextField label="Redirect URI" value={provider.oidc.redirectUri} InputProps={{ readOnly: true }} />
                                            <TextField label="Issuer" defaultValue={provider.oidc.issuer || ''} onBlur={(event) => {
                                                if (event.target.value) identityAPI.discoverOidc(provider.id, event.target.value).then(load);
                                            }} helperText="Leave the field after entry to use discovery." />
                                            <TextField label="Client ID" defaultValue={provider.oidc.clientId || ''} onBlur={(event) => identityAPI.updateProvider(provider.id, { clientId: event.target.value })} />
                                            <TextField label="Client secret" type="password" helperText={provider.oidc.clientSecretSet ? 'A secret is stored. Enter a new value only to replace it.' : 'Stored encrypted. It is not shown again.'} onBlur={(event) => {
                                                if (event.target.value) identityAPI.updateProvider(provider.id, { clientSecret: event.target.value });
                                            }} />
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                )}

                {tab === 2 && (
                    <Card>
                        <CardContent>
                            <Stack spacing={2} component="form" onSubmit={(event) => {
                                event.preventDefault();
                                run(async () => {
                                    const created = await identityAPI.startDomain({ domain: domainName, providerId: provider?.id });
                                    setDomainToken(created.data.data.tokenShownOnce);
                                }, 'Domain claim started. Verify the TXT or well-known file before it can be used for discovery.');
                            }}>
                                <TextField label="Work email domain" value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="acme.com" />
                                <Button type="submit" variant="contained">Start domain verification</Button>
                                {domainToken && (
                                    <Alert severity="info">
                                        Add this TXT record, then verify: {domainToken}
                                    </Alert>
                                )}
                                {provider?.domains?.map((row: any) => (
                                    <Stack key={row.id || row.domain} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                        <Typography>{row.domain} — {row.status === 'VERIFIED' ? 'Verified' : 'Pending'}</Typography>
                                        {row.status !== 'VERIFIED' && (
                                            <Button onClick={() => run(async () => { await identityAPI.verifyDomain(row.id, domainToken || undefined); }, 'Domain verified.')}>Verify domain</Button>
                                        )}
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {tab === 3 && (
                    <Card>
                        <CardContent>
                            <Typography sx={{ mb: 2 }}>SCIM 2.0 base URL: <code>/scim/v2</code></Typography>
                            <Button variant="contained" onClick={() => run(async () => {
                                const created = await identityAPI.createScimToken({ label: 'IdP provisioning', providerId: provider?.id });
                                setOnceToken(created.data.data.token);
                            }, 'Provisioning token created. Copy it now.')}>Create provisioning token</Button>
                            {onceToken && <TextField sx={{ mt: 2 }} fullWidth label="Provisioning token (shown once)" value={onceToken} InputProps={{ readOnly: true }} />}
                            <Stack sx={{ mt: 2 }} spacing={1}>
                                {tokens.map((row) => (
                                    <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                        <Typography>{row.label} — {row.revoked ? 'Revoked' : 'Active'} — last activity {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : 'None'}</Typography>
                                        {!row.revoked && (
                                            <>
                                                <Button onClick={() => run(async () => {
                                                    const rotated = await identityAPI.rotateScimToken(row.id);
                                                    setOnceToken(rotated.data.data.token);
                                                }, 'Token rotated.')}>Rotate</Button>
                                                <Button onClick={() => run(async () => { await identityAPI.revokeScimToken(row.id); }, 'Token revoked.')}>Revoke</Button>
                                            </>
                                        )}
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {tab === 4 && provider && (
                    <Card>
                        <CardContent>
                            <Stack spacing={2} component="form" onSubmit={(event) => {
                                event.preventDefault();
                                run(async () => {
                                    const current = provider.mappings || [];
                                    await identityAPI.mappings(provider.id, [...current, { idpGroup: group, supremeRole: role }]);
                                    setGroup('');
                                }, 'Role mapping saved. Unknown groups do not become privileged.');
                            }}>
                                <Typography>Map identity provider groups to existing Supreme roles. Unknown groups never grant access on their own.</Typography>
                                <TextField label="Identity provider group" value={group} onChange={(e) => setGroup(e.target.value)} />
                                <TextField select label="Supreme role" value={role} onChange={(e) => setRole(e.target.value)}>
                                    {ROLES.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, ' ')}</MenuItem>)}
                                </TextField>
                                <Button type="submit" variant="contained">Add mapping</Button>
                                {(provider.mappings || []).map((row: any) => (
                                    <Typography key={row.id}>{row.idpGroup} → {row.supremeRole}</Typography>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {tab === 5 && provider && (
                    <Card>
                        <CardContent>
                            <Stack spacing={2}>
                                <Button variant="outlined" onClick={() => run(async () => { await identityAPI.setPolicy(provider.id, { ssoEnforcement: 'OPTIONAL', passwordLoginAllowed: true }); }, 'Company SSO is optional.')}>SSO optional</Button>
                                <Button variant="contained" onClick={() => run(async () => { await identityAPI.setPolicy(provider.id, { ssoEnforcement: 'REQUIRED' }); }, 'Company SSO is required. Recovery administrator remains able to sign in with a password.')}>Require Company SSO</Button>
                                <Button onClick={() => run(async () => { await identityAPI.setPolicy(provider.id, { jitEnabled: true }); }, 'Just-in-time provisioning enabled.')}>Enable JIT</Button>
                                <Button onClick={() => run(async () => { await identityAPI.setPolicy(provider.id, { jitEnabled: false }); }, 'Just-in-time provisioning disabled.')}>Disable JIT</Button>
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {tab === 6 && (
                    <Card>
                        <CardContent>
                            {activity.length === 0 && <Typography>No identity activity yet.</Typography>}
                            {activity.map((row) => (
                                <Typography key={row.id} sx={{ mb: 1 }}>{new Date(row.timestamp || row.createdAt).toLocaleString()} — {row.action} — {row.result}</Typography>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </Surface>
            </QueryState>
        </PageShell>
    );
}
