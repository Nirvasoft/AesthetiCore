import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Card, CardContent,
    Skeleton, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer, Chip, useTheme,
} from '@mui/material';
import {
    TrendingUp, People, CalendarMonth, Inventory2,
    MedicalServices, Stars, Storefront, BarChart,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
    LineChart, Line, BarChart as ReBarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    analyticsApi,
    type ExecDashboard, type RevenuePoint, type PatientMetrics,
    type PractPerf, type TopTreatment, type BranchComp, type ApptAnalytics,
} from '../../lib/analytics-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const money = (n?: number) => `฿${(Number(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const COLORS = ['#38BDF8', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#FB923C', '#60A5FA', '#C084FC'];
const STATUS_COLORS: Record<string, string> = {
    PENDING: '#94A3B8', CONFIRMED: '#38BDF8', CHECKED_IN: '#A78BFA',
    IN_PROGRESS: '#FBBF24', COMPLETED: '#34D399', NO_SHOW: '#F87171', CANCELLED: '#6B7280',
};

type TabKey = 'overview' | 'revenue' | 'patients' | 'operations' | 'inventory';

export function AnalyticsPage() {
    const theme = useTheme();
    const [tab, setTab] = useState<TabKey>('overview');

    const { data: dash, isLoading: dashLoad } = useQuery({
        queryKey: ['analytics-dash'],
        queryFn: () => analyticsApi.getDashboard(),
    });

    const { data: revTrend } = useQuery({
        queryKey: ['analytics-revenue'],
        queryFn: () => analyticsApi.getRevenue(),
        enabled: tab === 'overview' || tab === 'revenue',
    });

    const { data: patMetrics } = useQuery({
        queryKey: ['analytics-patients'],
        queryFn: () => analyticsApi.getPatients(),
        enabled: tab === 'overview' || tab === 'patients',
    });

    const { data: practitioners } = useQuery({
        queryKey: ['analytics-practitioners'],
        queryFn: () => analyticsApi.getPractitioners(),
        enabled: tab === 'operations',
    });

    const { data: topTx } = useQuery({
        queryKey: ['analytics-treatments'],
        queryFn: () => analyticsApi.getTreatments(),
        enabled: tab === 'revenue' || tab === 'overview',
    });

    const { data: branchComp } = useQuery({
        queryKey: ['analytics-branches'],
        queryFn: () => analyticsApi.getBranches(),
        enabled: tab === 'overview' || tab === 'revenue',
    });

    const { data: apptAnalytics } = useQuery({
        queryKey: ['analytics-appts'],
        queryFn: () => analyticsApi.getAppointments(),
        enabled: tab === 'operations',
    });

    const { data: invData } = useQuery({
        queryKey: ['analytics-inventory'],
        queryFn: () => analyticsApi.getInventory(),
        enabled: tab === 'inventory',
    });

    // ── KPI data ──
    const kpis = [
        { id: 'kpi-revenue', icon: <TrendingUp />, label: 'Revenue', value: money(dash?.revenue?.total), color: '#34D399', sub: 'This period' },
        { id: 'kpi-avg-inv', icon: <BarChart />, label: 'Avg Invoice', value: money(dash?.revenue?.avgInvoice), color: '#38BDF8', sub: 'Per paid invoice' },
        { id: 'kpi-patients', icon: <People />, label: 'Total Patients', value: dash?.patients?.total ?? 0, color: '#A78BFA', sub: `${dash?.patients?.new ?? 0} new this period` },
        { id: 'kpi-appts', icon: <CalendarMonth />, label: 'Appointments', value: dash?.appointments?.total ?? 0, color: '#60A5FA', sub: `${dash?.appointments?.noShowRate ?? 0}% no-show` },
        { id: 'kpi-invoices', icon: <Storefront />, label: 'Invoices', value: dash?.invoices?.total ?? 0, color: '#FBBF24', sub: `${dash?.invoices?.paid ?? 0} paid` },
        { id: 'kpi-stock', icon: <Inventory2 />, label: 'Stock Units', value: dash?.inventory?.totalStockUnits ?? 0, color: '#FB923C', sub: 'On hand' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Analytics & Reporting</Typography>
                    <Typography variant="body2" color="text.secondary">Cross-module insights, trends & performance</Typography>
                </Box>
            </Stack>

            {/* KPI Row */}
            <Grid container spacing={2} mb={3}>
                {kpis.map(({ id, icon, label, value, color, sub }) => (
                    <Grid key={id} item xs={6} sm={4} md={2}>
                        <Card id={id} sx={{
                            borderRadius: 3, height: '100%',
                            background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${theme.palette.background.paper})`,
                            border: '1px solid', borderColor: 'divider',
                        }}>
                            <CardContent sx={{ pb: '12px !important', px: 2 }}>
                                <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                                {dashLoad ? <Skeleton width={70} height={38} /> : (
                                    <Typography variant="h5" fontWeight={800}>{value}</Typography>
                                )}
                                <Typography variant="caption" fontWeight={600}>{label}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary">{sub}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab label="Overview" value="overview" />
                <Tab label="Revenue" value="revenue" />
                <Tab label="Patients" value="patients" />
                <Tab label="Operations" value="operations" />
                <Tab label="Inventory" value="inventory" />
            </Tabs>

            {/* ──── OVERVIEW ──── */}
            {tab === 'overview' && (
                <Grid container spacing={3}>
                    {/* Revenue Trend */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Revenue Trend</Typography>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={revTrend ?? []}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(v: number) => money(v)} />
                                    <Area type="monotone" dataKey="revenue" stroke="#34D399" fill="url(#revGrad)" strokeWidth={2.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Patient Growth */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>New Patients</Typography>
                            <ResponsiveContainer width="100%" height={240}>
                                <ReBarChart data={patMetrics?.monthlyGrowth ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Top Treatments */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Top Treatments</Typography>
                            <ResponsiveContainer width="100%" height={260}>
                                <ReBarChart data={(topTx ?? []).slice(0, 8)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#38BDF8" radius={[0, 4, 4, 0]} name="Sessions" />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Branch Comparison */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Branch Comparison</Typography>
                            <ResponsiveContainer width="100%" height={260}>
                                <ReBarChart data={branchComp ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="branchName" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => money(v)} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#34D399" radius={[4, 4, 0, 0]} name="Revenue" />
                                    <Bar dataKey="totalAppointments" fill="#38BDF8" radius={[4, 4, 0, 0]} name="Appointments" />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──── REVENUE ──── */}
            {tab === 'revenue' && (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Monthly Revenue</Typography>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={revTrend ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(v: number) => money(v)} />
                                    <Line type="monotone" dataKey="revenue" stroke="#34D399" strokeWidth={3} dot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Top Treatments by Revenue</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <ReBarChart data={(topTx ?? []).slice(0, 10)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => money(v)} />
                                    <Bar dataKey="revenue" fill="#FBBF24" radius={[0, 4, 4, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Branch Revenue</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={branchComp ?? []} dataKey="revenue" nameKey="branchName"
                                        cx="50%" cy="50%" outerRadius={100} labelLine label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                        {(branchComp ?? []).map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──── PATIENTS ──── */}
            {tab === 'patients' && (
                <Grid container spacing={3}>
                    {/* Patient segment pie */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Patient Segments</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Active', value: (patMetrics?.active ?? 0) - (patMetrics?.vip ?? 0) },
                                        { name: 'VIP', value: patMetrics?.vip ?? 0 },
                                        { name: 'Inactive', value: patMetrics?.inactive ?? 0 },
                                    ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                        <Cell fill="#34D399" />
                                        <Cell fill="#FBBF24" />
                                        <Cell fill="#94A3B8" />
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Patient summary cards */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Patient Summary</Typography>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Total Patients', value: patMetrics?.total ?? 0, icon: <People />, color: '#A78BFA' },
                                    { label: 'Active', value: patMetrics?.active ?? 0, icon: <People />, color: '#34D399' },
                                    { label: 'VIP', value: patMetrics?.vip ?? 0, icon: <Stars />, color: '#FBBF24' },
                                    { label: 'Retention Rate', value: `${patMetrics?.retentionRate ?? 0}%`, icon: <TrendingUp />, color: '#38BDF8' },
                                    { label: 'New (30 days)', value: patMetrics?.newLast30Days ?? 0, icon: <People />, color: '#60A5FA' },
                                    { label: 'New (90 days)', value: patMetrics?.newLast90Days ?? 0, icon: <People />, color: '#FB923C' },
                                ].map((c, i) => (
                                    <Grid key={i} item xs={6} sm={4}>
                                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(c.color, 0.08), textAlign: 'center' }}>
                                            <Box sx={{ color: c.color, mb: 0.5 }}>{c.icon}</Box>
                                            <Typography variant="h6" fontWeight={800}>{c.value}</Typography>
                                            <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Monthly growth */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Monthly Patient Growth</Typography>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={patMetrics?.monthlyGrowth ?? []}>
                                    <defs>
                                        <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#A78BFA" fill="url(#patGrad)" strokeWidth={2.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──── OPERATIONS ──── */}
            {tab === 'operations' && (
                <Grid container spacing={3}>
                    {/* Appointment status pie */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Appointment Status Distribution</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={apptAnalytics?.statusDistribution ?? []} dataKey="count" nameKey="status"
                                        cx="50%" cy="50%" outerRadius={100}
                                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                        {(apptAnalytics?.statusDistribution ?? []).map((e: any, i: number) => (
                                            <Cell key={i} fill={STATUS_COLORS[e.status] ?? COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Peak Hours */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Peak Hours</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <ReBarChart data={apptAnalytics?.peakHours ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 12 }}
                                        tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip labelFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Appointments">
                                        {(apptAnalytics?.peakHours ?? []).map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Practitioner Leaderboard */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Practitioner Performance</Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>Practitioner ID</TableCell>
                                            <TableCell align="right">Sessions</TableCell>
                                            <TableCell align="right">Commissions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(practitioners ?? []).map((p: PractPerf, i: number) => (
                                            <TableRow key={p.practitionerId} hover>
                                                <TableCell>
                                                    <Chip size="small" label={i + 1}
                                                        sx={{ fontWeight: 800, bgcolor: i < 3 ? alpha(COLORS[i], 0.15) : undefined }} />
                                                </TableCell>
                                                <TableCell><Typography variant="body2" fontFamily="monospace">{p.practitionerId}</Typography></TableCell>
                                                <TableCell align="right"><Typography fontWeight={700}>{p.sessions}</Typography></TableCell>
                                                <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 700 }}>{money(p.commissions)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!practitioners || practitioners.length === 0) && (
                                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No data for this period</Typography>
                                            </TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──── INVENTORY ──── */}
            {tab === 'inventory' && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Top Consumed Products</Typography>
                            <ResponsiveContainer width="100%" height={350}>
                                <ReBarChart data={invData?.topConsumed ?? []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="used" fill="#38BDF8" radius={[0, 4, 4, 0]} name="Used" stackId="a" />
                                    <Bar dataKey="wasted" fill="#F87171" radius={[0, 4, 4, 0]} name="Wasted" stackId="a" />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Stock by Branch</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={(invData?.stockByBranch ?? []).map((b: any) => ({
                                        name: b.branchId, value: Number(b._sum?.quantityOnHand ?? 0),
                                    }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                                        label={({ name, percent }: any) => `${name.slice(0, 8)}… (${(percent * 100).toFixed(0)}%)`}>
                                        {(invData?.stockByBranch ?? []).map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Consumption Detail</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Units Used</TableCell>
                                            <TableCell align="right">Units Wasted</TableCell>
                                            <TableCell align="right">Waste %</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(invData?.topConsumed ?? []).map((p: any) => (
                                            <TableRow key={p.productId} hover>
                                                <TableCell>{p.name}</TableCell>
                                                <TableCell align="right">{p.used}</TableCell>
                                                <TableCell align="right" sx={{ color: p.wasted > 0 ? 'error.main' : 'text.secondary' }}>{p.wasted}</TableCell>
                                                <TableCell align="right">
                                                    <Chip size="small" label={`${p.used + p.wasted > 0 ? Math.round((p.wasted / (p.used + p.wasted)) * 100) : 0}%`}
                                                        color={p.wasted > 0 ? 'error' : 'default'} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
