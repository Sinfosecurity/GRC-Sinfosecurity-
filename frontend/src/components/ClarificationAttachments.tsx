import { Button, Stack, Typography } from '@mui/material';

export type ClarificationAttachment = {
    id: string;
    filename: string;
    fileType?: string;
    uploadedAt?: string | null;
    scanState?: string;
    usable?: boolean;
};

export default function ClarificationAttachments({
    attachments,
    onUpload,
    disabled,
    downloadHref,
}: {
    attachments: ClarificationAttachment[];
    onUpload?: (file: File) => void;
    disabled?: boolean;
    downloadHref?: (id: string) => string;
}) {
    return (
        <Stack spacing={1}>
            <Typography fontWeight={700}>Supporting documents (optional)</Typography>
            {onUpload && !disabled && (
                <Button component="label">
                    Upload documents
                    <input hidden type="file" multiple onChange={(event) => {
                        Array.from(event.target.files || []).forEach((file) => onUpload(file));
                        event.target.value = '';
                    }} />
                </Button>
            )}
            {!attachments.length && <Typography variant="body2">No supporting documents attached.</Typography>}
            {attachments.map((file) => (
                <Stack key={file.id} spacing={0.25} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 1 }}>
                    <Typography fontWeight={700}>{file.filename}</Typography>
                    <Typography variant="body2">{file.fileType || 'File'} · {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'Just now'}</Typography>
                    <Typography variant="body2">Scan: {file.scanState || 'Uploaded'} · {file.usable ? 'Usable' : 'Unusable until the file is clean'}</Typography>
                    {downloadHref && file.usable && <Button href={downloadHref(file.id)} size="small">Download</Button>}
                </Stack>
            ))}
        </Stack>
    );
}
