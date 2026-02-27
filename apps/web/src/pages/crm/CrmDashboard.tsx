import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Card, CardContent,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Divider,
    TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Skeleton, LinearProgress, Avatar,
    CircularProgress, IconButton, Tooltip, Badge, Tab, Tabs,
} from '@mui/material';
import {
    Campaign, People, PersonAdd, Notifications, CheckCircle, Schedule,
    Phone, Email, Chat, TrendingUp, Star, PersonOff, Add, Send,
    EventAvailable, MarkEmailRead, Close,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { crmApi, type CrmInteraction } from '../../lib/crm-api';

// ─── Segment Ring Chart (CSS only) ───────────────────────────────────────────
function SegmentDonut({ by }: { by: { VIP: number; ACTIVE: number; LEAD: number; DORMANT: number } }) {
    const total = Object.values(by).reduce((a, b) => a + b, 0) || 1;
    const segments = [
        { label: 'VIP', count: by.VIP, color: '#FBBF24' },
        { label: 'Active', count: by.ACTIVE, color: '#2DD4BF' },
        { label: 'Lead', count: by.LEAD, color: '#6C63FF' },
        { label: 'Dormant', count: by.DORMANT, color: '#F87171' },
    ];
    return (
        <Stack gap={1}>
            {segments.map(({ label, count, color }) => (
                <Stack key={label} direction="row" alignItems="center" gap={1.5}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Typography variant="body2" flex={1}>{label}</Typography>
                    <LinearProgress
                        variant="determinate"
                        value={(count / total) * 100}
                        sx={{
                            flex: 2, height: 6, borderRadius: 3,
                            bgcolor: (t) => alpha(color, 0.15),
                            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                        }}
                    />
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 36, textAlign: 'right' }}>
                        {count}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}

// ─── Interaction type icons ───────────────────────────────────────────────────
const INTERACTION_ICONS: Record<string, React.ReactNode> = {
    CALL: <Phone fontSize="small" />,
    EMAIL: <Email fontSize="small" />,
    LINE: <Chat fontSize="small" />,
    CONSULTATION: <EventAvailable fontSize="small" />,
    FOLLOW_UP: <Schedule fontSize="small" />,
};

// ─── Log Interaction Dialog ───────────────────────────────────────────────────
function LogInteractionDialog({
    open, patientId, onClose, onSaved,
}: {
    open: boolean; patientId: string; onClose: () => void; onSaved: () => void;
}) {
    const [form, setForm] = useState({
        type: 'CALL', channel: 'PHONE', summary: '',
        details: '', outcome: '', followUpDate: '',
    });

    const mutation = useMutation({
        mutationFn: () => crmApi.logInteraction(patientId, {
            type: form.type, channel: form.channel,
            summary: form.summary, details: form.details || undefined,
            outcome: form.outcome || undefined,
            followUpDate: form.followUpDate || undefined,
        }),
        onSuccess: () => { onSaved(); onClose(); setForm({ type: 'CALL', channel: 'PHONE', summary: '', details: '', outcome: '', followUpDate: '' }); },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogContent>
                <Stack gap={2} mt={1}>
                    <Stack direction="row" gap={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                                {['CALL', 'CONSULTATION', 'FOLLOW_UP', 'COMPLAINT', 'FEEDBACK', 'MARKETING', 'OTHER'].map((t) => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Channel</InputLabel>
                            <Select label="Channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                                {['PHONE', 'LINE', 'EMAIL', 'IN_PERSON', 'SMS'].map((c) => (
                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                    <TextField
                        label="Summary *"
                        value={form.summary}
                        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                        size="small" fullWidth
                    />
                    <TextField
                        label="Details"
                        value={form.details}
                        onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                        size="small" fullWidth multiline rows={2}
                    />
                    <TextField
                        label="Outcome"
                        value={form.outcome}
                        onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                        size="small" fullWidth
                    />
                    <TextField
                        label="Follow-up Date"
                        type="datetime-local"
                        value={form.followUpDate}
                        onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
                        size="small" fullWidth InputLabelProps={{ shrink: true }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!form.summary || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Create Campaign Dialog ───────────────────────────────────────────────────
function CreateCampaignDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        name: '', channel: 'LINE', messageTemplate: '',
        targetSegments: [] as string[], scheduledAt: '', description: '',
    });

    const mutation = useMutation({
        mutationFn: () => crmApi.createCampaign({
            name: form.name, channel: form.channel, messageTemplate: form.messageTemplate,
            targetSegments: form.targetSegments.length ? form.targetSegments : undefined,
            scheduledAt: form.scheduledAt || undefined,
            description: form.description || undefined,
        }),
        onSuccess: () => { onSaved(); onClose(); },
    });

    const toggleSegment = (seg: string) =>
        setForm((f) => ({
            ...f,
            targetSegments: f.targetSegments.includes(seg)
                ? f.targetSegments.filter((s) => s !== seg)
                : [...f.targetSegments, seg],
        }));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogContent>
                <Stack gap={2} mt={1}>
                    <TextField
                        label="Campaign Name *"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        size="small" fullWidth autoFocus
                    />
                    <FormControl size="small" fullWidth>
                        <InputLabel>Channel</InputLabel>
                        <Select label="Channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                            {['LINE', 'SMS', 'EMAIL', 'PUSH'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Message (use {{name}} for patient name)"
                        value={form.messageTemplate}
                        onChange={(e) => setForm((f) => ({ ...f, messageTemplate: e.target.value }))}
                        size="small" fullWidth multiline rows={3}
                        placeholder="Hi {{name}}, we have a special offer just for you! 💝"
                    />
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                            Target Segments (empty = all active patients)
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            {['VIP', 'ACTIVE', 'LEAD', 'DORMANT'].map((seg) => (
                                <Chip
                                    key={seg}
                                    label={seg}
                                    onClick={() => toggleSegment(seg)}
                                    color={form.targetSegments.includes(seg) ? 'primary' : 'default'}
                                    variant={form.targetSegments.includes(seg) ? 'filled' : 'outlined'}
                                    clickable
                                />
                            ))}
                        </Stack>
                    </Box>
                    <TextField
                        label="Schedule Date/Time (optional)"
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        size="small" fullWidth InputLabelProps={{ shrink: true }}
                        helperText="Leave empty to save as draft"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!form.name || !form.messageTemplate || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Campaign />}
                >
                    Create Campaign
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main CRM Dashboard ───────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'interactions' | 'campaigns' | 'followups';

export function CrmDashboardPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabKey>('dashboard');
    const [showLogInteraction, setShowLogInteraction] = useState(false);
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);
    const [interactionPatientId, setInteractionPatientId] = useState('');

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['crm-dashboard'],
        queryFn: () => crmApi.getDashboard(),
    });

    const { data: interactions, isLoading: interactionsLoading } = useQuery({
        queryKey: ['crm-interactions'],
        queryFn: () => crmApi.listInteractions({ limit: 30 }),
        enabled: tab === 'interactions',
    });

    const { data: followUps, isLoading: followUpsLoading } = useQuery({
        queryKey: ['crm-followups'],
        queryFn: () => crmApi.getFollowUps(),
        enabled: tab === 'followups',
    });

    const { data: campaigns, isLoading: campaignsLoading } = useQuery({
        queryKey: ['crm-campaigns'],
        queryFn: () => crmApi.listCampaigns(),
        enabled: tab === 'campaigns',
    });

    const dispatchMutation = useMutation({
        mutationFn: (id: string) => crmApi.dispatchCampaign(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-campaigns'] }),
    });

    const markFollowMutation = useMutation({
        mutationFn: (id: string) => crmApi.markFollowedUp(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['crm-followups'] });
            qc.invalidateQueries({ queryKey: ['crm-dashboard'] });
        },
    });

    const fmt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

    const CAMPAIGN_STATUS_COLOR: Record<string, any> = {
        DRAFT: 'default', SCHEDULED: 'info', SENDING: 'warning', SENT: 'success', CANCELLED: 'error',
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* ── Header ── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>CRM & Marketing</Typography>
                    <Typography variant="body2" color="text.secondary">Interactions, campaigns & patient engagement</Typography>
                </Box>
                <Stack direction="row" gap={1}>
                    <Button
                        id="btn-create-campaign"
                        variant="outlined"
                        startIcon={<Campaign />}
                        onClick={() => setShowCreateCampaign(true)}
                    >
                        New Campaign
                    </Button>
                </Stack>
            </Stack>

            {/* ── Tabs ── */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab id="tab-crm-dashboard" label="Dashboard" value="dashboard" />
                <Tab id="tab-crm-interactions" label="Interactions" value="interactions" />
                <Tab
                    id="tab-crm-followups"
                    label={
                        <Badge badgeContent={stats?.followUps.pending} color="error">
                            <Box sx={{ pr: 0.5 }}>Follow-ups</Box>
                        </Badge>
                    }
                    value="followups"
                />
                <Tab id="tab-crm-campaigns" label="Campaigns" value="campaigns" />
            </Tabs>

            {/* ──────────────── DASHBOARD ──────────────── */}
            {tab === 'dashboard' && (
                <Grid container spacing={3}>
                    {/* KPI cards */}
                    {statsLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <Grid key={i} item xs={6} md={3}>
                                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
                            </Grid>
                        ))
                        : [
                            {
                                icon: <People sx={{ fontSize: 36 }} />, label: 'Total Patients',
                                value: stats?.patients.total ?? 0, sub: `+${stats?.patients.newThisMonth ?? 0} this month`,
                                color: '#6C63FF', id: 'kpi-total-patients',
                            },
                            {
                                icon: <Star sx={{ fontSize: 36 }} />, label: 'VIP Patients',
                                value: stats?.patients.bySegment.VIP ?? 0, sub: 'Top tier',
                                color: '#FBBF24', id: 'kpi-vip-patients',
                            },
                            {
                                icon: <Schedule sx={{ fontSize: 36 }} />, label: 'Pending Follow-ups',
                                value: stats?.followUps.pending ?? 0, sub: 'Next 7 days',
                                color: '#F87171', id: 'kpi-followups',
                            },
                            {
                                icon: <MarkEmailRead sx={{ fontSize: 36 }} />, label: 'Campaigns Sent',
                                value: stats?.campaigns.sent ?? 0, sub: 'All time',
                                color: '#2DD4BF', id: 'kpi-campaigns',
                            },
                        ].map(({ icon, label, value, sub, color, id }) => (
                            <Grid key={id} item xs={6} md={3}>
                                <Card
                                    id={id}
                                    sx={{
                                        borderRadius: 3, height: '100%',
                                        background: (t) => `linear-gradient(135deg, ${alpha(color, 0.12)}, ${t.palette.background.paper})`,
                                        border: '1px solid', borderColor: 'divider',
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ color, mb: 1 }}>{icon}</Box>
                                        <Typography variant="h4" fontWeight={800}>{value}</Typography>
                                        <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sub}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}

                    {/* Segment breakdown */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Patient Segments</Typography>
                            {statsLoading ? <Skeleton height={120} /> : stats && (
                                <SegmentDonut by={stats.patients.bySegment} />
                            )}
                        </Paper>
                    </Grid>

                    {/* Quick actions */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Quick Actions</Typography>
                            <Stack gap={1.5}>
                                {[
                                    { icon: <PersonAdd />, label: 'Register New Patient', onClick: () => navigate('/patients/new'), id: 'qa-register' },
                                    { icon: <Campaign />, label: 'Create Campaign', onClick: () => setShowCreateCampaign(true), id: 'qa-campaign' },
                                    { icon: <Notifications />, label: 'View Follow-ups', onClick: () => setTab('followups'), id: 'qa-followups' },
                                    { icon: <People />, label: 'Browse Patients', onClick: () => navigate('/patients'), id: 'qa-patients' },
                                ].map(({ icon, label, onClick, id }) => (
                                    <Button
                                        key={id}
                                        id={id}
                                        variant="outlined"
                                        startIcon={icon}
                                        onClick={onClick}
                                        fullWidth
                                        sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──────────────── INTERACTIONS ──────────────── */}
            {tab === 'interactions' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Recent Interactions</Typography>
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Patient</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Channel</TableCell>
                                    <TableCell>Summary</TableCell>
                                    <TableCell>Follow-up</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {interactionsLoading
                                    ? Array.from({ length: 6 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 6 }).map((_, j) => (
                                                <TableCell key={j}><Skeleton /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                    : (interactions?.data ?? []).map((row: CrmInteraction) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                                    onClick={() => navigate(`/patients/${row.patientId}`)}
                                                >
                                                    {row.patient?.firstName} {row.patient?.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">{row.patient?.patientCode}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.type}
                                                    size="small"
                                                    icon={INTERACTION_ICONS[row.type] as any}
                                                    color={row.type === 'COMPLAINT' ? 'error' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{row.channel}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {row.summary}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {row.followUpDate ? (
                                                    <Chip
                                                        label={fmt(row.followUpDate)}
                                                        size="small"
                                                        color={row.isFollowedUp ? 'success' : 'warning'}
                                                        icon={row.isFollowedUp ? <CheckCircle fontSize="small" /> : <Schedule fontSize="small" />}
                                                    />
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">{fmt(row.createdAt)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──────────────── FOLLOW-UPS ──────────────── */}
            {tab === 'followups' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>
                        Pending Follow-ups (Next 7 Days)
                    </Typography>
                    {followUpsLoading ? <CircularProgress /> : (
                        <Stack gap={2}>
                            {(!followUps || (followUps as CrmInteraction[]).length === 0) ? (
                                <Alert severity="success">No pending follow-ups this week! 🎉</Alert>
                            ) : (
                                (followUps as CrmInteraction[]).map((f) => (
                                    <Card
                                        key={f.id}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 2,
                                            borderLeft: '4px solid',
                                            borderLeftColor: new Date(f.followUpDate!) < new Date() ? 'error.main' : 'warning.main',
                                        }}
                                    >
                                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="start">
                                                <Box>
                                                    <Stack direction="row" gap={1} alignItems="center">
                                                        <Typography fontWeight={700}>
                                                            {(f as any).patient?.firstName} {(f as any).patient?.lastName}
                                                        </Typography>
                                                        <Chip label={(f as any).patient?.segment} size="small" color="default" />
                                                    </Stack>
                                                    <Typography variant="body2" mt={0.5}>{f.summary}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Due: {fmt(f.followUpDate)} · via {f.channel}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" gap={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => navigate(`/patients/${f.patientId}`)}
                                                    >
                                                        View Patient
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        startIcon={<CheckCircle />}
                                                        onClick={() => markFollowMutation.mutate(f.id)}
                                                        disabled={markFollowMutation.isPending}
                                                    >
                                                        Done
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ──────────────── CAMPAIGNS ──────────────── */}
            {tab === 'campaigns' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Campaigns</Typography>
                        <Button
                            id="btn-create-campaign-tab"
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => setShowCreateCampaign(true)}
                        >
                            New Campaign
                        </Button>
                    </Stack>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Channel</TableCell>
                                    <TableCell>Segments</TableCell>
                                    <TableCell align="right">Audience</TableCell>
                                    <TableCell align="right">Sent</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Scheduled</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {campaignsLoading
                                    ? Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 8 }).map((_, j) => (
                                                <TableCell key={j}><Skeleton /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                    : (campaigns?.data ?? []).map((c: Campaign) => (
                                        <TableRow key={c.id} id={`campaign-row-${c.id}`} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={c.channel} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" gap={0.5} flexWrap="wrap">
                                                    {c.targetSegments.length === 0 ? (
                                                        <Chip label="All" size="small" color="default" />
                                                    ) : c.targetSegments.map((s) => (
                                                        <Chip key={s} label={s} size="small" />
                                                    ))}
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{c.audienceCount.toLocaleString()}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color={c.sentCount > 0 ? 'success.main' : 'text.secondary'}>
                                                    {c.sentCount.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={c.status}
                                                    size="small"
                                                    color={CAMPAIGN_STATUS_COLOR[c.status] ?? 'default'}
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {c.scheduledAt ? fmt(c.scheduledAt) : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                                                    <Tooltip title="Dispatch campaign now">
                                                        <IconButton
                                                            id={`btn-dispatch-${c.id}`}
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => dispatchMutation.mutate(c.id)}
                                                            disabled={dispatchMutation.isPending}
                                                        >
                                                            <Send fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {!campaignsLoading && campaigns?.data?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No campaigns yet</Typography>
                                            <Button size="small" sx={{ mt: 1 }} startIcon={<Add />} onClick={() => setShowCreateCampaign(true)}>
                                                Create First Campaign
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ── Dialogs ── */}
            <LogInteractionDialog
                open={showLogInteraction}
                patientId={interactionPatientId}
                onClose={() => setShowLogInteraction(false)}
                onSaved={() => qc.invalidateQueries({ queryKey: ['crm-interactions'] })}
            />

            <CreateCampaignDialog
                open={showCreateCampaign}
                onClose={() => setShowCreateCampaign(false)}
                onSaved={() => qc.invalidateQueries({ queryKey: ['crm-campaigns'] })}
            />
        </Box>
    );
}
