import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Grid, Paper, Stack, Chip, Button, Card, CardContent,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, AlertTitle, Skeleton, LinearProgress,
    CircularProgress, IconButton, Tooltip, Tab, Tabs, Divider, Badge,
} from '@mui/material';
import {
    Inventory2, Warning, LocalShipping, SwapHoriz, Add, CheckCircle,
    ErrorOutline, Schedule, TrendingDown, Refresh, Send, ExpandMore,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { inventoryApi, type InventoryStock, type PurchaseOrder } from '../../lib/inventory-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const daysUntil = (d?: string) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

const expiryColor = (days: number | null) => {
    if (days === null) return 'text.secondary';
    if (days <= 30) return 'error.main';
    if (days <= 90) return 'warning.main';
    return 'success.main';
};

const PO_STATUS_COLOR: Record<string, any> = {
    DRAFT: 'default', SUBMITTED: 'info', APPROVED: 'warning',
    RECEIVED: 'success', CANCELLED: 'error',
};

// ─── Create PO Dialog ─────────────────────────────────────────────────────────
function CreatePoDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const qc = useQueryClient();
    const [supplierId, setSupplierId] = useState('');
    const [notes, setNotes] = useState('');
    const [expectedAt, setExpectedAt] = useState('');
    const [items, setItems] = useState([{ productId: '', quantity: 1, unitCost: 0 }]);

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => inventoryApi.listSuppliers(),
    });

    const { data: products = [] } = useQuery({
        queryKey: ['inv-products'],
        queryFn: () => inventoryApi.listProducts(),
    });

    const mutation = useMutation({
        mutationFn: () => inventoryApi.createPO({
            branchId: 'current-branch', // In production, comes from auth context
            supplierId,
            notes: notes || undefined,
            expectedAt: expectedAt || undefined,
            items: items.filter(i => i.productId),
        }),
        onSuccess: () => { onSaved(); onClose(); qc.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    });

    const addItem = () => setItems(prev => [...prev, { productId: '', quantity: 1, unitCost: 0 }]);
    const updateItem = (idx: number, field: string, value: any) =>
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

    const totalAmount = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitCost)), 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2.5}>
                    <Stack direction="row" gap={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Supplier *</InputLabel>
                            <Select label="Supplier *" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                {(suppliers as any[]).map((s: any) => (
                                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Expected Delivery"
                            type="date"
                            size="small"
                            value={expectedAt}
                            onChange={e => setExpectedAt(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>
                    <TextField
                        label="Notes"
                        size="small"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        fullWidth
                    />
                    <Divider />
                    <Typography variant="subtitle2" fontWeight={700}>Line Items</Typography>
                    {items.map((item, idx) => (
                        <Stack key={idx} direction="row" gap={1.5} alignItems="center">
                            <FormControl size="small" sx={{ flex: 3 }}>
                                <InputLabel>Product</InputLabel>
                                <Select label="Product" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                                    {(products as any[]).map((p: any) => (
                                        <MenuItem key={p.id} value={p.id}>{p.name} ({p.sku})</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Qty" type="number" size="small" sx={{ flex: 1 }}
                                value={item.quantity}
                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                            />
                            <TextField
                                label="Unit Cost" type="number" size="small" sx={{ flex: 1 }}
                                value={item.unitCost}
                                onChange={e => updateItem(idx, 'unitCost', Number(e.target.value))}
                            />
                            <Typography sx={{ minWidth: 80, textAlign: 'right' }}>
                                ฿{(item.quantity * item.unitCost).toLocaleString()}
                            </Typography>
                        </Stack>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>
                        Add Line
                    </Button>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={700}>Total: ฿{totalAmount.toLocaleString()}</Typography>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!supplierId || items.every(i => !i.productId) || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <LocalShipping />}
                >
                    Create PO
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── GRN Dialog ───────────────────────────────────────────────────────────────
function GrnDialog({ po, open, onClose, onSaved }: { po: PurchaseOrder | null; open: boolean; onClose: () => void; onSaved: () => void }) {
    const qc = useQueryClient();
    const [grnItems, setGrnItems] = useState<Array<{ productId: string; quantityReceived: number; lotNumber: string; expiryDate: string; costPerUnit: number }>>([]);
    const [notes, setNotes] = useState('');

    // Initialise from PO items when opened
    const initItems = () => {
        if (po?.items) {
            setGrnItems(po.items.map(i => ({
                productId: i.productId,
                quantityReceived: i.quantity,
                lotNumber: '',
                expiryDate: '',
                costPerUnit: i.unitCost,
            })));
        }
    };

    const mutation = useMutation({
        mutationFn: () => inventoryApi.receiveGrn(po!.id, {
            notes: notes || undefined,
            items: grnItems.map(i => ({
                ...i,
                lotNumber: i.lotNumber || undefined,
                expiryDate: i.expiryDate || undefined,
            })),
        }),
        onSuccess: () => {
            onSaved();
            onClose();
            qc.invalidateQueries({ queryKey: ['purchase-orders'] });
            qc.invalidateQueries({ queryKey: ['inv-stock'] });
        },
    });

    const updateGrnItem = (idx: number, field: string, value: any) =>
        setGrnItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

    return (
        <Dialog open={open} onClose={() => { onClose(); }} maxWidth="md" fullWidth
            TransitionProps={{ onEntered: initItems }}>
            <DialogTitle>Receive Goods — PO #{po?.id?.slice(-8).toUpperCase()}</DialogTitle>
            <DialogContent dividers>
                <Stack gap={2}>
                    <TextField label="Notes" size="small" value={notes} onChange={e => setNotes(e.target.value)} fullWidth />
                    <Divider />
                    <Typography variant="subtitle2" fontWeight={700}>Items Received</Typography>
                    {grnItems.map((item, idx) => {
                        const poItem = po?.items?.[idx];
                        return (
                            <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" fontWeight={600} mb={1}>
                                    {poItem?.product?.name} ({poItem?.product?.sku})
                                </Typography>
                                <Stack direction="row" gap={1.5} flexWrap="wrap">
                                    <TextField
                                        label="Qty Received" type="number" size="small" sx={{ flex: 1, minWidth: 100 }}
                                        value={item.quantityReceived}
                                        onChange={e => updateGrnItem(idx, 'quantityReceived', Number(e.target.value))}
                                    />
                                    <TextField
                                        label="Lot Number" size="small" sx={{ flex: 1.5, minWidth: 120 }}
                                        value={item.lotNumber}
                                        onChange={e => updateGrnItem(idx, 'lotNumber', e.target.value)}
                                    />
                                    <TextField
                                        label="Expiry Date" type="date" size="small" sx={{ flex: 1.5, minWidth: 140 }}
                                        value={item.expiryDate}
                                        onChange={e => updateGrnItem(idx, 'expiryDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Cost/Unit" type="number" size="small" sx={{ flex: 1, minWidth: 100 }}
                                        value={item.costPerUnit}
                                        onChange={e => updateGrnItem(idx, 'costPerUnit', Number(e.target.value))}
                                    />
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    color="success"
                    disabled={grnItems.length === 0 || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                >
                    Confirm Receipt
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────
type TabKey = 'overview' | 'stock' | 'expiring' | 'purchase-orders' | 'alerts';

export function InventoryPage() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabKey>('overview');
    const [stockSearch, setStockSearch] = useState('');
    const [showCreatePO, setShowCreatePO] = useState(false);
    const [grnPO, setGrnPO] = useState<PurchaseOrder | null>(null);

    const { data: dashboard, isLoading: dashLoading } = useQuery({
        queryKey: ['inv-dashboard'],
        queryFn: () => inventoryApi.getDashboard(),
    });

    const { data: stockData, isLoading: stockLoading } = useQuery({
        queryKey: ['inv-stock', stockSearch],
        queryFn: () => inventoryApi.getStock({ search: stockSearch || undefined }),
        enabled: tab === 'stock' || tab === 'overview',
    });

    const { data: expiringBatches, isLoading: expiryLoading } = useQuery({
        queryKey: ['inv-expiring'],
        queryFn: () => inventoryApi.getExpiring(90),
        enabled: tab === 'expiring',
    });

    const { data: lowStockItems } = useQuery({
        queryKey: ['inv-low-stock'],
        queryFn: () => inventoryApi.getLowStock(),
        enabled: tab === 'alerts' || tab === 'overview',
    });

    const { data: purchaseOrders, isLoading: poLoading } = useQuery({
        queryKey: ['purchase-orders'],
        queryFn: () => inventoryApi.listPOs(),
        enabled: tab === 'purchase-orders',
    });

    const submitPO = useMutation({
        mutationFn: (id: string) => inventoryApi.submitPO(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
    });

    const approvePO = useMutation({
        mutationFn: (id: string) => inventoryApi.approvePO(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
    });

    return (
        <Box sx={{ p: 3 }}>
            {/* ── Header ── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Inventory & Procurement</Typography>
                    <Typography variant="body2" color="text.secondary">Stock levels, batches, purchase orders & transfers</Typography>
                </Box>
                <Button
                    id="btn-create-po"
                    variant="contained"
                    startIcon={<LocalShipping />}
                    onClick={() => setShowCreatePO(true)}
                >
                    New Purchase Order
                </Button>
            </Stack>

            {/* ── Tabs ── */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab id="tab-inv-overview" label="Overview" value="overview" />
                <Tab id="tab-inv-stock" label="Stock Levels" value="stock" />
                <Tab
                    id="tab-inv-expiring"
                    label={
                        <Badge badgeContent={dashboard?.expiry?.within30Days} color="error">
                            <Box sx={{ pr: 0.5 }}>Expiring</Box>
                        </Badge>
                    }
                    value="expiring"
                />
                <Tab id="tab-inv-po" label="Purchase Orders" value="purchase-orders" />
                <Tab
                    id="tab-inv-alerts"
                    label={
                        <Badge badgeContent={dashboard?.totals?.lowStock} color="warning">
                            <Box sx={{ pr: 0.5 }}>Alerts</Box>
                        </Badge>
                    }
                    value="alerts"
                />
            </Tabs>

            {/* ──────────── OVERVIEW ──────────── */}
            {tab === 'overview' && (
                <Grid container spacing={3}>
                    {/* KPI strip */}
                    {[
                        { id: 'kpi-products', icon: <Inventory2 />, label: 'Products', value: dashboard?.totals?.products, color: '#6C63FF', sub: 'Active SKUs' },
                        { id: 'kpi-batches', icon: <Schedule />, label: 'Live Batches', value: dashboard?.totals?.batches, color: '#2DD4BF', sub: 'On-hand > 0' },
                        { id: 'kpi-low', icon: <TrendingDown />, label: 'Low Stock', value: dashboard?.totals?.lowStock, color: '#F87171', sub: 'Below minimum' },
                        { id: 'kpi-expiring', icon: <Warning />, label: 'Expiring ≤30d', value: dashboard?.expiry?.within30Days, color: '#FBBF24', sub: 'Needs attention' },
                        { id: 'kpi-po', icon: <LocalShipping />, label: 'Pending POs', value: dashboard?.orders?.pendingPOs, color: '#38BDF8', sub: 'Awaiting action' },
                    ].map(({ id, icon, label, value, color, sub }) => (
                        <Grid key={id} item xs={6} sm={4} md={2.4}>
                            <Card
                                id={id}
                                sx={{
                                    borderRadius: 3, height: '100%',
                                    background: t => `linear-gradient(135deg, ${alpha(color, 0.12)}, ${t.palette.background.paper})`,
                                    border: '1px solid', borderColor: 'divider',
                                }}
                            >
                                <CardContent sx={{ pb: '16px !important' }}>
                                    <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                                    {dashLoading ? <Skeleton width={60} height={40} /> : (
                                        <Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography>
                                    )}
                                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {/* Recent transactions */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Recent Transactions</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell>Date</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dashLoading ? Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => (
                                                <TableCell key={j}><Skeleton /></TableCell>
                                            ))}</TableRow>
                                        )) : (dashboard?.recentTransactions ?? []).map((tx: any) => (
                                            <TableRow key={tx.id} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={tx.type}
                                                        size="small"
                                                        color={tx.type === 'USAGE' ? 'error' : tx.type === 'RECEIPT' ? 'success' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{tx.batch?.product?.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{tx.batch?.product?.sku}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600}
                                                        sx={{ color: tx.quantity < 0 ? 'error.main' : 'success.main' }}>
                                                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">{fmt(tx.createdAt)}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>

                    {/* Low stock quick view */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Low Stock Items</Typography>
                            <Stack gap={1.5}>
                                {(!lowStockItems || (lowStockItems as any[]).length === 0) ? (
                                    <Alert severity="success" sx={{ borderRadius: 2 }}>All stock levels healthy ✓</Alert>
                                ) : (lowStockItems as any[]).slice(0, 6).map((item: any) => (
                                    <Stack key={item.id} direction="row" alignItems="center" gap={1}>
                                        <ErrorOutline color="error" fontSize="small" />
                                        <Box flex={1}>
                                            <Typography variant="body2" fontWeight={600}>{item.product?.name}</Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((Number(item.quantityOnHand) / (item.product?.minStockLevel || 1)) * 100, 100)}
                                                color="error"
                                                sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="error.main" fontWeight={700}>
                                            {Number(item.quantityOnHand)}/{item.product?.minStockLevel}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ──────────── STOCK LEVELS ──────────── */}
            {tab === 'stock' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" gap={2} mb={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            placeholder="Search products…"
                            size="small"
                            value={stockSearch}
                            onChange={e => setStockSearch(e.target.value)}
                            sx={{ minWidth: 240 }}
                        />
                        <Tooltip title="Refresh">
                            <IconButton onClick={() => qc.invalidateQueries({ queryKey: ['inv-stock'] })}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Product</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell align="right">On Hand</TableCell>
                                    <TableCell align="right">Min Level</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stockLoading ? Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}</TableRow>
                                )) : (stockData?.data ?? []).map((s: InventoryStock) => (
                                    <TableRow key={s.id} id={`stock-row-${s.id}`} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{s.product?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" fontFamily="monospace">{s.product?.sku}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{s.branch?.name}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={700}
                                                sx={{ color: s.isLow ? 'error.main' : 'text.primary' }}>
                                                {Number(s.quantityOnHand)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {s.product?.minStockLevel}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {s.isLow ? (
                                                <Chip icon={<TrendingDown />} label="Low Stock" color="error" size="small" />
                                            ) : (
                                                <Chip icon={<CheckCircle />} label="OK" color="success" size="small" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──────────── EXPIRING ──────────── */}
            {tab === 'expiring' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={2}>Batches Expiring within 90 Days</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Product</TableCell>
                                    <TableCell>Lot Number</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell align="right">On Hand</TableCell>
                                    <TableCell>Expiry Date</TableCell>
                                    <TableCell>Days Left</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expiryLoading ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}</TableRow>
                                )) : (expiringBatches ?? []).map((b: any) => {
                                    const days = daysUntil(b.expiryDate);
                                    return (
                                        <TableRow key={b.id} hover
                                            sx={{ bgcolor: days !== null && days <= 30 ? alpha('#F87171', 0.06) : 'inherit' }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{b.product?.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{b.product?.sku}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{b.lotNumber ?? '—'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{b.branchId}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={700}>{Number(b.quantityOnHand)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{fmt(b.expiryDate)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} sx={{ color: expiryColor(days) }}>
                                                    {days !== null ? `${days}d` : '—'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!expiryLoading && (!expiringBatches || (expiringBatches as any[]).length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                            <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                                            <Typography>No batches expiring within 90 days 🎉</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──────────── PURCHASE ORDERS ──────────── */}
            {tab === 'purchase-orders' && (
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Purchase Orders</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setShowCreatePO(true)}>
                            New PO
                        </Button>
                    </Stack>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>PO Reference</TableCell>
                                    <TableCell>Supplier</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Expected</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {poLoading ? Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}</TableRow>
                                )) : (purchaseOrders as PurchaseOrder[] ?? []).map(po => (
                                    <TableRow key={po.id} id={`po-row-${po.id}`} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                                                #{po.id.slice(-8).toUpperCase()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">{fmt(po.createdAt)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{po.supplier?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{po.branch?.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={po.status}
                                                size="small"
                                                color={PO_STATUS_COLOR[po.status] ?? 'default'}
                                                sx={{ fontWeight: 700 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{fmt(po.expectedAt)}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>
                                                ฿{Number(po.totalAmount).toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" gap={0.5} justifyContent="flex-end">
                                                {po.status === 'DRAFT' && (
                                                    <Tooltip title="Submit for approval">
                                                        <IconButton
                                                            id={`btn-submit-po-${po.id}`}
                                                            size="small"
                                                            color="info"
                                                            onClick={() => submitPO.mutate(po.id)}
                                                            disabled={submitPO.isPending}
                                                        >
                                                            <Send fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {po.status === 'SUBMITTED' && (
                                                    <Tooltip title="Approve PO">
                                                        <IconButton
                                                            id={`btn-approve-po-${po.id}`}
                                                            size="small"
                                                            color="success"
                                                            onClick={() => approvePO.mutate(po.id)}
                                                            disabled={approvePO.isPending}
                                                        >
                                                            <CheckCircle fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {po.status === 'APPROVED' && (
                                                    <Tooltip title="Receive goods (GRN)">
                                                        <IconButton
                                                            id={`btn-grn-po-${po.id}`}
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => setGrnPO(po)}
                                                        >
                                                            <Inventory2 fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!poLoading && (!purchaseOrders || (purchaseOrders as any[]).length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">No purchase orders yet</Typography>
                                            <Button size="small" sx={{ mt: 1 }} startIcon={<Add />} onClick={() => setShowCreatePO(true)}>
                                                Create First PO
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ──────────── ALERTS ──────────── */}
            {tab === 'alerts' && (
                <Stack gap={2}>
                    {(dashboard?.expiry?.within30Days ?? 0) > 0 && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            <AlertTitle>⚠️ {dashboard?.expiry?.within30Days} batch(es) expiring within 30 days</AlertTitle>
                            Go to the Expiring tab to review and take action.
                        </Alert>
                    )}
                    {(dashboard?.totals?.lowStock ?? 0) > 0 && (
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                            <AlertTitle>📉 {dashboard?.totals?.lowStock} product(s) below minimum stock level</AlertTitle>
                            Consider raising purchase orders for affected products.
                        </Alert>
                    )}
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} mb={2}>Low Stock Products</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product</TableCell>
                                        <TableCell>Branch</TableCell>
                                        <TableCell align="right">On Hand</TableCell>
                                        <TableCell align="right">Minimum</TableCell>
                                        <TableCell align="right">Deficit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(lowStockItems as any[] ?? []).map((item: any) => (
                                        <TableRow key={item.id} hover sx={{ bgcolor: alpha('#F87171', 0.04) }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{item.product?.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.product?.sku}</Typography>
                                            </TableCell>
                                            <TableCell>{item.branch?.name}</TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={700} color="error.main">
                                                    {Number(item.quantityOnHand)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{item.product?.minStockLevel}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={`-${item.deficit ?? Math.max(0, item.product?.minStockLevel - Number(item.quantityOnHand))}`}
                                                    color="error"
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!lowStockItems || (lowStockItems as any[]).length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                                <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                                                <Typography>All stock levels are healthy!</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}

            {/* ── Dialogs ── */}
            <CreatePoDialog
                open={showCreatePO}
                onClose={() => setShowCreatePO(false)}
                onSaved={() => qc.invalidateQueries({ queryKey: ['purchase-orders'] })}
            />
            <GrnDialog
                po={grnPO}
                open={!!grnPO}
                onClose={() => setGrnPO(null)}
                onSaved={() => {
                    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
                    qc.invalidateQueries({ queryKey: ['inv-stock'] });
                }}
            />
        </Box>
    );
}
