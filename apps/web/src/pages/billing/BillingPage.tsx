import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Card, CardContent,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Skeleton, IconButton, Tooltip, Tabs,
    Tab, Divider, CircularProgress, LinearProgress, useTheme,
} from '@mui/material';
import {
    Receipt, Payments, Add, CheckCircle, Cancel, Refresh,
    LocalAtm, CreditCard, QrCode, AccountBalance, AccountBalanceWallet,
    Warning, TrendingUp, AttachMoney, HourglassTop,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { billingApi, type Invoice, type InvoiceStatus } from '../../lib/billing-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const money = (n?: number) => `฿${(Number(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const patName = (p?: Invoice['patient']) => p ? `${p.firstName} ${p.lastName}` : '—';

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; label: string; chipColor: any }> = {
    DRAFT: { color: '#94A3B8', label: 'Draft', chipColor: 'default' },
    ISSUED: { color: '#38BDF8', label: 'Issued', chipColor: 'info' },
    PARTIAL: { color: '#FBBF24', label: 'Partial', chipColor: 'warning' },
    PAID: { color: '#34D399', label: 'Paid', chipColor: 'success' },
    VOID: { color: '#F87171', label: 'Void', chipColor: 'error' },
    REFUNDED: { color: '#C084FC', label: 'Refunded', chipColor: 'secondary' },
};

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash', icon: <LocalAtm /> },
    { value: 'CREDIT_CARD', label: 'Credit Card', icon: <CreditCard /> },
    { value: 'DEBIT_CARD', label: 'Debit Card', icon: <CreditCard /> },
    { value: 'QR_CODE', label: 'QR Code', icon: <QrCode /> },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: <AccountBalance /> },
    { value: 'PATIENT_CREDIT', label: 'Patient Credit', icon: <AccountBalanceWallet /> },
];

// ─── Create Invoice Dialog ─────────────────────────────────────────────────────
function CreateInvoiceDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
    const [patientId, setPatientId] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [taxRate, setTaxRate] = useState(7);
    const [scPct, setScPct] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, discountPct: 0 }]);

    const addItem = () => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0, discountPct: 0 }]);
    const updateItem = (idx: number, f: string, v: any) =>
        setItems(p => p.map((it, i) => i === idx ? { ...it, [f]: v } : it));

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discountPct / 100), 0);
    const afterDisc = subtotal - discount;
    const sc = (afterDisc * scPct) / 100;
    const tax = ((afterDisc + sc) * taxRate) / 100;
    const total = afterDisc + sc + tax;

    const mutation = useMutation({
        mutationFn: () => billingApi.createInvoice({
            patientId, sessionId: sessionId || undefined,
            taxRate, serviceChargePct: scPct, overallDiscountAmt: discount,
            notes: notes || undefined, items,
        }),
        onSuccess: (inv) => { onSaved(inv.id); onClose(); },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2.5}>
                    <Stack direction="row" gap={2}>
                        <TextField label="Patient ID *" size="small" value={patientId}
                            onChange={e => setPatientId(e.target.value)} fullWidth />
                        <TextField label="Session ID (optional)" size="small" value={sessionId}
                            onChange={e => setSessionId(e.target.value)} fullWidth />
                    </Stack>
                    <Divider />
                    <Typography variant="subtitle2" fontWeight={700}>Line Items</Typography>
                    {items.map((item, idx) => (
                        <Stack key={idx} direction="row" gap={1.5} alignItems="center">
                            <TextField label="Description" size="small" sx={{ flex: 3 }}
                                value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                            <TextField label="Qty" type="number" size="small" sx={{ flex: 1 }}
                                value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                            <TextField label="Unit Price" type="number" size="small" sx={{ flex: 1.5 }}
                                value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                            <TextField label="Disc %" type="number" size="small" sx={{ flex: 1 }}
                                value={item.discountPct} onChange={e => updateItem(idx, 'discountPct', Number(e.target.value))} />
                            <Typography sx={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}>
                                {money(item.quantity * item.unitPrice * (1 - item.discountPct / 100))}
                            </Typography>
                        </Stack>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>
                        Add Line
                    </Button>
                    <Divider />
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        <TextField label="Overall Discount (฿)" type="number" size="small" sx={{ flex: 1 }}
                            value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                        <TextField label="Service Charge %" type="number" size="small" sx={{ flex: 1 }}
                            value={scPct} onChange={e => setScPct(Number(e.target.value))} />
                        <TextField label="VAT %" type="number" size="small" sx={{ flex: 1 }}
                            value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
                    </Stack>
                    <Box sx={{ p: 2, bgcolor: t => alpha(t.palette.primary.main, 0.06), borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                            <Typography variant="body2">{money(subtotal)}</Typography>
                        </Stack>
                        {discount > 0 && <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="error.main">Discount</Typography>
                            <Typography variant="body2" color="error.main">-{money(discount)}</Typography>
                        </Stack>}
                        {scPct > 0 && <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="text.secondary">Service Charge ({scPct}%)</Typography>
                            <Typography variant="body2">{money(sc)}</Typography>
                        </Stack>}
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" color="text.secondary">VAT ({taxRate}%)</Typography>
                            <Typography variant="body2">{money(tax)}</Typography>
                        </Stack>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={800}>TOTAL</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main">{money(total)}</Typography>
                        </Stack>
                    </Box>
                    <TextField label="Notes" size="small" value={notes}
                        onChange={e => setNotes(e.target.value)} multiline rows={2} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" disabled={!patientId || items.every(i => !i.description) || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Receipt />}>
                    Issue Invoice
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Record Payment Dialog ─────────────────────────────────────────────────────
function PaymentDialog({ invoice, open, onClose, onSaved }:
    { invoice: Invoice | null; open: boolean; onClose: () => void; onSaved: () => void }) {
    const qc = useQueryClient();
    const outstanding = invoice ? Number(invoice.totalAmount) - Number(invoice.paidAmount) : 0;
    const [amount, setAmount] = useState(outstanding);
    const [method, setMethod] = useState('CASH');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');

    const mutation = useMutation({
        mutationFn: () => billingApi.recordPayment(invoice!.id, { amount, method, reference: reference || undefined, note: note || undefined }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['billing-dashboard'] }); onSaved(); onClose(); },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Record Payment — <Typography component="span" fontFamily="monospace" fontWeight={700}>{invoice?.invoiceNumber}</Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Outstanding: <strong>{money(outstanding)}</strong> of {money(Number(invoice?.totalAmount))}
                        <LinearProgress variant="determinate"
                            value={Math.min((Number(invoice?.paidAmount) / Number(invoice?.totalAmount)) * 100, 100)}
                            sx={{ mt: 1, height: 6, borderRadius: 3 }} />
                    </Alert>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select label="Payment Method" value={method} onChange={e => setMethod(e.target.value)}>
                            {PAYMENT_METHODS.map(m => (
                                <MenuItem key={m.value} value={m.value}>
                                    <Stack direction="row" gap={1} alignItems="center">{m.icon}<span>{m.label}</span></Stack>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField label="Amount (฿)" type="number" size="small"
                        value={amount} onChange={e => setAmount(Number(e.target.value))}
                        inputProps={{ max: outstanding }} fullWidth />
                    <TextField label="Reference / Receipt No." size="small"
                        value={reference} onChange={e => setReference(e.target.value)} fullWidth />
                    <TextField label="Note" size="small"
                        value={note} onChange={e => setNote(e.target.value)} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" color="success"
                    disabled={amount <= 0 || amount > outstanding + 0.01 || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}>
                    Confirm {money(amount)}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Invoice Detail View ───────────────────────────────────────────────────────
function InvoiceDetailPanel({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
    const qc = useQueryClient();
    const [showPayment, setShowPayment] = useState(false);
    const [showRefund, setShowRefund] = useState(false);
    const [refundAmt, setRefundAmt] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [refundToCredit, setRefundToCredit] = useState(false);

    const { data: inv, isLoading } = useQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: () => billingApi.getInvoice(invoiceId),
    });

    const voidMutation = useMutation({
        mutationFn: () => billingApi.voidInvoice(invoiceId, 'Voided by manager'),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
    });

    const refundMutation = useMutation({
        mutationFn: () => billingApi.issueRefund(invoiceId, { amount: refundAmt, reason: refundReason, refundToCredit }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', invoiceId] }); qc.invalidateQueries({ queryKey: ['invoices'] }); setShowRefund(false); },
    });

    if (isLoading) return <Box sx={{ p: 4 }}><Skeleton height={400} /></Box>;
    if (!inv) return null;

    const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
    const paidPct = Math.min((Number(inv.paidAmount) / Number(inv.totalAmount)) * 100, 100);

    return (
        <Box>
            <Stack direction="row" alignItems="center" gap={2} mb={3}>
                <Button size="small" onClick={onBack} color="inherit">← Back</Button>
                <Typography variant="h6" fontWeight={700} fontFamily="monospace">{inv.invoiceNumber}</Typography>
                <Chip label={STATUS_CONFIG[inv.status]?.label} color={STATUS_CONFIG[inv.status]?.chipColor} size="small" sx={{ fontWeight: 700 }} />
                <Box flex={1} />
                {['ISSUED', 'PARTIAL'].includes(inv.status) && (
                    <Button id="btn-record-payment" variant="contained" size="small" startIcon={<Payments />} onClick={() => setShowPayment(true)}>
                        Record Payment
                    </Button>
                )}
                {['PAID', 'PARTIAL'].includes(inv.status) && (
                    <Button variant="outlined" color="error" size="small" onClick={() => setShowRefund(true)}>Refund</Button>
                )}
                {inv.status === 'ISSUED' && Number(inv.paidAmount) === 0 && (
                    <Button variant="outlined" color="error" size="small" disabled={voidMutation.isPending}
                        onClick={() => voidMutation.mutate()}>
                        {voidMutation.isPending ? <CircularProgress size={16} /> : 'Void'}
                    </Button>
                )}
            </Stack>

            <Grid container spacing={3}>
                {/* Patient + summary */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                        <Typography variant="subtitle2" color="text.secondary" mb={1}>Patient</Typography>
                        <Typography variant="h6" fontWeight={700}>{patName(inv.patient)}</Typography>
                        <Typography variant="body2" color="text.secondary">{inv.patient?.patientCode}</Typography>
                        <Typography variant="body2" color="text.secondary">{inv.patient?.phone}</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" color="text.secondary">Issued: {fmt(inv.issuedAt)}</Typography>
                        {inv.paidAt && <><br /><Typography variant="caption" color="text.secondary">Paid: {fmt(inv.paidAt)}</Typography></>}
                        {inv.voidReason && <Alert severity="error" sx={{ mt: 1, borderRadius: 2, py: 0 }}>{inv.voidReason}</Alert>}
                    </Paper>
                </Grid>

                {/* Totals */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                        <Stack gap={0.75}>
                            {[
                                { label: 'Subtotal', value: money(inv.subtotal) },
                                { label: 'Discount', value: `-${money(inv.discountAmount)}`, color: 'error.main' },
                                { label: `Service Charge (${inv.serviceChargePct}%)`, value: money(inv.serviceChargeAmt) },
                                { label: `VAT (${inv.taxRate}%)`, value: money(inv.taxAmount) },
                            ].map(r => (
                                <Stack key={r.label} direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                                    <Typography variant="body2" sx={{ color: r.color }}>{r.value}</Typography>
                                </Stack>
                            ))}
                            <Divider sx={{ my: 0.5 }} />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="subtitle1" fontWeight={800}>Total</Typography>
                                <Typography variant="subtitle1" fontWeight={800} color="primary.main">{money(inv.totalAmount)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="success.main">Paid</Typography>
                                <Typography variant="body2" color="success.main">{money(inv.paidAmount)}</Typography>
                            </Stack>
                            {outstanding > 0.01 && (
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="error.main" fontWeight={700}>Outstanding</Typography>
                                    <Typography variant="body2" color="error.main" fontWeight={700}>{money(outstanding)}</Typography>
                                </Stack>
                            )}
                            <LinearProgress variant="determinate" value={paidPct}
                                color={paidPct >= 100 ? 'success' : paidPct > 50 ? 'warning' : 'error'}
                                sx={{ height: 8, borderRadius: 4, mt: 1 }} />
                        </Stack>
                    </Paper>
                </Grid>

                {/* Line items */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Line Items</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Description</TableCell>
                                        <TableCell align="right">Qty</TableCell>
                                        <TableCell align="right">Unit Price</TableCell>
                                        <TableCell align="right">Disc</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(inv.items ?? []).map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell align="right">{item.quantity}</TableCell>
                                            <TableCell align="right">{money(item.unitPrice)}</TableCell>
                                            <TableCell align="right">
                                                {item.discountPct > 0 ? `${item.discountPct}%` :
                                                    item.discountAmt > 0 ? `-${money(item.discountAmt)}` : '—'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(item.lineTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Payments */}
                {(inv.payments ?? []).length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Payment History</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Method</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Reference</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Refunds</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(inv.payments ?? []).map(pmt => (
                                            <TableRow key={pmt.id}>
                                                <TableCell>
                                                    <Chip label={pmt.method.replace('_', ' ')} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{money(pmt.amount)}</TableCell>
                                                <TableCell><Typography variant="caption">{pmt.reference ?? '—'}</Typography></TableCell>
                                                <TableCell><Typography variant="caption">{fmt(pmt.processedAt)}</Typography></TableCell>
                                                <TableCell>
                                                    {(pmt.refunds ?? []).length > 0
                                                        ? <Chip size="small" color="error" label={`-${money(pmt.refunds.reduce((s, r) => s + r.amount, 0))}`} />
                                                        : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                )}

                {/* Instalment plan */}
                {inv.instalmentPlan && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                                <HourglassTop color="warning" />
                                <Typography variant="subtitle2" fontWeight={700}>Instalment Plan ({inv.instalmentPlan.instalments} payments)</Typography>
                                <Chip label={inv.instalmentPlan.status} size="small" color="warning" />
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>Due Date</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(inv.instalmentPlan.payments ?? []).map((p, i) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{i + 1}</TableCell>
                                                <TableCell>{fmt(p.dueDate)}</TableCell>
                                                <TableCell align="right">{money(p.amount)}</TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={p.status}
                                                        color={p.status === 'PAID' ? 'success' : p.status === 'OVERDUE' ? 'error' : 'default'} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Record Payment Dialog */}
            <PaymentDialog invoice={inv} open={showPayment} onClose={() => setShowPayment(false)}
                onSaved={() => qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })} />

            {/* Refund Dialog */}
            <Dialog open={showRefund} onClose={() => setShowRefund(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Issue Refund</DialogTitle>
                <DialogContent dividers>
                    <Stack gap={2}>
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                            Total paid: {money(inv.paidAmount)}. Max refundable.
                        </Alert>
                        <TextField label="Refund Amount (฿)" type="number" size="small" fullWidth
                            value={refundAmt} onChange={e => setRefundAmt(Number(e.target.value))} />
                        <TextField label="Reason *" size="small" fullWidth
                            value={refundReason} onChange={e => setRefundReason(e.target.value)} />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Refund Destination</InputLabel>
                            <Select label="Refund Destination" value={refundToCredit ? 'credit' : 'cash'}
                                onChange={e => setRefundToCredit(e.target.value === 'credit')}>
                                <MenuItem value="cash">Cash / Original Payment Method</MenuItem>
                                <MenuItem value="credit">Patient Credit Balance</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowRefund(false)} color="inherit">Cancel</Button>
                    <Button variant="contained" color="error"
                        disabled={refundAmt <= 0 || !refundReason || refundMutation.isPending}
                        onClick={() => refundMutation.mutate()}
                        startIcon={refundMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Cancel />}>
                        Issue Refund
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─── Main Billing Page ─────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'invoices' | 'commissions';

export function BillingPage() {
    const qc = useQueryClient();
    const theme = useTheme();
    const [tab, setTab] = useState<TabKey>('dashboard');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data: dashboard, isLoading: dashLoading } = useQuery({
        queryKey: ['billing-dashboard'],
        queryFn: () => billingApi.getDashboard(),
    });

    const { data: invoiceData, isLoading: invLoading } = useQuery({
        queryKey: ['invoices', statusFilter],
        queryFn: () => billingApi.listInvoices({ status: statusFilter || undefined }),
        enabled: tab === 'invoices',
    });

    const { data: commissions, isLoading: commLoading } = useQuery({
        queryKey: ['commissions'],
        queryFn: () => billingApi.listCommissions(),
        enabled: tab === 'commissions',
    });

    const markPaid = useMutation({
        mutationFn: (id: string) => billingApi.markCommissionPaid(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
    });

    // ── Invoice Detail view ──
    if (selectedId) {
        return <Box sx={{ p: 3 }}>
            <InvoiceDetailPanel invoiceId={selectedId} onBack={() => setSelectedId(null)} />
        </Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Billing & Finance</Typography>
                    <Typography variant="body2" color="text.secondary">Invoices, payments, refunds & commissions</Typography>
                </Box>
                <Button id="btn-create-invoice" variant="contained" startIcon={<Add />} onClick={() => setShowCreate(true)}>
                    New Invoice
                </Button>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab id="tab-billing-dashboard" label="Dashboard" value="dashboard" />
                <Tab id="tab-billing-invoices" label="Invoices" value="invoices" />
                <Tab id="tab-billing-commissions" label="Commissions" value="commissions" />
            </Tabs>

            {/* ──── DASHBOARD ──── */}
            {tab === 'dashboard' && (
                <Grid container spacing={3}>
                    {/* KPI row */}
                    {[
                        { id: 'kpi-revenue', icon: <AttachMoney />, label: 'Monthly Revenue', value: money(dashboard?.revenue?.total), color: '#34D399', sub: 'Paid invoices this month' },
                        { id: 'kpi-invoices', icon: <Receipt />, label: 'Invoices', value: dashboard?.invoices?.total ?? 0, color: '#38BDF8', sub: 'This month' },
                        { id: 'kpi-outstanding', icon: <Warning />, label: 'Outstanding', value: dashboard?.invoices?.outstanding ?? 0, color: '#FBBF24', sub: 'Awaiting payment' },
                        { id: 'kpi-comm-pending', icon: <TrendingUp />, label: 'Commissions Due', value: money(dashboard?.commissions?.pending), color: '#C084FC', sub: 'Unpaid to staff' },
                    ].map(({ id, icon, label, value, color, sub }) => (
                        <Grid key={id} item xs={6} sm={3}>
                            <Card id={id} sx={{
                                borderRadius: 3, height: '100%',
                                background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${theme.palette.background.paper})`,
                                border: '1px solid', borderColor: 'divider',
                            }}>
                                <CardContent sx={{ pb: '16px !important' }}>
                                    <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                                    {dashLoading ? <Skeleton width={80} height={44} /> : (
                                        <Typography variant={typeof value === 'string' ? 'h5' : 'h4'} fontWeight={800}>{value}</Typography>
                                    )}
                                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {/* Invoice status breakdown */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Invoice Breakdown</Typography>
                            {dashLoading ? <Skeleton height={120} /> : (
                                <Stack gap={1.5}>
                                    {[
                                        { label: 'Paid', value: dashboard?.invoices?.paid ?? 0, color: '#34D399' },
                                        { label: 'Partial', value: dashboard?.invoices?.partial ?? 0, color: '#FBBF24' },
                                        { label: 'Outstanding', value: dashboard?.invoices?.outstanding ?? 0, color: '#F87171' },
                                    ].map(s => (
                                        <Stack key={s.label} gap={0.5}>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2">{s.label}</Typography>
                                                <Typography variant="body2" fontWeight={700}>{s.value}</Typography>
                                            </Stack>
                                            <LinearProgress variant="determinate"
                                                value={dashboard?.invoices?.total ? (s.value / dashboard.invoices.total) * 100 : 0}
                                                sx={{
                                                    height: 8, borderRadius: 4, bgcolor: alpha(s.color, 0.15),
                                                    '& .MuiLinearProgress-bar': { bgcolor: s.color }
                                                }} />
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Paper>
                    </Grid>

                    {/* Commission summary */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Commission Summary</Typography>
                            {dashLoading ? <Skeleton height={120} /> : (
                                <Stack gap={2}>
                                    <Stack direction="row" justifyContent="space-between" p={2}
                                        sx={{ bgcolor: alpha('#C084FC', 0.08), borderRadius: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Pending Payout</Typography>
                                            <Typography variant="h5" fontWeight={800} color="#C084FC">
                                                {money(dashboard?.commissions?.pending)}
                                            </Typography>
                                        </Box>
                                        <Box textAlign="right">
                                            <Typography variant="caption" color="text.secondary">Paid This Month</Typography>
                                            <Typography variant="h5" fontWeight={800} color="success.main">
                                                {money(dashboard?.commissions?.paid)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Button size="small" startIcon={<TrendingUp />} onClick={() => setTab('commissions')}>
                                        View All Commissions
                                    </Button>
                                </Stack>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──── INVOICES ──── */}
            {tab === 'invoices' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" gap={2} mb={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Status</InputLabel>
                            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                    <MenuItem key={v} value={v}>{c.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Tooltip title="Refresh">
                            <IconButton onClick={() => qc.invalidateQueries({ queryKey: ['invoices'] })}><Refresh /></IconButton>
                        </Tooltip>
                    </Stack>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Invoice #</TableCell>
                                    <TableCell>Patient</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Paid</TableCell>
                                    <TableCell align="right">Outstanding</TableCell>
                                    <TableCell>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invLoading ? Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}</TableRow>
                                )) : (invoiceData?.data ?? []).map((inv: Invoice) => {
                                    const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
                                    return (
                                        <TableRow key={inv.id} id={`inv-row-${inv.id}`} hover
                                            onClick={() => setSelectedId(inv.id)}
                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="primary.main">
                                                    {inv.invoiceNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{patName(inv.patient)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{inv.patient?.patientCode}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={STATUS_CONFIG[inv.status]?.label} size="small"
                                                    color={STATUS_CONFIG[inv.status]?.chipColor} sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                            <TableCell align="right"><Typography fontWeight={600}>{money(inv.totalAmount)}</Typography></TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main' }}>{money(inv.paidAmount)}</TableCell>
                                            <TableCell align="right" sx={{ color: outstanding > 0.01 ? 'error.main' : 'text.secondary', fontWeight: outstanding > 0.01 ? 700 : 400 }}>
                                                {money(outstanding)}
                                            </TableCell>
                                            <TableCell><Typography variant="caption" color="text.secondary">{fmt(inv.createdAt)}</Typography></TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!invLoading && (!invoiceData?.data || invoiceData.data.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No invoices found</Typography>
                                            <Button size="small" sx={{ mt: 1 }} startIcon={<Add />} onClick={() => setShowCreate(true)}>
                                                Create First Invoice
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──── COMMISSIONS ──── */}
            {tab === 'commissions' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Commission Records</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Practitioner</TableCell>
                                    <TableCell>Invoice</TableCell>
                                    <TableCell>Revenue</TableCell>
                                    <TableCell>Rate</TableCell>
                                    <TableCell align="right">Commission</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Period</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {commLoading ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}</TableRow>
                                )) : (commissions as any[] ?? []).map((c: any) => (
                                    <TableRow key={c.id} hover>
                                        <TableCell><Typography variant="body2">{c.practitionerId}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace" color="primary.main">
                                                {c.invoice?.invoiceNumber}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{money(c.invoice?.totalAmount)}</TableCell>
                                        <TableCell>{(Number(c.rate) * 100).toFixed(1)}%</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                            {money(c.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={c.isPaid ? 'Paid' : 'Pending'}
                                                color={c.isPaid ? 'success' : 'warning'} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {fmt(c.periodStart)} – {fmt(c.periodEnd)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {!c.isPaid && (
                                                <Button size="small" variant="outlined" color="success"
                                                    disabled={markPaid.isPending}
                                                    onClick={() => markPaid.mutate(c.id)}>
                                                    Mark Paid
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!commLoading && (!commissions || (commissions as any[]).length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No commission records yet</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Create Invoice Dialog */}
            <CreateInvoiceDialog open={showCreate} onClose={() => setShowCreate(false)}
                onSaved={(id) => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['invoices'] }); setSelectedId(id); }} />
        </Box>
    );
}
