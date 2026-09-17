import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Collapse,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { color, radius } from '../../design/tokens';
import EmptyState from './EmptyState';

export type Column<T> = {
    id: string;
    label: string;
    sortValue?: (row: T) => string | number;
    render: (row: T) => ReactNode;
    width?: number | string;
    hideOnMobile?: boolean;
    priority?: 'primary' | 'secondary';
};

type Props<T> = {
    rows: T[];
    columns: Column<T>[];
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
    searchPlaceholder?: string;
    searchValue?: (row: T) => string;
    emptyTitle?: string;
    emptyBody?: string;
    emptyAction?: ReactNode;
    pageSize?: number;
    toolbar?: ReactNode;
    embedded?: boolean;
};

export default function AppTable<T>({
    rows,
    columns,
    rowKey,
    onRowClick,
    searchPlaceholder = 'Search',
    searchValue,
    emptyTitle = 'Nothing here yet',
    emptyBody = 'When records exist for this organization, they will appear here.',
    emptyAction,
    pageSize = 12,
    toolbar,
    embedded = false,
}: Props<T>) {
    const [query, setQuery] = useState('');
    const [sortId, setSortId] = useState<string | null>(null);
    const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);
    const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let next = rows;
        if (q && searchValue) {
            next = rows.filter((row) => searchValue(row).toLowerCase().includes(q));
        }
        if (sortId) {
            const column = columns.find((item) => item.id === sortId);
            if (column?.sortValue) {
                next = [...next].sort((a, b) => {
                    const av = column.sortValue!(a);
                    const bv = column.sortValue!(b);
                    if (av < bv) return direction === 'asc' ? -1 : 1;
                    if (av > bv) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        }
        return next;
    }, [rows, query, searchValue, sortId, direction, columns]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, pageCount - 1);
    const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
    const primaryColumns = columns.filter((column) => (column.priority || (column.hideOnMobile ? 'secondary' : 'primary')) === 'primary');
    const secondaryColumns = columns.filter((column) => (column.priority || (column.hideOnMobile ? 'secondary' : 'primary')) === 'secondary');

    const toggleSort = (id: string) => {
        if (sortId !== id) {
            setSortId(id);
            setDirection('asc');
            return;
        }
        setDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
    };

    return (
        <Box>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                sx={{
                    mb: embedded ? 0 : 1.5,
                    px: embedded ? { xs: 2, md: 3 } : 0,
                    py: embedded ? 2 : 0,
                    borderBottom: embedded ? `1px solid ${color.line}` : 'none',
                }}
            >
                {searchValue && (
                    <TextField
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(0);
                        }}
                        placeholder={searchPlaceholder}
                        inputProps={{ 'aria-label': searchPlaceholder }}
                        sx={{
                            minWidth: { sm: 260 },
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: color.surfaceMuted,
                                borderRadius: `${radius.md}px`,
                            },
                        }}
                    />
                )}
                {toolbar}
            </Stack>
            {filtered.length === 0 ? (
                <Box sx={{ px: embedded ? { xs: 2, md: 3 } : 0, py: embedded ? 1 : 0 }}>
                    <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
                </Box>
            ) : (
                <>
                    {compact ? (
                <Stack spacing={1.5} sx={{ maxWidth: '100%', overflowX: 'hidden' }}>
                    {visible.map((row) => {
                        const key = rowKey(row);
                        const open = Boolean(openCards[key]);
                        return (
                            <Box
                                key={key}
                                data-testid="record-card"
                                role={onRowClick ? 'button' : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                onKeyDown={onRowClick ? (event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onRowClick(row);
                                    }
                                } : undefined}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '8px',
                                    p: 1.5,
                                    cursor: onRowClick ? 'pointer' : 'default',
                                }}
                            >
                                <Stack spacing={1}>
                                    {primaryColumns.map((column) => (
                                        <Box key={column.id}>
                                            {column.label ? <Typography variant="caption" color="text.secondary">{column.label}</Typography> : null}
                                            <Typography component="div">{column.render(row)}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                                {secondaryColumns.length > 0 && (
                                    <>
                                        <Button
                                            size="small"
                                            sx={{ mt: 1 }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setOpenCards((current) => ({ ...current, [key]: !current[key] }));
                                            }}
                                        >
                                            {open ? 'Hide details' : 'Details'}
                                        </Button>
                                        <Collapse in={open}>
                                            <Stack spacing={1} sx={{ mt: 1 }}>
                                                {secondaryColumns.map((column) => (
                                                    <Box key={column.id}>
                                                        {column.label ? <Typography variant="caption" color="text.secondary">{column.label}</Typography> : null}
                                                        <Typography component="div">{column.render(row)}</Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Collapse>
                                    </>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
                    ) : (
                    <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto', border: embedded ? 'none' : '1px solid', borderColor: embedded ? 'transparent' : 'divider', borderRadius: embedded ? 0 : '8px' }}>
                        <Table size="small" sx={{ minWidth: 640 }} aria-label="Records">
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            sx={{
                                                width: column.width,
                                                color: 'text.primary',
                                                fontWeight: 700,
                                                display: column.hideOnMobile ? { xs: 'none', md: 'table-cell' } : undefined,
                                            }}
                                        >
                                            {column.sortValue ? (
                                                <TableSortLabel
                                                    active={sortId === column.id}
                                                    direction={sortId === column.id ? direction : 'asc'}
                                                    onClick={() => toggleSort(column.id)}
                                                >
                                                    {column.label}
                                                </TableSortLabel>
                                            ) : (
                                                column.label
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visible.map((row) => (
                                    <TableRow
                                        key={rowKey(row)}
                                        hover
                                        tabIndex={onRowClick ? 0 : undefined}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        onKeyDown={onRowClick ? (event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onRowClick(row);
                                            }
                                        } : undefined}
                                        sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                                    >
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column.id}
                                                sx={{ display: column.hideOnMobile ? { xs: 'none', md: 'table-cell' } : undefined }}
                                            >
                                                {column.render(row)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    )}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: embedded ? 0 : 1.5, px: embedded ? { xs: 2, md: 3 } : 0, py: embedded ? 1.5 : 0 }}>
                        <Typography variant="caption">
                            {filtered.length} record{filtered.length === 1 ? '' : 's'}
                        </Typography>
                        {pageCount > 1 && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button size="small" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
                                    Previous
                                </Button>
                                <TextField
                                    select
                                    value={String(safePage)}
                                    onChange={(event) => setPage(Number(event.target.value))}
                                    sx={{ width: 88 }}
                                    inputProps={{ 'aria-label': 'Page' }}
                                >
                                    {Array.from({ length: pageCount }).map((_, index) => (
                                        <MenuItem key={index} value={String(index)}>{index + 1}</MenuItem>
                                    ))}
                                </TextField>
                                <Button size="small" disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>
                                    Next
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </>
            )}
        </Box>
    );
}
