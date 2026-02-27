import apiClient from '../lib/api-client';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'VOID' | 'REFUNDED';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    discountAmt: number;
    lineTotal: number;
    type?: string;
}

export interface Payment {
    id: string;
    method: string;
    amount: number;
    reference?: string;
    note?: string;
    processedAt: string;
    refunds: Array<{ id: string; amount: number; reason: string; processedAt: string }>;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    patientId: string;
    branchId: string;
    sessionId?: string;
    subtotal: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    serviceChargePct: number;
    serviceChargeAmt: number;
    totalAmount: number;
    paidAmount: number;
    notes?: string;
    voidReason?: string;
    issuedAt?: string;
    paidAt?: string;
    createdAt: string;
    patient?: { id: string; firstName: string; lastName: string; patientCode: string; phone?: string };
    branch?: { id: string; name: string };
    items?: InvoiceItem[];
    payments?: Payment[];
    instalmentPlan?: {
        id: string; instalments: number; status: string;
        payments: Array<{ id: string; dueDate: string; amount: number; status: string; paidAt?: string }>;
    };
}

export interface BillingDashboard {
    period: { from: string; to: string };
    invoices: { total: number; paid: number; partial: number; outstanding: number };
    revenue: { total: number };
    commissions: { pending: number; paid: number };
}

export const billingApi = {
    getDashboard: (params?: { branchId?: string; from?: string; to?: string }) =>
        apiClient.get<BillingDashboard>('/api/billing/dashboard', { params }).then(r => r.data),

    listInvoices: (params?: { patientId?: string; status?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }) =>
        apiClient.get('/api/billing/invoices', { params }).then(r => r.data),

    getInvoice: (id: string) =>
        apiClient.get<Invoice>(`/api/billing/invoices/${id}`).then(r => r.data),

    createInvoice: (data: {
        patientId: string; sessionId?: string; taxRate: number;
        serviceChargePct?: number; overallDiscountAmt?: number; notes?: string;
        items: Array<{ description: string; quantity: number; unitPrice: number; discountPct?: number; discountAmt?: number; productId?: string }>;
    }) =>
        apiClient.post<Invoice>('/api/billing/invoices', data).then(r => r.data),

    recordPayment: (invoiceId: string, data: { amount: number; method: string; reference?: string; note?: string }) =>
        apiClient.post(`/api/billing/invoices/${invoiceId}/payments`, data).then(r => r.data),

    voidInvoice: (invoiceId: string, reason: string) =>
        apiClient.put(`/api/billing/invoices/${invoiceId}/void`, { reason }).then(r => r.data),

    issueRefund: (invoiceId: string, data: { amount: number; reason: string; refundToCredit?: boolean }) =>
        apiClient.post(`/api/billing/invoices/${invoiceId}/refund`, data).then(r => r.data),

    createInstalmentPlan: (data: { invoiceId: string; instalments: number; firstDueDate: string; intervalDays?: number }) =>
        apiClient.post('/api/billing/instalment-plans', data).then(r => r.data),

    listCommissions: (params?: { practitionerId?: string; branchId?: string; fromDate?: string; toDate?: string }) =>
        apiClient.get('/api/billing/commissions', { params }).then(r => r.data),

    markCommissionPaid: (id: string) =>
        apiClient.put(`/api/billing/commissions/${id}/paid`).then(r => r.data),
};
