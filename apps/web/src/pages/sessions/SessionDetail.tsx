import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Divider, Tab, Tabs,
    TextField, Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
    AlertTitle, Skeleton, Tooltip, Badge, CircularProgress,
} from '@mui/material';
import {
    Lock, LockOpen, Add, Warning, CheckCircle, ArrowBack,
    Edit, MedicalServices, ReceiptLong, Timeline, BugReport,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { sessionsApi, type TreatmentLine } from '../../lib/sessions-api';

// ─── Treatment Line Row Form ──────────────────────────────────────────────────
function AddTreatmentLineDialog({
    open,
    onClose,
    onAdd,
    isAdding,
}: {
    open: boolean;
    onClose: () => void;
    onAdd: (line: {
        productName: string;
        quantityUsed: number;
        unit: string;
        bodyZone: string;
        price: number;
        notes: string;
    }) => void;
    isAdding: boolean;
}) {
    const [form, setForm] = useState({
        productName: '', quantityUsed: 1, unit: 'units',
        bodyZone: '', price: 0, notes: '',
    });

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Treatment / Product</DialogTitle>
            <DialogContent>
                <Stack gap={2} mt={1}>
                    <TextField
                        id="tl-productName"
                        label="Product / Service Name *"
                        value={form.productName}
                        onChange={set('productName')}
                        fullWidth
                        size="small"
                        autoFocus
                    />
                    <Stack direction="row" gap={2}>
                        <TextField
                            id="tl-quantity"
                            label="Quantity *"
                            type="number"
                            value={form.quantityUsed}
                            onChange={(e) => setForm((f) => ({ ...f, quantityUsed: parseFloat(e.target.value) || 0 }))}
                            size="small"
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            id="tl-unit"
                            label="Unit"
                            value={form.unit}
                            onChange={set('unit')}
                            size="small"
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    <Stack direction="row" gap={2}>
                        <TextField
                            id="tl-bodyZone"
                            label="Body Zone"
                            value={form.bodyZone}
                            onChange={set('bodyZone')}
                            size="small"
                            sx={{ flex: 1 }}
                            placeholder="e.g. forehead, upper lip"
                        />
                        <TextField
                            id="tl-price"
                            label="Price (THB) *"
                            type="number"
                            value={form.price}
                            onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                            size="small"
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    <TextField
                        id="tl-notes"
                        label="Notes"
                        value={form.notes}
                        onChange={set('notes')}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    id="btn-tl-add-confirm"
                    variant="contained"
                    disabled={!form.productName || form.quantityUsed <= 0 || isAdding}
                    onClick={() => onAdd(form)}
                    startIcon={isAdding ? <CircularProgress size={16} color="inherit" /> : <Add />}
                >
                    Add Line
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Contraindication Override Dialog ─────────────────────────────────────────
function OverrideDialog({
    open,
    alert,
    onClose,
    onOverride,
}: {
    open: boolean;
    alert: string;
    onClose: () => void;
    onOverride: (reason: string) => void;
}) {
    const [reason, setReason] = useState('');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning color="warning" /> Contraindication Override
            </DialogTitle>
            <DialogContent>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <AlertTitle>Alert Detected</AlertTitle>
                    {alert}
                </Alert>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Doctor Override Required</strong> — This action will be permanently logged in the audit trail with your name and timestamp.
                </Alert>
                <TextField
                    id="override-reason"
                    label="Override Reason (minimum 10 characters) *"
                    fullWidth
                    multiline
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    error={reason.length > 0 && reason.length < 10}
                    helperText={reason.length > 0 && reason.length < 10 ? `Need ${10 - reason.length} more characters` : undefined}
                    placeholder="Describe the clinical justification for proceeding despite this contraindication…"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    id="btn-override-confirm"
                    variant="contained"
                    color="warning"
                    disabled={reason.trim().length < 10}
                    onClick={() => onOverride(reason)}
                >
                    Override & Proceed
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Addendum Dialog ──────────────────────────────────────────────────────────
function AddendumDialog({ open, onClose, onSubmit, isSubmitting }: {
    open: boolean; onClose: () => void;
    onSubmit: (content: string) => void;
    isSubmitting: boolean;
}) {
    const [content, setContent] = useState('');
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Addendum</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Addenda are appended to the locked session and cannot be deleted. They appear in the audit trail.
                </Alert>
                <TextField
                    id="addendum-content"
                    label="Addendum Content *"
                    fullWidth
                    multiline
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    autoFocus
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    id="btn-addendum-submit"
                    variant="contained"
                    disabled={!content.trim() || isSubmitting}
                    onClick={() => onSubmit(content)}
                    startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    Save Addendum
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main EMR Session Page ────────────────────────────────────────────────────
type TabKey = 'soap' | 'lines' | 'addenda' | 'audit';

export function SessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabKey>('soap');
    const [soapForm, setSoapForm] = useState({
        chiefComplaint: '', subjective: '', objective: '', assessment: '', plan: '',
    });
    const [soapDirty, setSoapDirty] = useState(false);
    const [showAddLine, setShowAddLine] = useState(false);
    const [showAddendum, setShowAddendum] = useState(false);
    const [contraAlert, setContraAlert] = useState('');
    const [showOverride, setShowOverride] = useState(false);
    const [pendingLine, setPendingLine] = useState<any>(null);

    const { data: session, isLoading } = useQuery({
        queryKey: ['session', id],
        queryFn: () => sessionsApi.findOne(id!),
        enabled: !!id,
        onSuccess: (s) => {
            setSoapForm({
                chiefComplaint: s.chiefComplaint ?? '',
                subjective: s.subjective ?? '',
                objective: s.objective ?? '',
                assessment: s.assessment ?? '',
                plan: s.plan ?? '',
            });
        },
    } as any);

    const invalidate = () => qc.invalidateQueries({ queryKey: ['session', id] });

    const saveSoapMutation = useMutation({
        mutationFn: () => sessionsApi.update(id!, soapForm),
        onSuccess: () => { invalidate(); setSoapDirty(false); },
    });

    const addLineMutation = useMutation({
        mutationFn: (line: any) => sessionsApi.addTreatmentLine(id!, line),
        onSuccess: () => { invalidate(); setShowAddLine(false); },
        onError: (err: any) => {
            if (err?.response?.data?.code === 'CONTRAINDICATION_ALERT') {
                const alerts: string[] = err.response.data.alerts ?? ['Contraindication detected'];
                setContraAlert(alerts[0]);
                setPendingLine(addLineMutation.variables);
                setShowOverride(true);
            }
        },
    });

    const overrideMutation = useMutation({
        mutationFn: ({ lineId, reason }: { lineId: string; reason: string }) =>
            sessionsApi.overrideContraindication(id!, lineId, reason),
        onSuccess: () => { setShowOverride(false); setPendingLine(null); setContraAlert(''); invalidate(); },
    });

    const signMutation = useMutation({
        mutationFn: () => sessionsApi.signAndLock(id!),
        onSuccess: () => invalidate(),
    });

    const addendumMutation = useMutation({
        mutationFn: (content: string) => sessionsApi.addAddendum(id!, content),
        onSuccess: () => { setShowAddendum(false); invalidate(); },
    });

    const { data: auditLog } = useQuery({
        queryKey: ['session-audit', id],
        queryFn: () => sessionsApi.getAuditLog(id!),
        enabled: tab === 'audit' && !!id,
    });

    const setSoap = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSoapForm((f) => ({ ...f, [field]: e.target.value }));
        setSoapDirty(true);
    };

    const fmt = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const totalAmount = session?.treatmentLines.reduce((a, l) => a + (l.price * l.quantityUsed), 0) ?? 0;

    if (isLoading) {
        return <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} /></Box>;
    }

    if (!session) {
        return <Box sx={{ p: 3 }}><Alert severity="error">Session not found.</Alert></Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* ── Header ── */}
            <Stack direction="row" alignItems="start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Button id="btn-back-session" startIcon={<ArrowBack />} onClick={() => navigate(`/patients/${session.patientId}`)} color="inherit" sx={{ mb: 0.5 }}>
                        {session.patient.firstName} {session.patient.lastName}
                    </Button>
                    <Typography variant="h5" fontWeight={700}>
                        Clinical Session
                    </Typography>
                    <Stack direction="row" gap={1} mt={0.5} flexWrap="wrap">
                        <Typography variant="body2" color="text.secondary">{fmt(session.visitDate)}</Typography>
                        <Typography variant="body2" color="text.secondary">·</Typography>
                        <Typography variant="body2" color="text.secondary">{session.branch.name}</Typography>
                        <Chip
                            label={session.isLocked ? 'LOCKED' : session.status}
                            color={session.isLocked ? 'error' : session.status === 'COMPLETED' ? 'success' : 'info'}
                            size="small"
                            icon={session.isLocked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                            sx={{ fontWeight: 700 }}
                        />
                    </Stack>
                </Box>

                <Stack direction="row" gap={1} alignItems="center">
                    {/* Allergy alerts */}
                    {session.patient.allergies.length > 0 && (
                        <Tooltip title={`Allergies: ${session.patient.allergies.map((a) => a.allergen).join(', ')}`}>
                            <Chip
                                label={`${session.patient.allergies.length} Allergy Alert${session.patient.allergies.length > 1 ? 's' : ''}`}
                                color="error"
                                icon={<Warning fontSize="small" />}
                                sx={{ fontWeight: 700 }}
                            />
                        </Tooltip>
                    )}

                    {/* Add addendum (always allowed) */}
                    <Button
                        id="btn-add-addendum"
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => setShowAddendum(true)}
                    >
                        Addendum
                    </Button>

                    {/* Doctor sign & lock */}
                    {!session.isLocked && (
                        <Button
                            id="btn-sign-lock"
                            variant="contained"
                            color="success"
                            startIcon={signMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Lock />}
                            onClick={() => signMutation.mutate()}
                            disabled={signMutation.isPending || !session.treatmentLines.length}
                        >
                            Sign & Lock Session
                        </Button>
                    )}

                    {session.isLocked && session.doctorSignedBy && (
                        <Chip
                            label={`Signed by Dr. ${session.doctorSignedBy.firstName} ${session.doctorSignedBy.lastName} · ${fmt(session.doctorSignedAt)}`}
                            color="success"
                            icon={<CheckCircle fontSize="small" />}
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Stack>
            </Stack>

            {/* ── Tabs ── */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab id="tab-soap" label="SOAP Notes" value="soap" icon={<MedicalServices />} iconPosition="start" />
                <Tab
                    id="tab-lines"
                    label={
                        <Badge badgeContent={session.treatmentLines.length} color="primary">
                            <Box sx={{ pr: 1 }}>Treatment Lines</Box>
                        </Badge>
                    }
                    value="lines"
                    icon={<ReceiptLong />}
                    iconPosition="start"
                />
                <Tab
                    id="tab-addenda"
                    label={
                        <Badge badgeContent={session.addenda.length} color="secondary">
                            <Box sx={{ pr: 1 }}>Addenda</Box>
                        </Badge>
                    }
                    value="addenda"
                    icon={<Edit />}
                    iconPosition="start"
                />
                <Tab id="tab-audit" label="Audit Log" value="audit" icon={<BugReport />} iconPosition="start" />
            </Tabs>

            {/* ── SOAP Notes Tab ── */}
            {tab === 'soap' && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight={700}>SOAP Notes</Typography>
                                {soapDirty && !session.isLocked && (
                                    <Button
                                        id="btn-save-soap"
                                        variant="contained"
                                        size="small"
                                        onClick={() => saveSoapMutation.mutate()}
                                        disabled={saveSoapMutation.isPending}
                                        startIcon={saveSoapMutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
                                    >
                                        Save Draft
                                    </Button>
                                )}
                            </Stack>

                            {session.isLocked && (
                                <Alert severity="warning" icon={<Lock />} sx={{ mb: 2 }}>
                                    This session is locked. Use addenda to add notes.
                                </Alert>
                            )}

                            <Stack gap={2}>
                                <TextField
                                    id="soap-chiefComplaint"
                                    label="Chief Complaint"
                                    value={soapForm.chiefComplaint}
                                    onChange={setSoap('chiefComplaint')}
                                    fullWidth size="small"
                                    disabled={session.isLocked}
                                />
                                {[
                                    { key: 'subjective', label: 'S — Subjective (Patient reports…)', placeholder: 'Patient complaints, symptoms, history…' },
                                    { key: 'objective', label: 'O — Objective (Clinical findings…)', placeholder: 'Physical examination, measurements, vital signs…' },
                                    { key: 'assessment', label: 'A — Assessment (Diagnosis…)', placeholder: 'Clinical diagnosis, skin assessment, contraindication review…' },
                                    { key: 'plan', label: 'P — Plan (Treatment plan…)', placeholder: 'Treatment plan, products to use, follow-up…' },
                                ].map(({ key, label, placeholder }) => (
                                    <TextField
                                        key={key}
                                        id={`soap-${key}`}
                                        label={label}
                                        value={(soapForm as any)[key]}
                                        onChange={setSoap(key)}
                                        fullWidth
                                        multiline
                                        rows={3}
                                        disabled={session.isLocked}
                                        placeholder={placeholder}
                                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                                    />
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Patient summary sidebar */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>PATIENT</Typography>
                            <Typography variant="h6" fontWeight={700}>
                                {session.patient.firstName} {session.patient.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{session.patient.patientCode}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>{session.patient.phone}</Typography>
                        </Paper>

                        {session.patient.allergies.length > 0 && (
                            <Paper
                                sx={{
                                    p: 2.5, borderRadius: 3, mb: 2,
                                    border: '1px solid', borderColor: 'error.main',
                                    bgcolor: (t) => alpha(t.palette.error.main, 0.04),
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={700} color="error.main" mb={1.5}>
                                    ⚠️ ALLERGY ALERTS
                                </Typography>
                                <Stack gap={1}>
                                    {session.patient.allergies.map((a, i) => (
                                        <Chip key={i} label={`${a.allergen}${a.severity ? ` (${a.severity})` : ''}`} color="error" size="small" />
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {session.patient.medicalHistory.length > 0 && (
                            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>MEDICAL HISTORY</Typography>
                                <Stack gap={0.5}>
                                    {session.patient.medicalHistory.map((h, i) => (
                                        <Typography key={i} variant="body2">• {h.condition}</Typography>
                                    ))}
                                </Stack>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            )}

            {/* ── Treatment Lines Tab ── */}
            {tab === 'lines' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Treatment Lines</Typography>
                        {!session.isLocked && (
                            <Button
                                id="btn-add-treatment-line"
                                variant="contained"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => setShowAddLine(true)}
                            >
                                Add Treatment
                            </Button>
                        )}
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Product / Service</TableCell>
                                    <TableCell>Zone</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell>Unit</TableCell>
                                    <TableCell>Lot / Batch</TableCell>
                                    <TableCell align="right">Price</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell>Notes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {session.treatmentLines.map((line: TreatmentLine) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Stack>
                                                <Typography variant="body2" fontWeight={600}>{line.productName}</Typography>
                                                {line.contraindicationOverrideReason && (
                                                    <Chip
                                                        label="Override"
                                                        color="warning"
                                                        size="small"
                                                        icon={<Warning fontSize="small" />}
                                                        sx={{ mt: 0.5, alignSelf: 'flex-start' }}
                                                    />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell><Typography variant="body2">{line.bodyZone || '—'}</Typography></TableCell>
                                        <TableCell align="right"><Typography variant="body2">{line.quantityUsed}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{line.unit || '—'}</Typography></TableCell>
                                        <TableCell>
                                            {line.batch ? (
                                                <Stack>
                                                    <Typography variant="caption">{line.batch.lotNumber ?? 'N/A'}</Typography>
                                                    {line.batch.expiryDate && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Exp: {new Date(line.batch.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{line.price.toLocaleString()}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>
                                                {(line.price * line.quantityUsed).toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{line.notes || ''}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {session.treatmentLines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No treatment lines added yet</Typography>
                                            {!session.isLocked && (
                                                <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => setShowAddLine(true)}>
                                                    Add First Treatment
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {session.treatmentLines.length > 0 && (
                        <Stack direction="row" justifyContent="flex-end" mt={2} gap={2}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Total: ฿{totalAmount.toLocaleString()}
                            </Typography>
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ── Addenda Tab ── */}
            {tab === 'addenda' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Session Addenda</Typography>
                        <Button id="btn-add-addendum-tab" variant="outlined" size="small" startIcon={<Add />} onClick={() => setShowAddendum(true)}>
                            Add Addendum
                        </Button>
                    </Stack>
                    {session.addenda.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={3}>No addenda yet</Typography>
                    ) : (
                        <Stack gap={2}>
                            {session.addenda.map((a) => (
                                <Paper key={a.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                        {fmt(a.createdAt)} · {a.addedById}
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{a.content}</Typography>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ── Audit Log Tab ── */}
            {tab === 'audit' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Immutable EMR Audit Log</Typography>
                    {!auditLog ? (
                        <CircularProgress />
                    ) : (
                        <Stack gap={1}>
                            {(auditLog as any[]).map((entry: any) => (
                                <Stack
                                    key={entry.id}
                                    direction="row"
                                    gap={2}
                                    sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}
                                >
                                    <Box sx={{ minWidth: 180 }}>
                                        <Typography variant="caption" color="text.secondary">{fmt(entry.timestamp)}</Typography>
                                    </Box>
                                    <Box>
                                        <Chip label={entry.action} size="small" color={
                                            entry.action === 'SESSION_LOCKED' ? 'success' :
                                                entry.action === 'CONTRAINDICATION_OVERRIDE' ? 'warning' : 'default'
                                        } sx={{ mb: 0.5 }} />
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            User: {entry.userId}
                                        </Typography>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                                {JSON.stringify(entry.details, null, 0)}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                </Paper>
            )}

            {/* ── Dialogs ── */}
            <AddTreatmentLineDialog
                open={showAddLine}
                onClose={() => setShowAddLine(false)}
                onAdd={(line) => addLineMutation.mutate(line)}
                isAdding={addLineMutation.isPending}
            />

            <OverrideDialog
                open={showOverride}
                alert={contraAlert}
                onClose={() => { setShowOverride(false); setPendingLine(null); }}
                onOverride={(reason) => {
                    if (pendingLine?.id) {
                        overrideMutation.mutate({ lineId: pendingLine.id, reason });
                    }
                }}
            />

            <AddendumDialog
                open={showAddendum}
                onClose={() => setShowAddendum(false)}
                onSubmit={(content) => addendumMutation.mutate(content)}
                isSubmitting={addendumMutation.isPending}
            />
        </Box>
    );
}
