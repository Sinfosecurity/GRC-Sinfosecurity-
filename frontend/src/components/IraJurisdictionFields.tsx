import { Stack, Typography } from '@mui/material';
import CountryMultiSelect, { type CountryOption } from './CountryMultiSelect';

export default function IraJurisdictionFields({
    storageValue,
    processingValue,
    countries,
    onChange,
    disabled,
}: {
    storageValue: string;
    processingValue: string;
    countries: CountryOption[];
    onChange: (key: 'a6_storage' | 'a6_processing', value: string) => void;
    disabled?: boolean;
}) {
    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Where will our data be stored or handled?</Typography>
            <Typography variant="body2">Select the actual countries. You do not need to classify “same region.” Don’t know is allowed.</Typography>
            <CountryMultiSelect
                label="Data storage countries"
                value={storageValue}
                countries={countries}
                onChange={(value) => onChange('a6_storage', value)}
                disabled={disabled}
            />
            <CountryMultiSelect
                label="Data processing / access countries"
                value={processingValue}
                countries={countries}
                onChange={(value) => onChange('a6_processing', value)}
                disabled={disabled}
            />
        </Stack>
    );
}
