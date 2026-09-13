import { Box, Typography } from '@mui/material';
import { color } from '../../design/tokens';

export type TemplateCardModel = {
    id: string;
    name: string;
    version?: string;
    source?: string;
    sourceLabel?: string;
    category?: string;
    questionCount?: number;
    domainCount?: number;
    estimatedMinutes?: number;
    evidenceRequired?: boolean;
    purpose?: string;
    framework?: string;
    selected?: boolean;
};

export default function TemplateCard({
    template,
    selected,
    onSelect,
}: {
    template: TemplateCardModel;
    selected?: boolean;
    onSelect?: () => void;
}) {
    const sourceLabel = template.sourceLabel
        || (template.source === 'SUPREME' ? 'Supreme template' : template.source === 'CLONED' || template.source === 'ORGANIZATION' ? 'Organization template' : template.source === 'CUSTOM' ? 'Custom template' : 'Supreme template');
    const meta = [
        template.category,
        template.questionCount != null ? `${template.questionCount} questions` : null,
        template.domainCount != null ? `${template.domainCount} domains` : null,
        template.estimatedMinutes != null ? `~${template.estimatedMinutes} min` : null,
        template.evidenceRequired ? 'Evidence required' : 'Evidence optional',
        template.version ? `v${template.version}` : null,
    ].filter(Boolean);

    return (
        <Box
            onClick={onSelect}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={onSelect ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            } : undefined}
            sx={{
                p: 2,
                border: `1px solid ${selected ? color.navy800 : color.line}`,
                bgcolor: selected ? color.goldDim : color.surface,
                borderRadius: '8px',
                cursor: onSelect ? 'pointer' : 'default',
            }}
        >
            <Typography variant="subtitle1">{template.name}</Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                {sourceLabel}{template.framework ? ` · ${template.framework}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75 }}>{meta.join(' · ')}</Typography>
            {template.purpose && (
                <Typography variant="caption" display="block" sx={{ mt: 0.75, color: color.inkMuted }}>
                    {template.purpose}
                </Typography>
            )}
        </Box>
    );
}
