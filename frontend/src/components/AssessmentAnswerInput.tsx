import { useEffect, useState } from 'react';
import { MenuItem, TextField } from '@mui/material';

export default function AssessmentAnswerInput({
    questionKey,
    savedValue,
    options,
    questionType,
    disabled,
    onSave,
    onDraftChange,
}: {
    questionKey: string;
    savedValue: string;
    options: string[];
    questionType?: string | null;
    disabled: boolean;
    onSave: (value: string) => void;
    onDraftChange: (value: string) => void;
}) {
    const [value, setValue] = useState(savedValue);
    const isSelect = options.length > 0 && questionType !== 'TEXT';

    useEffect(() => {
        setValue(savedValue);
        onDraftChange(savedValue);
        // Sync only when the operator moves to another question. A later saved-value
        // update must not wipe characters that are still being typed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionKey]);

    if (isSelect) {
        return (
            <TextField
                select
                fullWidth
                label="Answer"
                value={value}
                disabled={disabled}
                autoComplete="off"
                onChange={(event) => {
                    setValue(event.target.value);
                    onDraftChange(event.target.value);
                    onSave(event.target.value);
                }}
            >
                {options.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
            </TextField>
        );
    }

    return (
        <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            label="Answer"
            value={value}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) => {
                setValue(event.target.value);
                onDraftChange(event.target.value);
            }}
            onBlur={(event) => onSave(event.target.value)}
        />
    );
}
