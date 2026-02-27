import apiClient from '../lib/api-client';

export interface Patient {
    id: string;
    patientCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    gender?: string;
    dateOfBirth?: string;
    segment: 'LEAD' | 'ACTIVE' | 'VIP' | 'INACTIVE' | 'DORMANT';
    loyaltyPoints: number;
    lastVisitDate?: string;
    branch: { id: string; name: string };
    _count?: { sessions: number; packages: number };
}

export interface PatientDetail extends Patient {
    lineId?: string;
    notes?: string;
    medicalHistory: Array<{ id: string; condition: string; details?: string }>;
    allergies: Array<{ id: string; allergen: string; severity?: string }>;
    pdpaConsents: Array<{ consentType: string; isGranted: boolean; signedAt: string }>;
    packages: Array<{
        id: string;
        totalSessions: number;
        usedSessions: number;
        expiresAt?: string;
        package: { name: string; totalSessions: number };
    }>;
    sessions: Array<{
        id: string;
        visitDate: string;
        status: string;
        chiefComplaint?: string;
        branch: { name: string };
    }>;
    _count: { sessions: number; packages: number; photos: number };
}

export interface SearchResult {
    data: Patient[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const patientsApi = {
    search: (params: {
        q?: string;
        segment?: string;
        branchId?: string;
        page?: number;
        limit?: number;
    }) => apiClient.get<SearchResult>('/api/patients', { params }).then((r) => r.data),

    findOne: (id: string) =>
        apiClient.get<PatientDetail>(`/api/patients/${id}`).then((r) => r.data),

    checkDuplicates: (phone: string, firstName: string, lastName: string) =>
        apiClient
            .get<Patient[]>('/api/patients/duplicates', {
                params: { phone, firstName, lastName },
            })
            .then((r) => r.data),

    create: (data: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        gender?: string;
        dateOfBirth?: string;
        lineId?: string;
        notes?: string;
        referredById?: string;
    }) => apiClient.post('/api/patients', data).then((r) => r.data),

    update: (id: string, data: Partial<Patient>) =>
        apiClient.put(`/api/patients/${id}`, data).then((r) => r.data),

    getTimeline: (id: string) =>
        apiClient.get(`/api/patients/${id}/timeline`).then((r) => r.data),

    recordConsent: (id: string, consentType: string, isGranted: boolean) =>
        apiClient
            .post(`/api/patients/${id}/consents`, { consentType, isGranted })
            .then((r) => r.data),
};
