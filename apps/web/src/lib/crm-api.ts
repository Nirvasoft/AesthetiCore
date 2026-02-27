import apiClient from '../lib/api-client';

export interface CrmInteraction {
    id: string;
    patientId: string;
    branchId: string;
    staffId: string;
    type: string;
    channel: string;
    summary: string;
    details?: string;
    outcome?: string;
    followUpDate?: string;
    isFollowedUp: boolean;
    followedUpAt?: string;
    createdAt: string;
    patient?: { id: string; firstName: string; lastName: string; patientCode: string };
}

export interface Campaign {
    id: string;
    name: string;
    description?: string;
    channel: string;
    messageTemplate: string;
    targetSegments: string[];
    status: string;
    audienceCount: number;
    sentCount: number;
    scheduledAt?: string;
    sentAt?: string;
    createdAt: string;
}

export interface CrmDashboard {
    patients: {
        total: number;
        newThisMonth: number;
        bySegment: { VIP: number; ACTIVE: number; LEAD: number; DORMANT: number };
    };
    followUps: { pending: number };
    campaigns: { sent: number };
}

export const crmApi = {
    getDashboard: () =>
        apiClient.get<CrmDashboard>('/api/crm/dashboard').then((r) => r.data),

    listInteractions: (params?: { patientId?: string; type?: string; page?: number; limit?: number }) =>
        apiClient.get('/api/crm/interactions', { params }).then((r) => r.data),

    getFollowUps: () =>
        apiClient.get<CrmInteraction[]>('/api/crm/interactions/follow-ups').then((r) => r.data),

    logInteraction: (patientId: string, data: {
        type: string; channel: string; summary: string;
        details?: string; followUpDate?: string; outcome?: string;
    }) => apiClient.post(`/api/crm/patients/${patientId}/interactions`, data).then((r) => r.data),

    getPatientInteractions: (patientId: string) =>
        apiClient.get<CrmInteraction[]>(`/api/crm/patients/${patientId}/interactions`).then((r) => r.data),

    markFollowedUp: (id: string) =>
        apiClient.put(`/api/crm/interactions/${id}/follow-up`).then((r) => r.data),

    topUpCredit: (patientId: string, amount: number, note?: string, receiptRef?: string) =>
        apiClient.post(`/api/crm/patients/${patientId}/credit/top-up`, { amount, note, receiptRef }).then((r) => r.data),

    getCreditHistory: (patientId: string) =>
        apiClient.get(`/api/crm/patients/${patientId}/credit`).then((r) => r.data),

    getLoyaltyHistory: (patientId: string) =>
        apiClient.get(`/api/crm/patients/${patientId}/loyalty`).then((r) => r.data),

    listCampaigns: (page = 1, limit = 20) =>
        apiClient.get('/api/crm/campaigns', { params: { page, limit } }).then((r) => r.data),

    createCampaign: (data: {
        name: string; channel: string; messageTemplate: string;
        targetSegments?: string[]; scheduledAt?: string; description?: string;
    }) => apiClient.post('/api/crm/campaigns', data).then((r) => r.data),

    dispatchCampaign: (id: string) =>
        apiClient.post(`/api/crm/campaigns/${id}/dispatch`).then((r) => r.data),

    getNotificationLog: (page = 1) =>
        apiClient.get('/api/crm/notifications', { params: { page } }).then((r) => r.data),
};
