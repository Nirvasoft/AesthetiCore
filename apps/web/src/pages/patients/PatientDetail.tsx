import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Avatar, Button, Divider,
    Tab, Tabs, Skeleton, Alert, Card, CardContent, LinearProgress, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Select, MenuItem,
    FormControl, InputLabel,
} from '@mui/material';
import {
    ArrowBack, Phone, Email, Cake, MedicalServices, Loyalty,
    PhotoCamera, EventNote, CreditCard, Warning, Star, Edit,
    CloudUpload, Delete, CompareArrows, Close, FilterList,
} from '@mui/icons-material';
import { patientsApi } from '../../lib/patients-api';
import { sessionsApi } from '../../lib/sessions-api';
import { photosApi, type PatientPhoto } from '../../lib/photos-api';
import { alpha } from '@mui/material/styles';

const SEGMENT_COLORS: Record<string, string> = {
    VIP: '#FBBF24', ACTIVE: '#2DD4BF', LEAD: '#6C63FF',
    INACTIVE: '#9D9BBF', DORMANT: '#F87171',
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Stack direction="row" alignItems="center" gap={1.5} py={0.75}>
            <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>{label}</Typography>
            <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
        </Stack>
    );
}

type TabKey = 'overview' | 'sessions' | 'packages' | 'photos' | 'allergies' | 'consents';

const BODY_ZONES = [
    'face', 'forehead', 'eyes', 'nose', 'lips', 'chin', 'cheeks',
    'neck', 'chest', 'abdomen', 'arms', 'hands', 'legs', 'back', 'other',
];

const PHOTO_TYPE_COLORS: Record<string, string> = {
    before: '#38BDF8', after: '#2DD4BF', progress: '#FBBF24',
};

export function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabKey>('overview');

    const { data: patient, isLoading, error } = useQuery({
        queryKey: ['patient', id],
        queryFn: () => patientsApi.findOne(id!),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /></Grid>
                    <Grid item xs={12} md={8}><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} /></Grid>
                </Grid>
            </Box>
        );
    }

    if (error || !patient) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Patient not found.</Alert>
                <Button sx={{ mt: 2 }} startIcon={<ArrowBack />} onClick={() => navigate('/patients')}>
                    Back to Patients
                </Button>
            </Box>
        );
    }

    const segmentColor = SEGMENT_COLORS[patient.segment] ?? '#9D9BBF';
    const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
    const age = patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 3.156e10)
        : null;

    const fmt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <Box sx={{ p: 3 }}>
            {/* Back button */}
            <Button
                id="btn-back-to-patients"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/patients')}
                sx={{ mb: 2 }}
                color="inherit"
            >
                Patients
            </Button>

            {/* ── Profile header card ── */}
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    background: (t) => `linear-gradient(135deg, ${alpha(segmentColor, 0.12)}, ${t.palette.background.paper})`,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={3} alignItems={{ sm: 'center' }}>
                    <Avatar
                        sx={{
                            width: 80, height: 80, fontSize: '1.8rem', fontWeight: 700,
                            bgcolor: segmentColor, color: '#000',
                        }}
                    >
                        {initials}
                    </Avatar>

                    <Box flex={1}>
                        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={700}>
                                {patient.firstName} {patient.lastName}
                            </Typography>
                            <Chip
                                label={patient.segment}
                                size="small"
                                sx={{ bgcolor: segmentColor, color: '#000', fontWeight: 700 }}
                                icon={patient.segment === 'VIP' ? <Star fontSize="small" /> : undefined}
                            />
                            {patient.allergies.length > 0 && (
                                <Tooltip title={`Allergies: ${patient.allergies.map((a) => a.allergen).join(', ')}`}>
                                    <Chip
                                        label="Allergy Alert"
                                        color="error"
                                        size="small"
                                        icon={<Warning fontSize="small" />}
                                        sx={{ fontWeight: 700 }}
                                    />
                                </Tooltip>
                            )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {patient.patientCode} · {patient.branch.name}
                            {age !== null && ` · ${age} years old`}
                        </Typography>
                    </Box>

                    {/* KPI chips */}
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        {[
                            { icon: <EventNote />, value: patient._count.sessions, label: 'Sessions' },
                            { icon: <CreditCard />, value: patient._count.packages, label: 'Packages' },
                            { icon: <PhotoCamera />, value: patient._count.photos, label: 'Photos' },
                            { icon: <Loyalty />, value: `${patient.loyaltyPoints} pts`, label: 'Loyalty' },
                        ].map(({ icon, value, label }) => (
                            <Card key={label} sx={{ minWidth: 80, textAlign: 'center', bgcolor: 'background.default' }}>
                                <CardContent sx={{ p: '12px !important' }}>
                                    <Box sx={{ color: 'primary.main', mb: 0.5 }}>{icon}</Box>
                                    <Typography variant="h6" fontWeight={700} lineHeight={1}>{value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Stack>
            </Paper>

            {/* ── Tabs ── */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Tab id="tab-overview" label="Overview" value="overview" />
                <Tab id="tab-sessions" label={`Sessions (${patient._count.sessions})`} value="sessions" />
                <Tab id="tab-packages" label={`Packages (${patient._count.packages})`} value="packages" />
                <Tab id="tab-photos" label={`Photos (${patient._count.photos})`} value="photos" />
                <Tab id="tab-allergies" label="Medical" value="allergies" />
                <Tab id="tab-consents" label="PDPA" value="consents" />
            </Tabs>

            {/* ── Overview tab ── */}
            {tab === 'overview' && (
                <Grid container spacing={3}>
                    {/* Contact info */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                                    CONTACT INFO
                                </Typography>
                                <Button id="btn-edit-patient" size="small" startIcon={<Edit />}>Edit</Button>
                            </Stack>
                            <Divider sx={{ mb: 1.5 }} />
                            <InfoRow icon={<Phone fontSize="small" />} label="Phone" value={patient.phone} />
                            <InfoRow icon={<Email fontSize="small" />} label="Email" value={patient.email ?? ''} />
                            <InfoRow icon={<Cake fontSize="small" />} label="Date of Birth" value={fmt(patient.dateOfBirth)} />
                            <InfoRow icon={<MedicalServices fontSize="small" />} label="Branch" value={patient.branch.name} />
                            {patient.notes && (
                                <>
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="caption" color="text.secondary">NOTES</Typography>
                                    <Typography variant="body2" mt={0.5} sx={{ whiteSpace: 'pre-wrap' }}>{patient.notes}</Typography>
                                </>
                            )}
                        </Paper>
                    </Grid>

                    {/* Recent sessions */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                                RECENT SESSIONS
                            </Typography>
                            <Divider sx={{ mb: 1.5 }} />
                            {patient.sessions.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                    No sessions yet
                                </Typography>
                            ) : (
                                <Stack gap={1}>
                                    {patient.sessions.map((s) => (
                                        <Stack
                                            key={s.id}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{
                                                p: 1.5, borderRadius: 2, cursor: 'pointer',
                                                bgcolor: 'background.default',
                                                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                                            }}
                                            onClick={() => navigate(`/sessions/${s.id}`)}
                                        >
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {s.chiefComplaint ?? 'Treatment Session'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {fmt(s.visitDate)} · {s.branch.name}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={s.status}
                                                size="small"
                                                color={s.status === 'COMPLETED' ? 'success' : s.status === 'LOCKED' ? 'warning' : 'default'}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ── Sessions tab ── */}
            {tab === 'sessions' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                            TREATMENT SESSIONS
                        </Typography>
                        <Button
                            id="btn-new-session"
                            variant="contained"
                            size="small"
                            startIcon={<MedicalServices />}
                            onClick={async () => {
                                try {
                                    const session = await sessionsApi.create({ patientId: id! });
                                    navigate(`/sessions/${session.id}`);
                                } catch {
                                    /* handled by api-client interceptor */
                                }
                            }}
                        >
                            New Session
                        </Button>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    {patient.sessions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                            No treatment sessions recorded yet. Click "New Session" to start one.
                        </Typography>
                    ) : (
                        <Stack gap={1}>
                            {patient.sessions.map((s) => (
                                <Stack
                                    key={s.id}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{
                                        p: 1.5, borderRadius: 2, cursor: 'pointer',
                                        bgcolor: 'background.default',
                                        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                                        transition: 'background-color 0.15s',
                                    }}
                                    onClick={() => navigate(`/sessions/${s.id}`)}
                                >
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {s.chiefComplaint ?? 'Treatment Session'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fmt(s.visitDate)} · {s.branch.name}

                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={s.status}
                                        size="small"
                                        color={
                                            s.status === 'COMPLETED' ? 'success'
                                                : s.status === 'LOCKED' ? 'warning'
                                                    : s.status === 'IN_PROGRESS' ? 'info'
                                                        : 'default'
                                        }
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ── Photos tab ── */}
            {tab === 'photos' && <PhotosTab patientId={id!} />}

            {/* ── Packages tab ── */}
            {tab === 'packages' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    {patient.packages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" py={3} textAlign="center">
                            No packages purchased
                        </Typography>
                    ) : (
                        <Stack gap={2}>
                            {patient.packages.map((pkg) => {
                                const pct = Math.round((pkg.usedSessions / pkg.totalSessions) * 100);
                                return (
                                    <Card key={pkg.id} variant="outlined">
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                                                <Box>
                                                    <Typography fontWeight={600}>{pkg.package.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {pkg.usedSessions} / {pkg.totalSessions} sessions used
                                                        {pkg.expiresAt && ` · Expires ${fmt(pkg.expiresAt)}`}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={pkg.usedSessions >= pkg.totalSessions ? 'Completed' : 'Active'}
                                                    color={pkg.usedSessions >= pkg.totalSessions ? 'default' : 'success'}
                                                    size="small"
                                                />
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={pct}
                                                sx={{ mt: 1.5, borderRadius: 1, height: 6 }}
                                                color={pct >= 100 ? 'inherit' : 'primary'}
                                            />
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ── Medical tab ── */}
            {tab === 'allergies' && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                                ALLERGY ALERTS
                            </Typography>
                            {patient.allergies.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">None recorded</Typography>
                            ) : (
                                <Stack gap={1}>
                                    {patient.allergies.map((a) => (
                                        <Chip
                                            key={a.id}
                                            label={`${a.allergen}${a.severity ? ` (${a.severity})` : ''}`}
                                            color="error"
                                            icon={<Warning />}
                                            sx={{ justifyContent: 'flex-start', px: 1 }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                                MEDICAL HISTORY
                            </Typography>
                            {patient.medicalHistory.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No conditions recorded</Typography>
                            ) : (
                                <Stack gap={1}>
                                    {patient.medicalHistory.map((h) => (
                                        <Stack key={h.id} direction="row" gap={1}>
                                            <Typography variant="body2" fontWeight={600}>{h.condition}</Typography>
                                            {h.details && (
                                                <Typography variant="body2" color="text.secondary">— {h.details}</Typography>
                                            )}
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ── PDPA tab ── */}
            {tab === 'consents' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                        PDPA CONSENT RECORDS
                    </Typography>
                    {patient.pdpaConsents.length === 0 ? (
                        <Alert severity="warning">No consent records found</Alert>
                    ) : (
                        <Stack gap={1}>
                            {patient.pdpaConsents.map((c, i) => (
                                <Stack
                                    key={i}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}
                                >
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{c.consentType}</Typography>
                                        <Typography variant="caption" color="text.secondary">{fmt(c.signedAt)}</Typography>
                                    </Box>
                                    <Chip
                                        label={c.isGranted ? 'Granted' : 'Revoked'}
                                        color={c.isGranted ? 'success' : 'error'}
                                        size="small"
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Paper>
            )}
        </Box>
    );
}

// ─── Photos Tab Component ─────────────────────────────────────────────────────

function PhotosTab({ patientId }: { patientId: string }) {
    const qc = useQueryClient();
    const fileInput = useRef<HTMLInputElement>(null);
    const [zoneFilter, setZoneFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [uploadZone, setUploadZone] = useState('');
    const [uploadType, setUploadType] = useState('before');
    const [selectedPhoto, setSelectedPhoto] = useState<PatientPhoto | null>(null);
    const [comparePhoto, setComparePhoto] = useState<PatientPhoto | null>(null);
    const [pairingMode, setPairingMode] = useState(false);
    const [pairingSource, setPairingSource] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);

    const { data: photos = [], isLoading } = useQuery({
        queryKey: ['photos', patientId, zoneFilter, typeFilter],
        queryFn: () => photosApi.findByPatient(patientId, {
            ...(zoneFilter && { bodyZone: zoneFilter }),
            ...(typeFilter && { photoType: typeFilter }),
        }),
    });

    const uploadMut = useMutation({
        mutationFn: (file: File) => photosApi.upload({
            file, patientId, bodyZone: uploadZone || undefined, photoType: uploadType || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['photos', patientId] });
            qc.invalidateQueries({ queryKey: ['patient', patientId] });
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => photosApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['photos', patientId] });
            qc.invalidateQueries({ queryKey: ['patient', patientId] });
            setSelectedPhoto(null);
        },
    });

    const pairMut = useMutation({
        mutationFn: ({ a, b }: { a: string; b: string }) => photosApi.pair(a, b),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['photos', patientId] });
            setPairingMode(false);
            setPairingSource(null);
        },
    });

    const handleUpload = useCallback(async (files: FileList | null) => {
        if (!files) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                await uploadMut.mutateAsync(file);
            }
        } finally {
            setUploading(false);
        }
    }, [uploadMut]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleUpload(e.dataTransfer.files);
    }, [handleUpload]);

    const fmt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    // find paired photo for comparison
    const openComparison = (photo: PatientPhoto) => {
        if (photo.pairedWithId) {
            const paired = photos.find((p) => p.id === photo.pairedWithId);
            if (paired) {
                const before = photo.photoType === 'before' ? photo : paired;
                const after = photo.photoType === 'after' ? photo : paired;
                setSelectedPhoto(before);
                setComparePhoto(after);
                return;
            }
        }
        setSelectedPhoto(photo);
        setComparePhoto(null);
    };

    return (
        <Stack gap={2}>
            {/* ── Upload area ── */}
            <Paper
                sx={{
                    p: 3, borderRadius: 3, border: '2px dashed',
                    borderColor: dragging ? 'primary.main' : 'divider',
                    bgcolor: dragging ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInput.current?.click()}
            >
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handleUpload(e.target.files)}
                />
                <Stack alignItems="center" gap={1}>
                    <CloudUpload sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600}>
                        {uploading ? 'Uploading…' : 'Drop photos here or click to upload'}
                    </Typography>
                    <Stack direction="row" gap={2} mt={1} onClick={(e) => e.stopPropagation()}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Body Zone</InputLabel>
                            <Select
                                value={uploadZone}
                                label="Body Zone"
                                onChange={(e) => setUploadZone(e.target.value)}
                            >
                                <MenuItem value="">None</MenuItem>
                                {BODY_ZONES.map((z) => (
                                    <MenuItem key={z} value={z}>{z.charAt(0).toUpperCase() + z.slice(1)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={uploadType}
                                label="Type"
                                onChange={(e) => setUploadType(e.target.value)}
                            >
                                <MenuItem value="before">Before</MenuItem>
                                <MenuItem value="after">After</MenuItem>
                                <MenuItem value="progress">Progress</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
            </Paper>

            {/* ── Filters ── */}
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                <FilterList fontSize="small" sx={{ color: 'text.secondary' }} />
                <Chip
                    label="All"
                    size="small"
                    variant={!zoneFilter ? 'filled' : 'outlined'}
                    color={!zoneFilter ? 'primary' : 'default'}
                    onClick={() => setZoneFilter('')}
                />
                {BODY_ZONES.slice(0, 7).map((z) => (
                    <Chip
                        key={z}
                        label={z.charAt(0).toUpperCase() + z.slice(1)}
                        size="small"
                        variant={zoneFilter === z ? 'filled' : 'outlined'}
                        color={zoneFilter === z ? 'primary' : 'default'}
                        onClick={() => setZoneFilter(zoneFilter === z ? '' : z)}
                    />
                ))}
                <Divider orientation="vertical" flexItem />
                {['before', 'after', 'progress'].map((t) => (
                    <Chip
                        key={t}
                        label={t.charAt(0).toUpperCase() + t.slice(1)}
                        size="small"
                        variant={typeFilter === t ? 'filled' : 'outlined'}
                        sx={{
                            bgcolor: typeFilter === t ? PHOTO_TYPE_COLORS[t] : undefined,
                            color: typeFilter === t ? '#000' : undefined,
                        }}
                        onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                    />
                ))}
                {pairingMode && (
                    <Chip
                        label="Pairing mode — click another photo"
                        color="warning"
                        size="small"
                        onDelete={() => { setPairingMode(false); setPairingSource(null); }}
                    />
                )}
            </Stack>

            {/* ── Gallery grid ── */}
            {isLoading ? (
                <Stack direction="row" gap={2}>
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" width={200} height={200} sx={{ borderRadius: 2 }} />)}
                </Stack>
            ) : photos.length === 0 ? (
                <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                    <PhotoCamera sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                        No photos yet. Upload some to get started.
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
                    {photos.map((photo) => (
                        <Paper
                            key={photo.id}
                            sx={{
                                borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                                border: pairingSource === photo.id ? '3px solid' : '1px solid',
                                borderColor: pairingSource === photo.id ? 'warning.main' : 'divider',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                                position: 'relative',
                            }}
                            onClick={() => {
                                if (pairingMode && pairingSource && pairingSource !== photo.id) {
                                    pairMut.mutate({ a: pairingSource, b: photo.id });
                                    return;
                                }
                                openComparison(photo);
                            }}
                        >
                            <Box
                                component="img"
                                src={photosApi.getFileUrl(photo.id)}
                                alt={photo.bodyZone || 'photo'}
                                sx={{
                                    width: '100%', height: 180, objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                            <Stack direction="row" gap={0.5} p={1} flexWrap="wrap" alignItems="center">
                                {photo.photoType && (
                                    <Chip
                                        label={photo.photoType}
                                        size="small"
                                        sx={{
                                            bgcolor: PHOTO_TYPE_COLORS[photo.photoType] ?? '#9D9BBF',
                                            color: '#000', fontWeight: 700, fontSize: '0.65rem',
                                        }}
                                    />
                                )}
                                {photo.bodyZone && (
                                    <Chip label={photo.bodyZone} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                )}
                                {photo.pairedWithId && (
                                    <CompareArrows fontSize="small" sx={{ color: 'primary.main', ml: 'auto' }} />
                                )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1, pb: 0.5, display: 'block' }}>
                                {fmt(photo.takenAt)}
                            </Typography>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* ── Photo detail / Before-After comparison dialog ── */}
            <Dialog
                open={!!selectedPhoto}
                onClose={() => { setSelectedPhoto(null); setComparePhoto(null); }}
                maxWidth={comparePhoto ? 'lg' : 'md'}
                fullWidth
            >
                {selectedPhoto && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {comparePhoto ? 'Before / After Comparison' : 'Photo Detail'}
                            <IconButton onClick={() => { setSelectedPhoto(null); setComparePhoto(null); }}>
                                <Close />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            {comparePhoto ? (
                                /* SIDE-BY-SIDE COMPARISON */
                                <Stack direction={{ xs: 'column', md: 'row' }} gap={3}>
                                    <Box flex={1} textAlign="center">
                                        <Chip label="BEFORE" sx={{ mb: 1, bgcolor: PHOTO_TYPE_COLORS.before, color: '#000', fontWeight: 700 }} />
                                        <Box
                                            component="img"
                                            src={photosApi.getFileUrl(selectedPhoto.id)}
                                            alt="Before"
                                            sx={{ width: '100%', borderRadius: 2, maxHeight: 500, objectFit: 'contain' }}
                                        />
                                        <Typography variant="caption" color="text.secondary">{fmt(selectedPhoto.takenAt)}</Typography>
                                    </Box>
                                    <Box flex={1} textAlign="center">
                                        <Chip label="AFTER" sx={{ mb: 1, bgcolor: PHOTO_TYPE_COLORS.after, color: '#000', fontWeight: 700 }} />
                                        <Box
                                            component="img"
                                            src={photosApi.getFileUrl(comparePhoto.id)}
                                            alt="After"
                                            sx={{ width: '100%', borderRadius: 2, maxHeight: 500, objectFit: 'contain' }}
                                        />
                                        <Typography variant="caption" color="text.secondary">{fmt(comparePhoto.takenAt)}</Typography>
                                    </Box>
                                </Stack>
                            ) : (
                                /* SINGLE PHOTO DETAIL */
                                <Stack gap={2}>
                                    <Box
                                        component="img"
                                        src={photosApi.getFileUrl(selectedPhoto.id)}
                                        alt="Photo"
                                        sx={{ width: '100%', borderRadius: 2, maxHeight: 500, objectFit: 'contain' }}
                                    />
                                    <Stack direction="row" gap={1} flexWrap="wrap">
                                        {selectedPhoto.photoType && (
                                            <Chip
                                                label={selectedPhoto.photoType.toUpperCase()}
                                                sx={{ bgcolor: PHOTO_TYPE_COLORS[selectedPhoto.photoType], color: '#000', fontWeight: 700 }}
                                            />
                                        )}
                                        {selectedPhoto.bodyZone && <Chip label={selectedPhoto.bodyZone} variant="outlined" />}
                                        <Chip label={fmt(selectedPhoto.takenAt)} variant="outlined" size="small" />
                                    </Stack>
                                </Stack>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            {!comparePhoto && (
                                <Button
                                    startIcon={<CompareArrows />}
                                    onClick={() => {
                                        setPairingMode(true);
                                        setPairingSource(selectedPhoto.id);
                                        setSelectedPhoto(null);
                                    }}
                                    variant="outlined"
                                >
                                    Pair as Before/After
                                </Button>
                            )}
                            <Button
                                startIcon={<Delete />}
                                color="error"
                                onClick={() => deleteMut.mutate(selectedPhoto.id)}
                                disabled={deleteMut.isPending}
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Stack>
    );
}

