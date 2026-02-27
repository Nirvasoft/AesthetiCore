import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Card, CardContent,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Skeleton, IconButton, Tooltip, Tabs,
    Tab, Switch, Avatar, CircularProgress, useTheme,
} from '@mui/material';
import {
    People, Add, Badge, Schedule as ScheduleIcon, AccessTime, EventBusy,
    CheckCircle, Cancel, WorkspacePremium, Warning, Refresh,
    Login, Logout, Delete, ChevronLeft, ChevronRight, Today,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
    staffApi,
    type StaffMember, type Schedule, type AttendanceLog, type LeaveRequest, type Certification,
} from '../../lib/staff-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtTime = (d?: string) =>
    d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
const fmtDT = (d?: string) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';
const fullName = (s?: { firstName: string; lastName: string }) => s ? `${s.firstName} ${s.lastName}` : '—';

const ROLE_COLORS: Record<string, string> = {
    HQ_ADMIN: '#C084FC', BRANCH_MANAGER: '#38BDF8', DOCTOR: '#34D399',
    NURSE: '#FBBF24', RECEPTIONIST: '#FB923C', PATIENT: '#94A3B8',
};
const LEAVE_COLORS: Record<string, any> = {
    PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

type TabKey = 'directory' | 'schedules' | 'attendance' | 'leave' | 'certifications';

export function StaffPage() {
    const qc = useQueryClient();
    const theme = useTheme();
    const [tab, setTab] = useState<TabKey>('directory');
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // ── Queries ──
    const { data: dashboard, isLoading: dashLoad } = useQuery({
        queryKey: ['staff-dash'], queryFn: () => staffApi.getDashboard(),
    });

    const { data: staffData, isLoading: staffLoad } = useQuery({
        queryKey: ['staff-list', search, roleFilter],
        queryFn: () => staffApi.list({ search: search || undefined, role: roleFilter || undefined }),
        enabled: tab === 'directory',
    });

    const { data: onDuty } = useQuery({
        queryKey: ['on-duty'], queryFn: () => staffApi.getOnDuty(),
        enabled: tab === 'attendance',
    });

    const { data: attendance, isLoading: attLoad } = useQuery({
        queryKey: ['attendance'], queryFn: () => staffApi.listAttendance(),
        enabled: tab === 'attendance',
    });

    const { data: leaveReqs, isLoading: leaveLoad } = useQuery({
        queryKey: ['leave-requests'], queryFn: () => staffApi.listLeave(),
        enabled: tab === 'leave',
    });

    const { data: certs, isLoading: certLoad } = useQuery({
        queryKey: ['certs'], queryFn: () => staffApi.listCerts(),
        enabled: tab === 'certifications',
    });

    const { data: expiring } = useQuery({
        queryKey: ['certs-expiring'], queryFn: () => staffApi.getExpiring(),
        enabled: tab === 'certifications',
    });

    const toggleM = useMutation({
        mutationFn: staffApi.toggle,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-list'] }),
    });

    const reviewM = useMutation({
        mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
            staffApi.reviewLeave(id, decision),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-requests'] }); qc.invalidateQueries({ queryKey: ['staff-dash'] }); },
    });

    const clockOutM = useMutation({
        mutationFn: (id: string) => staffApi.clockOut(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['on-duty'] }); qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['staff-dash'] }); },
    });

    // ── KPI data ──
    const kpis = [
        { id: 'kpi-total', icon: <People />, label: 'Total Staff', value: dashboard?.totalStaff ?? 0, color: '#38BDF8' },
        { id: 'kpi-active', icon: <Badge />, label: 'Active', value: dashboard?.activeStaff ?? 0, color: '#34D399' },
        { id: 'kpi-duty', icon: <AccessTime />, label: 'On Duty', value: dashboard?.onDuty ?? 0, color: '#A78BFA' },
        { id: 'kpi-leave', icon: <EventBusy />, label: 'Pending Leave', value: dashboard?.pendingLeave ?? 0, color: '#FBBF24' },
        { id: 'kpi-expire', icon: <Warning />, label: 'Certs Expiring', value: dashboard?.expiringSoon ?? 0, color: '#F87171' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Staff & HR</Typography>
                    <Typography variant="body2" color="text.secondary">Directory, schedules, attendance, leave & certifications</Typography>
                </Box>
                <Button id="btn-add-staff" variant="contained" startIcon={<Add />} onClick={() => setShowAdd(true)}>
                    Add Staff
                </Button>
            </Stack>

            {/* KPI Row */}
            <Grid container spacing={2} mb={3}>
                {kpis.map(({ id, icon, label, value, color }) => (
                    <Grid key={id} item xs={6} sm={4} md={2.4}>
                        <Card id={id} sx={{
                            borderRadius: 3, height: '100%',
                            background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${theme.palette.background.paper})`,
                            border: '1px solid', borderColor: 'divider',
                        }}>
                            <CardContent sx={{ pb: '12px !important', px: 2 }}>
                                <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                                {dashLoad ? <Skeleton width={50} height={38} /> : (
                                    <Typography variant="h5" fontWeight={800}>{value}</Typography>
                                )}
                                <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab label="Directory" value="directory" icon={<People />} iconPosition="start" />
                <Tab label="Schedules" value="schedules" icon={<ScheduleIcon />} iconPosition="start" />
                <Tab label="Attendance" value="attendance" icon={<AccessTime />} iconPosition="start" />
                <Tab label={`Leave (${dashboard?.pendingLeave ?? 0})`} value="leave" icon={<EventBusy />} iconPosition="start" />
                <Tab label="Certifications" value="certifications" icon={<WorkspacePremium />} iconPosition="start" />
            </Tabs>

            {/* ──── DIRECTORY ──── */}
            {tab === 'directory' && (
                <Box>
                    <Stack direction="row" gap={2} mb={2} flexWrap="wrap">
                        <TextField placeholder="Search name / email…" size="small" sx={{ minWidth: 220 }}
                            value={search} onChange={e => setSearch(e.target.value)} />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Role</InputLabel>
                            <Select label="Role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {['HQ_ADMIN', 'BRANCH_MANAGER', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].map(r => (
                                    <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh"><IconButton onClick={() => qc.invalidateQueries({ queryKey: ['staff-list'] })}><Refresh /></IconButton></Tooltip>
                    </Stack>

                    <Grid container spacing={2}>
                        {staffLoad ? Array.from({ length: 6 }).map((_, i) => (
                            <Grid key={i} item xs={12} sm={6} md={4}>
                                <Skeleton height={140} sx={{ borderRadius: 3 }} />
                            </Grid>
                        )) : (staffData?.data ?? []).map((s: StaffMember) => {
                            const roleColor = ROLE_COLORS[s.role] ?? '#94A3B8';
                            return (
                                <Grid key={s.id} item xs={12} sm={6} md={4}>
                                    <Card sx={{
                                        borderRadius: 3, height: '100%',
                                        border: '1px solid', borderColor: s.isActive ? 'divider' : 'error.main',
                                        opacity: s.isActive ? 1 : 0.6,
                                    }}>
                                        <CardContent>
                                            <Stack direction="row" gap={2} alignItems="center" mb={1.5}>
                                                <Avatar sx={{ bgcolor: alpha(roleColor, 0.2), color: roleColor, fontWeight: 800 }}>
                                                    {s.firstName[0]}{s.lastName[0]}
                                                </Avatar>
                                                <Box flex={1}>
                                                    <Typography variant="subtitle1" fontWeight={700}>{s.firstName} {s.lastName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                                                </Box>
                                                <Tooltip title={s.isActive ? 'Deactivate' : 'Activate'}>
                                                    <Switch size="small" checked={s.isActive} onChange={() => toggleM.mutate(s.id)} />
                                                </Tooltip>
                                            </Stack>
                                            <Stack direction="row" gap={1} flexWrap="wrap">
                                                <Chip size="small" label={s.role.replace('_', ' ')}
                                                    sx={{ fontWeight: 700, bgcolor: alpha(roleColor, 0.12), color: roleColor }} />
                                                {s.branch && <Chip size="small" variant="outlined" label={s.branch.name} />}
                                                {s.staffProfile?.specialty && (
                                                    <Chip size="small" variant="outlined" label={s.staffProfile.specialty} />
                                                )}
                                                {s.staffProfile && Number(s.staffProfile.commissionRate) > 0 && (
                                                    <Chip size="small" color="warning" variant="outlined"
                                                        label={`${(Number(s.staffProfile.commissionRate) * 100).toFixed(0)}% comm`} />
                                                )}
                                            </Stack>
                                            {s.staffProfile?.licenseNumber && (
                                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                                    License: {s.staffProfile.licenseNumber}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                        {!staffLoad && (!staffData?.data || staffData.data.length === 0) && (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                    <Typography color="text.secondary">No staff found</Typography>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

            {/* ──── SCHEDULES ──── */}
            {tab === 'schedules' && <SchedulesPanel />}

            {/* ──── ATTENDANCE ──── */}
            {tab === 'attendance' && (
                <Box>
                    {/* On Duty Now */}
                    {(onDuty ?? []).length > 0 && (
                        <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, bgcolor: alpha('#34D399', 0.04) }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                                <Login sx={{ verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
                                Currently On Duty ({(onDuty ?? []).length})
                            </Typography>
                            <Stack direction="row" gap={2} flexWrap="wrap">
                                {(onDuty ?? []).map((a: AttendanceLog) => (
                                    <Card key={a.id} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'success.main', minWidth: 200 }}>
                                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="body2" fontWeight={700}>
                                                {a.staff ? fullName(a.staff.user) : a.staffId}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                In: {fmtTime(a.clockIn)}
                                            </Typography>
                                            <Button size="small" color="error" variant="outlined" sx={{ ml: 1 }}
                                                startIcon={<Logout />} onClick={() => clockOutM.mutate(a.id)}>
                                                Clock Out
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Paper>
                    )}

                    {/* Attendance Log */}
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} mb={2}>Attendance Log</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Staff</TableCell>
                                        <TableCell>Clock In</TableCell>
                                        <TableCell>Clock Out</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Note</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {attLoad ? Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                                    )) : (attendance ?? []).map((a: AttendanceLog) => {
                                        const dur = a.clockOut
                                            ? Math.round((new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 3600000 * 10) / 10
                                            : null;
                                        return (
                                            <TableRow key={a.id} hover>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{a.staff ? fullName(a.staff.user) : a.staffId}</Typography></TableCell>
                                                <TableCell>{fmtDT(a.clockIn)}</TableCell>
                                                <TableCell>{a.clockOut ? fmtDT(a.clockOut) : <Chip size="small" color="success" label="On Duty" />}</TableCell>
                                                <TableCell>{dur !== null ? `${dur}h` : '—'}</TableCell>
                                                <TableCell><Typography variant="caption" color="text.secondary">{a.note ?? '—'}</Typography></TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* ──── LEAVE ──── */}
            {tab === 'leave' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Leave Requests</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Staff</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Period</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {leaveLoad ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                                )) : (leaveReqs ?? []).map((l: LeaveRequest) => (
                                    <TableRow key={l.id} hover>
                                        <TableCell><Typography variant="body2" fontWeight={600}>{l.staff ? fullName(l.staff.user) : l.staffId}</Typography></TableCell>
                                        <TableCell><Chip size="small" label={l.leaveType} variant="outlined" /></TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary">{l.reason ?? '—'}</Typography></TableCell>
                                        <TableCell>
                                            <Chip size="small" label={l.status} color={LEAVE_COLORS[l.status] ?? 'default'} sx={{ fontWeight: 700 }} />
                                        </TableCell>
                                        <TableCell align="right">
                                            {l.status === 'PENDING' && (
                                                <Stack direction="row" gap={0.5} justifyContent="flex-end">
                                                    <Tooltip title="Approve">
                                                        <IconButton size="small" color="success"
                                                            onClick={() => reviewM.mutate({ id: l.id, decision: 'APPROVED' })}>
                                                            <CheckCircle fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reject">
                                                        <IconButton size="small" color="error"
                                                            onClick={() => reviewM.mutate({ id: l.id, decision: 'REJECTED' })}>
                                                            <Cancel fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!leaveLoad && (!leaveReqs || leaveReqs.length === 0) && (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">No leave requests</Typography>
                                    </TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──── CERTIFICATIONS ──── */}
            {tab === 'certifications' && (
                <Box>
                    {(expiring ?? []).length > 0 && (
                        <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                            <strong>{(expiring ?? []).length} certification(s) expiring within 30 days:</strong>
                            {(expiring ?? []).map((c: Certification) => (
                                <Typography key={c.id} variant="body2">
                                    • {c.staff ? fullName(c.staff.user) : c.staffId} — {c.name} (expires {fmtDate(c.expiresAt)})
                                </Typography>
                            ))}
                        </Alert>
                    )}
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} mb={2}>All Certifications</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Staff</TableCell>
                                        <TableCell>Certification</TableCell>
                                        <TableCell>Issuer</TableCell>
                                        <TableCell>Issued</TableCell>
                                        <TableCell>Expires</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {certLoad ? Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                                    )) : (certs ?? []).map((c: Certification) => {
                                        const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                                        const isExpiring = c.expiresAt && !isExpired && new Date(c.expiresAt) < new Date(Date.now() + 30 * 86400000);
                                        return (
                                            <TableRow key={c.id} hover sx={{ bgcolor: isExpired ? alpha('#F87171', 0.04) : isExpiring ? alpha('#FBBF24', 0.04) : undefined }}>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{c.staff ? fullName(c.staff.user) : c.staffId}</Typography></TableCell>
                                                <TableCell><Typography variant="body2">{c.name}</Typography></TableCell>
                                                <TableCell><Typography variant="caption" color="text.secondary">{c.issuer ?? '—'}</Typography></TableCell>
                                                <TableCell><Typography variant="caption">{fmtDate(c.issuedAt)}</Typography></TableCell>
                                                <TableCell><Typography variant="caption">{fmtDate(c.expiresAt)}</Typography></TableCell>
                                                <TableCell>
                                                    {isExpired ? <Chip size="small" color="error" label="Expired" sx={{ fontWeight: 700 }} /> :
                                                        isExpiring ? <Chip size="small" color="warning" label="Expiring Soon" sx={{ fontWeight: 700 }} /> :
                                                            <Chip size="small" color="success" label="Valid" />}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {!certLoad && (!certs || certs.length === 0) && (
                                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No certifications recorded</Typography>
                                        </TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* ── Add Staff Dialog ── */}
            <AddStaffDialog open={showAdd} onClose={() => setShowAdd(false)}
                onSaved={() => { qc.invalidateQueries({ queryKey: ['staff-list'] }); qc.invalidateQueries({ queryKey: ['staff-dash'] }); setShowAdd(false); }} />
        </Box>
    );
}

// ─── Add Staff Dialog ──────────────────────────────────────────────────────────
function AddStaffDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('DOCTOR');
    const [specialty, setSpecialty] = useState('');
    const [license, setLicense] = useState('');
    const [commRate, setCommRate] = useState(0);

    const mutation = useMutation({
        mutationFn: () => staffApi.create({
            firstName, lastName, email, role,
            specialty: specialty || undefined,
            licenseNumber: license || undefined,
            commissionRate: commRate || undefined,
        }),
        onSuccess: () => { onSaved(); onClose(); },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    {mutation.isError && <Alert severity="error">{(mutation.error as any)?.response?.data?.message ?? 'Failed'}</Alert>}
                    <Stack direction="row" gap={2}>
                        <TextField label="First Name *" size="small" value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth />
                        <TextField label="Last Name *" size="small" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
                    </Stack>
                    <TextField label="Email *" size="small" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
                    <FormControl size="small" fullWidth>
                        <InputLabel>Role *</InputLabel>
                        <Select label="Role *" value={role} onChange={e => setRole(e.target.value)}>
                            {['HQ_ADMIN', 'BRANCH_MANAGER', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].map(r => (
                                <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField label="Specialty" size="small" value={specialty} onChange={e => setSpecialty(e.target.value)} fullWidth />
                    <TextField label="License Number" size="small" value={license} onChange={e => setLicense(e.target.value)} fullWidth />
                    <TextField label="Commission Rate (0–1)" type="number" size="small"
                        value={commRate} onChange={e => setCommRate(Number(e.target.value))}
                        inputProps={{ step: 0.01, min: 0, max: 1 }} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" disabled={!firstName || !lastName || !email || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Add />}>
                    Add Staff
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Schedules Panel ──────────────────────────────────────────────────────────

function getWeekDays(baseDate: Date): Date[] {
    const monday = new Date(baseDate);
    const dayOfWeek = monday.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function SchedulesPanel() {
    const qc = useQueryClient();
    const theme = useTheme();
    const [weekBase, setWeekBase] = useState(() => new Date());
    const weekDays = getWeekDays(weekBase);
    const from = weekDays[0].toISOString();
    const to = new Date(weekDays[6].getTime() + 86400000 - 1).toISOString();

    const [showAdd, setShowAdd] = useState(false);

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['schedules', from, to],
        queryFn: () => staffApi.listSchedules({ from, to }),
    });

    const { data: staffData } = useQuery({
        queryKey: ['staff-list-all'],
        queryFn: () => staffApi.list(),
    });

    const delM = useMutation({
        mutationFn: (id: string) => staffApi.deleteSchedule(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); qc.invalidateQueries({ queryKey: ['staff-dash'] }); },
    });

    const createM = useMutation({
        mutationFn: staffApi.createSchedule,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); qc.invalidateQueries({ queryKey: ['staff-dash'] }); setShowAdd(false); },
    });

    const prevWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    const nextWeek = () => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    const goToday = () => setWeekBase(new Date());

    const allStaff: StaffMember[] = staffData?.data ?? [];
    const staffWithProfile = allStaff.filter(s => s.staffProfile && s.isActive);

    // group schedules by staffId + day
    const byStaffDay: Record<string, Record<string, Schedule[]>> = {};
    for (const sched of schedules) {
        const sid = sched.staffId;
        const day = new Date(sched.startTime).toDateString();
        if (!byStaffDay[sid]) byStaffDay[sid] = {};
        if (!byStaffDay[sid][day]) byStaffDay[sid][day] = [];
        byStaffDay[sid][day].push(sched);
    }

    const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
    const weekLabel = `${weekDays[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    return (
        <Box>
            {/* Week nav */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" gap={1}>
                    <IconButton onClick={prevWeek} size="small"><ChevronLeft /></IconButton>
                    <Typography variant="subtitle1" fontWeight={700}>{weekLabel}</Typography>
                    <IconButton onClick={nextWeek} size="small"><ChevronRight /></IconButton>
                    <Button size="small" variant="outlined" startIcon={<Today />} onClick={goToday}>Today</Button>
                </Stack>
                <Button variant="contained" startIcon={<Add />} onClick={() => setShowAdd(true)} size="small">
                    Add Shift
                </Button>
            </Stack>

            {/* Weekly grid */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'auto' }}>
                <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 150, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>Staff</TableCell>
                            {weekDays.map((d, i) => (
                                <TableCell key={i} align="center" sx={{
                                    fontWeight: 700, minWidth: 110,
                                    bgcolor: isToday(d) ? alpha(theme.palette.primary.main, 0.08) : undefined,
                                    borderBottom: isToday(d) ? `2px solid ${theme.palette.primary.main}` : undefined,
                                }}>
                                    <Typography variant="caption" display="block" fontWeight={700}>{DAY_NAMES[i]}</Typography>
                                    <Typography variant="body2" fontWeight={isToday(d) ? 800 : 400} color={isToday(d) ? 'primary' : 'text.secondary'}>
                                        {d.getDate()}
                                    </Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton width={100} /></TableCell>
                                    {weekDays.map((_, j) => <TableCell key={j}><Skeleton height={40} /></TableCell>)}
                                </TableRow>
                            ))
                        ) : staffWithProfile.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No active staff with profiles</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            staffWithProfile.map(s => {
                                const sid = s.staffProfile?.id;
                                if (!sid) return null;
                                const roleColor = ROLE_COLORS[s.role] ?? '#94A3B8';
                                return (
                                    <TableRow key={s.id} hover>
                                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: alpha(roleColor, 0.2), color: roleColor }}>
                                                    {s.firstName[0]}{s.lastName[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600} noWrap>{s.firstName} {s.lastName}</Typography>
                                                    <Typography variant="caption" sx={{ color: roleColor }}>{s.role.replace('_', ' ')}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        {weekDays.map((day, di) => {
                                            const shifts = byStaffDay[sid]?.[day.toDateString()] ?? [];
                                            return (
                                                <TableCell key={di} align="center" sx={{
                                                    bgcolor: isToday(day) ? alpha(theme.palette.primary.main, 0.04) : undefined,
                                                    verticalAlign: 'top', py: 0.5,
                                                }}>
                                                    <Stack gap={0.5}>
                                                        {shifts.map(sh => (
                                                            <Paper key={sh.id} sx={{
                                                                px: 1, py: 0.5, borderRadius: 1.5,
                                                                bgcolor: alpha(roleColor, 0.08),
                                                                border: `1px solid ${alpha(roleColor, 0.25)}`,
                                                                position: 'relative',
                                                                '&:hover .del-btn': { opacity: 1 },
                                                            }}>
                                                                <Typography variant="caption" fontWeight={700} display="block">
                                                                    {fmtTime(sh.startTime)} – {fmtTime(sh.endTime)}
                                                                </Typography>
                                                                {sh.note && <Typography variant="caption" color="text.secondary" display="block" noWrap>{sh.note}</Typography>}
                                                                <IconButton
                                                                    className="del-btn"
                                                                    size="small"
                                                                    sx={{ position: 'absolute', top: -4, right: -4, opacity: 0, transition: '0.2s', bgcolor: 'background.paper' }}
                                                                    onClick={() => delM.mutate(sh.id)}
                                                                >
                                                                    <Delete sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                            </Paper>
                                                        ))}
                                                    </Stack>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Shift Dialog */}
            <AddShiftDialog
                open={showAdd}
                onClose={() => setShowAdd(false)}
                staff={staffWithProfile}
                weekDays={weekDays}
                onCreate={(data) => createM.mutate(data)}
                isPending={createM.isPending}
            />
        </Box>
    );
}

// ─── Add Shift Dialog ─────────────────────────────────────────────────────────

function AddShiftDialog({ open, onClose, staff, weekDays, onCreate, isPending }: {
    open: boolean; onClose: () => void;
    staff: StaffMember[];
    weekDays: Date[];
    onCreate: (data: { staffId: string; startTime: string; endTime: string; note?: string }) => void;
    isPending: boolean;
}) {
    const [staffId, setStaffId] = useState('');
    const [dayIdx, setDayIdx] = useState(0);
    const [startHr, setStartHr] = useState('09:00');
    const [endHr, setEndHr] = useState('17:00');
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        if (!staffId) return;
        const day = weekDays[dayIdx];
        const [sh, sm] = startHr.split(':').map(Number);
        const [eh, em] = endHr.split(':').map(Number);
        const start = new Date(day); start.setHours(sh, sm, 0, 0);
        const end = new Date(day); end.setHours(eh, em, 0, 0);
        onCreate({
            staffId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            note: note || undefined,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Add Shift</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Staff Member *</InputLabel>
                        <Select label="Staff Member *" value={staffId} onChange={e => setStaffId(e.target.value)}>
                            {staff.map(s => (
                                <MenuItem key={s.id} value={s.staffProfile?.id ?? ''}>
                                    {s.firstName} {s.lastName} ({s.role.replace('_', ' ')})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Day *</InputLabel>
                        <Select label="Day *" value={dayIdx} onChange={e => setDayIdx(Number(e.target.value))}>
                            {weekDays.map((d, i) => (
                                <MenuItem key={i} value={i}>
                                    {DAY_NAMES[i]} {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Stack direction="row" gap={2}>
                        <TextField label="Start" type="time" size="small" fullWidth
                            value={startHr} onChange={e => setStartHr(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField label="End" type="time" size="small" fullWidth
                            value={endHr} onChange={e => setEndHr(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }} />
                    </Stack>
                    <TextField label="Note (optional)" size="small" fullWidth
                        value={note} onChange={e => setNote(e.target.value)} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" disabled={!staffId || isPending} onClick={handleSubmit}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <Add />}>
                    Add Shift
                </Button>
            </DialogActions>
        </Dialog>
    );
}
