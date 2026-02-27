import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Typography, TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Avatar, IconButton,
    InputAdornment, Select, MenuItem, FormControl, InputLabel,
    TablePagination, Skeleton, Alert, Tooltip, Stack,
} from '@mui/material';
import {
    Search, PersonAdd, Visibility, Phone, CalendarMonth,
    Star, TrendingDown, PersonOff, PersonSearch, FilterList,
} from '@mui/icons-material';
import { patientsApi, type Patient } from '../../lib/patients-api';
import { alpha } from '@mui/material/styles';

// ─── Segment config ─────────────────────────────────────────────────────────
const SEGMENTS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ReactNode }> = {
    VIP: { label: 'VIP', color: 'warning', icon: <Star fontSize="small" /> },
    ACTIVE: { label: 'Active', color: 'success', icon: null },
    LEAD: { label: 'Lead', color: 'info', icon: null },
    INACTIVE: { label: 'Inactive', color: 'default', icon: null },
    DORMANT: { label: 'Dormant', color: 'error', icon: <TrendingDown fontSize="small" /> },
};

function SegmentBadge({ segment }: { segment: string }) {
    const cfg = SEGMENTS[segment] ?? SEGMENTS.ACTIVE;
    return (
        <Chip
            label={cfg.label}
            color={cfg.color}
            size="small"
            icon={cfg.icon as any}
            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
        />
    );
}

function PatientAvatar({ patient }: { patient: Patient }) {
    const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
    const colors = ['#6C63FF', '#FF6584', '#2DD4BF', '#FBBF24', '#F87171'];
    const color = colors[patient.patientCode.charCodeAt(2) % colors.length];
    return (
        <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>
            {initials}
        </Avatar>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function PatientsListPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [segment, setSegment] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    const handleSearchChange = (value: string) => {
        setSearch(value);
        clearTimeout((window as any)._searchTimer);
        (window as any)._searchTimer = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(0);
        }, 400);
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['patients', debouncedSearch, segment, page, rowsPerPage],
        queryFn: () =>
            patientsApi.search({
                q: debouncedSearch || undefined,
                segment: segment || undefined,
                page: page + 1,
                limit: rowsPerPage,
            }),
        placeholderData: (prev) => prev,
    });

    const formatDate = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

    const formatPhone = (p: string) => p.replace(/(\+?[0-9]{2,3})([0-9]{3})([0-9]{4})/, '$1 $2 $3');

    return (
        <Box sx={{ p: 3 }}>
            {/* ── Header ── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        Patients
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {data?.meta.total ?? 0} patients registered
                    </Typography>
                </Box>
                <Button
                    id="btn-register-patient"
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => navigate('/patients/new')}
                    sx={{ borderRadius: 2 }}
                >
                    Register Patient
                </Button>
            </Stack>

            {/* ── Filters ── */}
            <Stack direction="row" gap={2} mb={3} flexWrap="wrap">
                <TextField
                    id="patient-search-input"
                    placeholder="Search name, phone, email, code…"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    size="small"
                    sx={{ minWidth: 300, flex: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="segment-filter-label">Segment</InputLabel>
                    <Select
                        id="segment-filter-select"
                        labelId="segment-filter-label"
                        label="Segment"
                        value={segment}
                        onChange={(e) => { setSegment(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="">All Segments</MenuItem>
                        {Object.entries(SEGMENTS).map(([key, cfg]) => (
                            <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Tooltip title="More filters coming soon">
                    <Button variant="outlined" startIcon={<FilterList />} size="small" disabled>
                        Filters
                    </Button>
                </Tooltip>
            </Stack>

            {/* ── Error ── */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load patients. Check your connection.
                </Alert>
            )}

            {/* ── Table ── */}
            <TableContainer
                component={Paper}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Patient</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Branch</TableCell>
                            <TableCell>Segment</TableCell>
                            <TableCell>Sessions</TableCell>
                            <TableCell>Last Visit</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton variant="text" width={j === 0 ? 160 : 80} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : data?.data.map((patient) => (
                                <TableRow
                                    key={patient.id}
                                    id={`patient-row-${patient.id}`}
                                    hover
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        '&:hover': {
                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                                        },
                                    }}
                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                >
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" gap={1.5}>
                                            <PatientAvatar patient={patient} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {patient.firstName} {patient.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {patient.email ?? '—'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                            {patient.patientCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" gap={0.5}>
                                            <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                                            <Typography variant="body2">{formatPhone(patient.phone)}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{patient.branch?.name ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <SegmentBadge segment={patient.segment} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {patient._count?.sessions ?? 0}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" gap={0.5}>
                                            <CalendarMonth sx={{ fontSize: 14, color: 'text.secondary' }} />
                                            <Typography variant="body2">{formatDate(patient.lastVisitDate)}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View profile">
                                            <IconButton
                                                id={`btn-view-patient-${patient.id}`}
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
                                            >
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}

                        {!isLoading && data?.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                    <PersonSearch sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                    <Typography color="text.secondary">
                                        {debouncedSearch ? `No patients found for "${debouncedSearch}"` : 'No patients yet'}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<PersonAdd />}
                                        sx={{ mt: 2 }}
                                        onClick={() => navigate('/patients/new')}
                                    >
                                        Register First Patient
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    count={data?.meta.total ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </TableContainer>
        </Box>
    );
}
