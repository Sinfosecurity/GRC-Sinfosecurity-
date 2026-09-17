import { Alert } from '@mui/material';
import PageHeader from '../components/design/PageHeader';
import WorkspaceFrame from '../components/design/WorkspaceFrame';
import Surface from '../components/design/Surface';

export default function LegacyQuarantine() {
    return (
        <WorkspaceFrame purpose="reading">
            <PageHeader
                eyebrow="Quarantined"
                title="This legacy GRC page is not in the production path"
                description="Supreme Third Party does not expose unfinished mock GRC modules to paying users."
            />
            <Surface>
                <Alert severity="warning">
                    Set <code>VITE_ENABLE_LEGACY_GRC=true</code> only for internal review. Do not enable this flag in staging or production.
                </Alert>
            </Surface>
        </WorkspaceFrame>
    );
}
