import apiClient from '../lib/api-client';

export interface InventoryStock {
    id: string;
    productId: string;
    branchId: string;
    quantityOnHand: number;
    reservedQty: number;
    isLow: boolean;
    product: {
        id: string; name: string; sku: string; unit: string;
        minStockLevel: number; costPrice: number; sellingPrice: number; requiresLot: boolean;
    };
    branch: { id: string; name: string };
}

export interface InventoryBatch {
    id: string;
    productId: string;
    branchId: string;
    lotNumber?: string;
    expiryDate?: string;
    quantityIn: number;
    quantityOnHand: number;
    costPerUnit: number;
    receivedAt: string;
    isExpired: boolean;
}

export interface PurchaseOrder {
    id: string;
    branchId: string;
    supplierId: string;
    status: string;
    totalAmount: number;
    notes?: string;
    expectedAt?: string;
    createdById: string;
    approvedById?: string;
    approvedAt?: string;
    createdAt: string;
    supplier: { id: string; name: string };
    branch: { id: string; name: string };
    items?: Array<{
        id: string; productId: string; quantity: number; unitCost: number; totalCost: number;
        product: { id: string; name: string; sku: string; unit: string };
    }>;
    _count?: { items: number };
}

export interface InventoryDashboard {
    totals: { products: number; batches: number; lowStock: number };
    expiry: { within30Days: number; within90Days: number };
    orders: { pendingPOs: number };
    recentTransactions: Array<{
        id: string; type: string; quantity: number; createdAt: string;
        batch: { product: { name: string; sku: string } };
    }>;
}

export const inventoryApi = {
    getDashboard: (branchId?: string) =>
        apiClient.get<InventoryDashboard>('/api/inventory/dashboard', { params: { branchId } }).then(r => r.data),

    getStock: (params?: { branchId?: string; search?: string; filter?: string; page?: number; limit?: number }) =>
        apiClient.get('/api/inventory/stock', { params }).then(r => r.data),

    getLowStock: (branchId?: string) =>
        apiClient.get<InventoryStock[]>('/api/inventory/stock/low', { params: { branchId } }).then(r => r.data),

    getExpiring: (days = 90) =>
        apiClient.get<InventoryBatch[]>('/api/inventory/stock/expiring', { params: { days } }).then(r => r.data),

    adjustStock: (data: { batchId: string; quantity: number; type: string; notes?: string }) =>
        apiClient.post('/api/inventory/stock/adjust', data).then(r => r.data),

    listProducts: (search?: string) =>
        apiClient.get('/api/inventory/products', { params: { search } }).then(r => r.data),

    getProductBatches: (productId: string, branchId?: string) =>
        apiClient.get<InventoryBatch[]>(`/api/inventory/products/${productId}/batches`, { params: { branchId } }).then(r => r.data),

    receiveBatch: (productId: string, data: { lotNumber?: string; expiryDate?: string; quantityIn: number; costPerUnit: number }) =>
        apiClient.post(`/api/inventory/products/${productId}/batches`, data).then(r => r.data),

    listSuppliers: () =>
        apiClient.get('/api/inventory/suppliers').then(r => r.data),

    listPOs: (params?: { branchId?: string; status?: string }) =>
        apiClient.get<PurchaseOrder[]>('/api/inventory/purchase-orders', { params }).then(r => r.data),

    getPO: (id: string) =>
        apiClient.get<PurchaseOrder>(`/api/inventory/purchase-orders/${id}`).then(r => r.data),

    createPO: (data: { branchId: string; supplierId: string; notes?: string; expectedAt?: string; items: Array<{ productId: string; quantity: number; unitCost: number }> }) =>
        apiClient.post<PurchaseOrder>('/api/inventory/purchase-orders', data).then(r => r.data),

    submitPO: (id: string) =>
        apiClient.put(`/api/inventory/purchase-orders/${id}/submit`).then(r => r.data),

    approvePO: (id: string) =>
        apiClient.put(`/api/inventory/purchase-orders/${id}/approve`).then(r => r.data),

    receiveGrn: (poId: string, data: { notes?: string; items: Array<{ productId: string; quantityReceived: number; lotNumber?: string; expiryDate?: string; costPerUnit: number }> }) =>
        apiClient.post(`/api/inventory/purchase-orders/${poId}/grn`, data).then(r => r.data),

    listTransfers: (branchId?: string) =>
        apiClient.get('/api/inventory/transfers', { params: { branchId } }).then(r => r.data),

    createTransfer: (data: { fromBranchId: string; toBranchId: string; notes?: string; items: Array<{ productId: string; batchId: string; quantity: number }> }) =>
        apiClient.post('/api/inventory/transfers', data).then(r => r.data),

    approveTransfer: (id: string) =>
        apiClient.put(`/api/inventory/transfers/${id}/approve`).then(r => r.data),
};
