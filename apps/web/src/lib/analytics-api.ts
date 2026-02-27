import apiClient from '../lib/api-client';

export interface ExecDashboard {
    period: { from: string; to: string };
    revenue: { total: number; avgInvoice: number };
    invoices: { total: number; paid: number };
    patients: { total: number; new: number };
    appointments: { total: number; noShow: number; noShowRate: number };
    inventory: { totalStockUnits: number };
}

export interface RevenuePoint { month: string; revenue: number }
export interface PatientMetrics {
    total: number; active: number; vip: number; inactive: number;
    newLast30Days: number; newLast90Days: number; retentionRate: number;
    monthlyGrowth: Array<{ month: string; count: number }>;
}
export interface PractPerf { practitionerId: string; sessions: number; revenue: number; commissions: number }
export interface TopTreatment { name: string; count: number; revenue: number }
export interface BranchComp { branchId: string; branchName: string; revenue: number; totalAppointments: number; completedAppointments: number }
export interface ApptAnalytics {
    statusDistribution: Array<{ status: string; count: number }>;
    peakHours: Array<{ hour: number; count: number }>;
}

const q = (params?: Record<string, any>) => ({ params });

export const analyticsApi = {
    getDashboard: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get<ExecDashboard>('/api/analytics/dashboard', q(p)).then(r => r.data),
    getRevenue: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get<RevenuePoint[]>('/api/analytics/revenue', q(p)).then(r => r.data),
    getPatients: () => apiClient.get<PatientMetrics>('/api/analytics/patients').then(r => r.data),
    getPractitioners: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get<PractPerf[]>('/api/analytics/practitioners', q(p)).then(r => r.data),
    getInventory: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get('/api/analytics/inventory', q(p)).then(r => r.data),
    getBranches: (p?: { from?: string; to?: string }) => apiClient.get<BranchComp[]>('/api/analytics/branches', q(p)).then(r => r.data),
    getAppointments: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get<ApptAnalytics>('/api/analytics/appointments', q(p)).then(r => r.data),
    getTreatments: (p?: { branchId?: string; from?: string; to?: string }) => apiClient.get<TopTreatment[]>('/api/analytics/treatments', q(p)).then(r => r.data),
};
