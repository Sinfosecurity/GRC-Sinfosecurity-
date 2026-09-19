import { Autocomplete, Chip, TextField, Typography } from '@mui/material';

export type CountryOption = { iso2: string; label: string };

const DONT_KNOW = 'dont_know';

export default function CountryMultiSelect({
    label,
    value,
    countries,
    onChange,
    disabled,
    dontKnowLabel = "Don't know / Not yet confirmed",
}: {
    label: string;
    value: string;
    countries: CountryOption[];
    onChange: (next: string) => void;
    disabled?: boolean;
    dontKnowLabel?: string;
}) {
    const selected = String(value || '').split('|').filter(Boolean);
    const dontKnow = selected.includes(DONT_KNOW);
    const options = [{ iso2: DONT_KNOW, label: dontKnowLabel }, ...countries];
    const chosen = options.filter((option) => selected.includes(option.iso2));

    return (
        <>
            <Autocomplete
                multiple
                disabled={disabled}
                options={options}
                value={chosen}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, item) => option.iso2 === item.iso2}
                onChange={(_event, next) => {
                    const codes = next.map((item) => item.iso2);
                    const onlyDontKnow = codes.includes(DONT_KNOW) ? [DONT_KNOW] : codes.filter((code) => code !== DONT_KNOW);
                    onChange(onlyDontKnow.join('|'));
                }}
                renderTags={(items, getTagProps) => items.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option.iso2} label={option.label} size="small" />
                ))}
                renderInput={(params) => <TextField {...params} label={label} />}
            />
            {dontKnow && (
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                    Not yet confirmed. GRC will not convert this into a geographic risk score until countries are known.
                </Typography>
            )}
        </>
    );
}
