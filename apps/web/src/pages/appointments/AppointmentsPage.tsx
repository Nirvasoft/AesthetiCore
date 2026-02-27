import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Card, CardContent,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Skeleton, IconButton, Tooltip, Tabs,
    Tab, Divider, CircularProgress, Switch, useTheme,
} from '@mui/material';
import {
    CalendarMonth, Add, CheckCircle, PersonPin, PlayArrow,
    Cancel, DoNotDisturbOn, Schedule, MeetingRoom, HourglassTop,
    Refresh, EventAvailable, EventBusy, TrendingDown,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
    appointmentsApi,
    type Appointment, type AppointmentStatus, type Room, type WaitlistEntry,
} from '../../lib/appointments-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtTime = (d?: string) =>
    d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
const patName = (p?: Appointment['patient']) =>
    p ? `${p.firstName} ${p.lastName}` : '—';

const STATUS_CFG: Record<AppointmentStatus, { icon: JSX.Element; color: string; chipColor: any; label: string }> = {
    PENDING: { icon: <HourglassTop fontSize="small" />, color: '#94A3B8', chipColor: 'default', label: 'Pending' },
    CONFIRMED: { icon: <EventAvailable fontSize="small" />, color: '#38BDF8', chipColor: 'info', label: 'Confirmed' },
    CHECKED_IN: { icon: <PersonPin fontSize="small" />, color: '#A78BFA', chipColor: 'secondary', label: 'Checked In' },
    IN_PROGRESS: { icon: <PlayArrow fontSize="small" />, color: '#FBBF24', chipColor: 'warning', label: 'In Progress' },
    COMPLETED: { icon: <CheckCircle fontSize="small" />, color: '#34D399', chipColor: 'success', label: 'Completed' },
    NO_SHOW: { icon: <EventBusy fontSize="small" />, color: '#F87171', chipColor: 'error', label: 'No Show' },
    CANCELLED: { icon: <Cancel fontSize="small" />, color: '#6B7280', chipColor: 'default', label: 'Cancelled' },
};

// ─── Book Appointment Dialog ───────────────────────────────────────────────────
function BookDialog({ open, onClose, onBooked }: { open: boolean; onClose: () => void; onBooked: () => void }) {
    const [patientId, setPatientId] = useState('');
    const [practId, setPractId] = useState('');
    const [roomId, setRoomId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startH, setStartH] = useState('09');
    const [startM, setStartM] = useState('00');
    const [durMin, setDurMin] = useState(60);
    const [note, setNote] = useState('');
    const [deposit, setDeposit] = useState(0);

    const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: () => appointmentsApi.listRooms(), enabled: open });

    const startTime = `${date}T${startH}:${startM}:00`;
    const endDate = new Date(new Date(startTime).getTime() + durMin * 60000);
    const endTime = endDate.toISOString();

    const mutation = useMutation({
        mutationFn: () => appointmentsApi.create({
            patientId, practitionerId: practId || undefined,
            roomId: roomId || undefined, startTime, endTime,
            serviceNote: note || undefined, depositAmount: deposit || undefined,
        }),
        onSuccess: () => { onBooked(); onClose(); },
    });

    const hours = Array.from({ length: 10 }, (_, i) => String(i + 8).padStart(2, '0'));
    const mins = ['00', '15', '30', '45'];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    {mutation.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>{(mutation.error as any)?.response?.data?.message ?? 'Booking failed'}</Alert>}
                    <TextField label="Patient ID *" size="small" value={patientId}
                        onChange={e => setPatientId(e.target.value)} fullWidth />
                    <TextField label="Practitioner ID (optional)" size="small" value={practId}
                        onChange={e => setPractId(e.target.value)} fullWidth />
                    <FormControl size="small" fullWidth>
                        <InputLabel>Room</InputLabel>
                        <Select label="Room" value={roomId} onChange={e => setRoomId(e.target.value)}>
                            <MenuItem value="">No room</MenuItem>
                            {(rooms ?? []).filter((r: Room) => r.isActive).map((r: Room) => (
                                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField label="Date" type="date" size="small" value={date}
                        onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                    <Stack direction="row" gap={2}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Hour</InputLabel>
                            <Select label="Hour" value={startH} onChange={e => setStartH(e.target.value)}>
                                {hours.map(h => <MenuItem key={h} value={h}>{h}:00</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Minute</InputLabel>
                            <Select label="Minute" value={startM} onChange={e => setStartM(e.target.value)}>
                                {mins.map(m => <MenuItem key={m} value={m}>:{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Duration</InputLabel>
                            <Select label="Duration" value={durMin} onChange={e => setDurMin(Number(e.target.value))}>
                                {[15, 30, 45, 60, 90, 120].map(d => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                    <TextField label="Deposit (฿)" type="number" size="small"
                        value={deposit} onChange={e => setDeposit(Number(e.target.value))} fullWidth />
                    <TextField label="Service Note" size="small" multiline rows={2}
                        value={note} onChange={e => setNote(e.target.value)} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" disabled={!patientId || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CalendarMonth />}>
                    Book
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type TabKey = 'calendar' | 'today' | 'waitlist' | 'rooms';

export function AppointmentsPage() {
    const qc = useQueryClient();
    const theme = useTheme();
    const [tab, setTab] = useState<TabKey>('today');
    const [showBook, setShowBook] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [calDate, setCalDate] = useState(new Date().toISOString().split('T')[0]);

    // ── Today queries ──
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = `${todayStr}T00:00:00`;
    const todayEnd = `${todayStr}T23:59:59`;

    const { data: dashboard, isLoading: dashLoad } = useQuery({
        queryKey: ['appt-dashboard'],
        queryFn: () => appointmentsApi.getDashboard(),
    });

    const { data: todayAppts, isLoading: todayLoad } = useQuery({
        queryKey: ['appt-today', statusFilter],
        queryFn: () => appointmentsApi.list({ from: todayStart, to: todayEnd, status: statusFilter || undefined, limit: 100 }),
        enabled: tab === 'today',
    });

    // ── Calendar queries ──
    const calFrom = `${calDate}T00:00:00`;
    const calTo = `${calDate}T23:59:59`;
    const { data: calAppts, isLoading: calLoad } = useQuery({
        queryKey: ['appt-cal', calDate],
        queryFn: () => appointmentsApi.list({ from: calFrom, to: calTo, limit: 200 }),
        enabled: tab === 'calendar',
    });

    const { data: rooms, isLoading: roomsLoad } = useQuery({
        queryKey: ['rooms'],
        queryFn: () => appointmentsApi.listRooms(),
        enabled: tab === 'rooms',
    });

    const { data: waitlist, isLoading: wlLoad } = useQuery({
        queryKey: ['waitlist'],
        queryFn: () => appointmentsApi.listWaitlist(),
        enabled: tab === 'waitlist',
    });

    // ── Status transition mutations ──
    const act = (fn: (id: string) => Promise<any>) => useMutation({
        mutationFn: fn,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['appt-today'] }); qc.invalidateQueries({ queryKey: ['appt-dashboard'] }); qc.invalidateQueries({ queryKey: ['appt-cal'] }); },
    });
    const confirmM = act(appointmentsApi.confirm);
    const checkInM = act(appointmentsApi.checkIn);
    const startM = act(appointmentsApi.start);
    const completeM = act(appointmentsApi.complete);
    const noShowM = act(appointmentsApi.noShow);

    const toggleRoomM = useMutation({
        mutationFn: appointmentsApi.toggleRoom,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
    });

    const removeWlM = useMutation({
        mutationFn: appointmentsApi.removeFromWaitlist,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['waitlist'] }),
    });

    // ── Timeline ──
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let h = 8; h <= 18; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
        }
        return slots;
    }, []);

    // ── Quick actions for a row ──
    function ActionButtons({ appt }: { appt: Appointment }) {
        const s = appt.status;
        return (
            <Stack direction="row" gap={0.5}>
                {s === 'PENDING' && (
                    <Tooltip title="Confirm"><IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); confirmM.mutate(appt.id); }}><EventAvailable fontSize="small" /></IconButton></Tooltip>
                )}
                {s === 'CONFIRMED' && (
                    <Tooltip title="Check In"><IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); checkInM.mutate(appt.id); }}><PersonPin fontSize="small" /></IconButton></Tooltip>
                )}
                {s === 'CHECKED_IN' && (
                    <Tooltip title="Start Session"><IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); startM.mutate(appt.id); }}><PlayArrow fontSize="small" /></IconButton></Tooltip>
                )}
                {(s === 'IN_PROGRESS' || s === 'CHECKED_IN') && (
                    <Tooltip title="Complete"><IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); completeM.mutate(appt.id); }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                )}
                {(s === 'PENDING' || s === 'CONFIRMED') && (
                    <Tooltip title="No Show"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); noShowM.mutate(appt.id); }}><DoNotDisturbOn fontSize="small" /></IconButton></Tooltip>
                )}
            </Stack>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Appointments & Scheduling</Typography>
                    <Typography variant="body2" color="text.secondary">Multi-practitioner calendar, waitlist & room management</Typography>
                </Box>
                <Button id="btn-book-appointment" variant="contained" startIcon={<Add />} onClick={() => setShowBook(true)}>
                    Book Appointment
                </Button>
            </Stack>

            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
                {[
                    { id: 'kpi-today-total', icon: <CalendarMonth />, label: "Today's Appointments", value: dashboard?.today?.total ?? 0, color: '#38BDF8' },
                    { id: 'kpi-pending', icon: <HourglassTop />, label: 'Pending', value: dashboard?.today?.pending ?? 0, color: '#FBBF24' },
                    { id: 'kpi-checked-in', icon: <PersonPin />, label: 'Checked In', value: dashboard?.today?.checkedIn ?? 0, color: '#A78BFA' },
                    { id: 'kpi-completed', icon: <CheckCircle />, label: 'Completed', value: dashboard?.today?.completed ?? 0, color: '#34D399' },
                    { id: 'kpi-week', icon: <Schedule />, label: 'This Week', value: dashboard?.weekUpcoming ?? 0, color: '#60A5FA' },
                    { id: 'kpi-noshow', icon: <TrendingDown />, label: 'No-Show Rate', value: `${dashboard?.noShowRate ?? 0}%`, color: '#F87171' },
                ].map(({ id, icon, label, value, color }) => (
                    <Grid key={id} item xs={6} sm={4} md={2}>
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
                <Tab id="tab-today" label="Today" value="today" icon={<CalendarMonth />} iconPosition="start" />
                <Tab id="tab-calendar" label="Calendar" value="calendar" icon={<Schedule />} iconPosition="start" />
                <Tab id="tab-waitlist" label={`Waitlist (${dashboard?.waitlistCount ?? 0})`} value="waitlist" icon={<HourglassTop />} iconPosition="start" />
                <Tab id="tab-rooms" label="Rooms" value="rooms" icon={<MeetingRoom />} iconPosition="start" />
            </Tabs>

            {/* ──── TODAY ──── */}
            {tab === 'today' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" gap={2} mb={2} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={700}>Today — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
                        <Box flex={1} />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {Object.entries(STATUS_CFG).map(([v, c]) => <MenuItem key={v} value={v}>{c.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh"><IconButton onClick={() => qc.invalidateQueries({ queryKey: ['appt-today'] })}><Refresh /></IconButton></Tooltip>
                    </Stack>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Time</TableCell>
                                    <TableCell>Patient</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Room</TableCell>
                                    <TableCell>Service Note</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {todayLoad ? Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                                )) : (todayAppts?.data ?? []).map((a: Appointment) => {
                                    const cfg = STATUS_CFG[a.status];
                                    return (
                                        <TableRow key={a.id} hover sx={{
                                            borderLeft: `4px solid ${cfg.color}`,
                                            '&:hover': { bgcolor: alpha(cfg.color, 0.06) },
                                        }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>{fmtTime(a.startTime)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{fmtTime(a.endTime)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{patName(a.patient)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{a.patient?.patientCode}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip icon={cfg.icon} label={cfg.label} size="small" color={cfg.chipColor}
                                                    sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{a.room?.name ?? '—'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                    {a.serviceNote ?? '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right"><ActionButtons appt={a} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!todayLoad && (!todayAppts?.data || todayAppts.data.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No appointments for today</Typography>
                                            <Button size="small" sx={{ mt: 1 }} startIcon={<Add />} onClick={() => setShowBook(true)}>
                                                Book First Appointment
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──── CALENDAR ──── */}
            {tab === 'calendar' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" gap={2} mb={2} alignItems="center">
                        <TextField label="Date" type="date" size="small" value={calDate}
                            onChange={e => setCalDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Typography variant="subtitle1" fontWeight={700} flex={1}>
                            {new Date(calDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                        <Tooltip title="Refresh"><IconButton onClick={() => qc.invalidateQueries({ queryKey: ['appt-cal'] })}><Refresh /></IconButton></Tooltip>
                    </Stack>

                    {/* Timeline grid */}
                    <Box sx={{ position: 'relative', minHeight: 600 }}>
                        {calLoad ? <Skeleton height={400} /> : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {timeSlots.map(slot => {
                                    const slotHour = parseInt(slot);
                                    const appts = (calAppts?.data ?? []).filter((a: Appointment) => {
                                        const h = new Date(a.startTime).getHours();
                                        return h === slotHour;
                                    });
                                    return (
                                        <Box key={slot} sx={{
                                            display: 'flex', minHeight: 56, borderBottom: '1px solid', borderColor: 'divider',
                                        }}>
                                            <Box sx={{ width: 64, py: 1, px: 1, color: 'text.secondary', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                                {slot}
                                            </Box>
                                            <Box sx={{ flex: 1, display: 'flex', gap: 1, py: 0.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                                {appts.map((a: Appointment) => {
                                                    const cfg = STATUS_CFG[a.status];
                                                    return (
                                                        <Box key={a.id} sx={{
                                                            px: 1.5, py: 0.75, borderRadius: 2, fontSize: 13,
                                                            bgcolor: alpha(cfg.color, 0.15), border: `1px solid ${alpha(cfg.color, 0.4)}`,
                                                            cursor: 'pointer', minWidth: 180, maxWidth: 280,
                                                            '&:hover': { bgcolor: alpha(cfg.color, 0.25) },
                                                        }}>
                                                            <Stack direction="row" gap={0.5} alignItems="center">
                                                                {cfg.icon}
                                                                <Typography variant="caption" fontWeight={700}>
                                                                    {fmtTime(a.startTime)}–{fmtTime(a.endTime)}
                                                                </Typography>
                                                            </Stack>
                                                            <Typography variant="body2" fontWeight={600} noWrap>{patName(a.patient)}</Typography>
                                                            {a.room && <Typography variant="caption" color="text.secondary">{a.room.name}</Typography>}
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                </Paper>
            )}

            {/* ──── WAITLIST ──── */}
            {tab === 'waitlist' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Active Waitlist</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Patient ID</TableCell>
                                    <TableCell>Preferred Date</TableCell>
                                    <TableCell>Notes</TableCell>
                                    <TableCell>Added</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {wlLoad ? Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                                )) : ((waitlist ?? []) as WaitlistEntry[]).map(w => (
                                    <TableRow key={w.id} hover>
                                        <TableCell><Typography variant="body2" fontFamily="monospace">{w.patientId}</Typography></TableCell>
                                        <TableCell>{w.preferredDate ? fmtDate(w.preferredDate) : '—'}</TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary">{w.notes ?? '—'}</Typography></TableCell>
                                        <TableCell><Typography variant="caption">{fmtDate(w.createdAt)}</Typography></TableCell>
                                        <TableCell align="right">
                                            <Button size="small" color="error" variant="outlined"
                                                onClick={() => removeWlM.mutate(w.id)}>Remove</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!wlLoad && (!waitlist || (waitlist as WaitlistEntry[]).length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">Waitlist is empty</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──── ROOMS ──── */}
            {tab === 'rooms' && (
                <Grid container spacing={2}>
                    {roomsLoad ? Array.from({ length: 4 }).map((_, i) => (
                        <Grid key={i} item xs={12} sm={6} md={3}>
                            <Skeleton height={120} sx={{ borderRadius: 3 }} />
                        </Grid>
                    )) : (rooms ?? []).map((r: Room) => (
                        <Grid key={r.id} item xs={12} sm={6} md={3}>
                            <Card sx={{
                                borderRadius: 3, border: '1px solid', borderColor: r.isActive ? 'success.main' : 'divider',
                                opacity: r.isActive ? 1 : 0.6,
                            }}>
                                <CardContent>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" gap={1} alignItems="center">
                                            <MeetingRoom sx={{ color: r.isActive ? 'success.main' : 'text.disabled' }} />
                                            <Typography variant="subtitle1" fontWeight={700}>{r.name}</Typography>
                                        </Stack>
                                        <Tooltip title={r.isActive ? 'Deactivate' : 'Activate'}>
                                            <Switch size="small" checked={r.isActive}
                                                onChange={() => toggleRoomM.mutate(r.id)} />
                                        </Tooltip>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        Capacity: {r.capacity} • {r.isActive ? 'Active' : 'Inactive'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {!roomsLoad && (!rooms || rooms.length === 0) && (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                <Typography color="text.secondary">No rooms configured</Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Book Dialog */}
            <BookDialog open={showBook} onClose={() => setShowBook(false)}
                onBooked={() => { qc.invalidateQueries({ queryKey: ['appt-today'] }); qc.invalidateQueries({ queryKey: ['appt-dashboard'] }); }} />
        </Box>
    );
}
