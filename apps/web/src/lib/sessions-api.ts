import apiClient from '../lib/api-client';

export interface TreatmentLine {
    id: string;
    productId?: string;
    productName: string;
    quantityUsed: number;
    unit?: string;
    bodyZone?: string;
    notes?: string;
    price: number;
    contraindicationOverrideReason?: string;
    batch?: { lotNumber?: string; expiryDate?: string };
}

export interface SessionAddendum {
    id: string;
    content: string;
    addedById: string;
    createdAt: string;
}

export interface TreatmentSession {
    id: string;
    tenantId: string;
    branchId: string;
    patientId: string;
    practitionerId: string;
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED' | 'CANCELLED';
    chiefComplaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    isLocked: boolean;
    doctorSignedAt?: string;
    visitDate: string;
    patient: {
        id: string; firstName: string; lastName: string; patientCode: string;
        phone: string;
        allergies: Array<{ allergen: string; severity?: string }>;
        medicalHistory: Array<{ condition: string }>;
    };
    branch: { id: string; name: string };
    treatmentLines: TreatmentLine[];
    addenda: SessionAddendum[];
    doctorSignedBy?: { id: string; firstName: string; lastName: string };
    _count: { photos: number; consentForms: number };
}

export interface CreateSessionPayload {
    patientId: string;
    appointmentId?: string;
    chiefComplaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    treatmentLines?: Array<{
        productId?: string;
        productName: string;
        quantityUsed: number;
        unit?: string;
        bodyZone?: string;
        notes?: string;
        price: number;
    }>;
}

export const sessionsApi = {
    findAll: (params: {
        patientId?: string;
        branchId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) => apiClient.get('/api/sessions', { params }).then((r) => r.data),

    findOne: (id: string) =>
        apiClient.get<TreatmentSession>(`/api/sessions/${id}`).then((r) => r.data),

    create: (data: CreateSessionPayload) =>
        apiClient.post('/api/sessions', data).then((r) => r.data),

    update: (id: string, data: Partial<CreateSessionPayload>) =>
        apiClient.put(`/api/sessions/${id}`, data).then((r) => r.data),

    addTreatmentLine: (
        sessionId: string,
        line: { productId?: string; productName: string; quantityUsed: number; unit?: string; bodyZone?: string; notes?: string; price: number },
    ) => apiClient.post(`/api/sessions/${sessionId}/treatment-lines`, line).then((r) => r.data),

    signAndLock: (id: string) =>
        apiClient.post(`/api/sessions/${id}/sign`).then((r) => r.data),

    addAddendum: (id: string, content: string) =>
        apiClient.post(`/api/sessions/${id}/addenda`, { content }).then((r) => r.data),

    overrideContraindication: (id: string, treatmentLineId: string, reason: string) =>
        apiClient.post(`/api/sessions/${id}/contraindication-override`, { treatmentLineId, reason }).then((r) => r.data),

    getAuditLog: (id: string) =>
        apiClient.get(`/api/sessions/${id}/audit-log`).then((r) => r.data),
};
