import apiClient from '../lib/api-client';

export interface PatientPhoto {
    id: string;
    patientId: string;
    sessionId?: string;
    s3Key: string;
    s3Bucket: string;
    thumbnailKey?: string;
    bodyZone?: string;
    photoType?: string; // before | after | progress
    pairedWithId?: string;
    takenAt: string;
    createdAt: string;
    patient?: { id: string; firstName: string; lastName: string; patientCode: string };
    session?: { id: string; chiefComplaint?: string; visitDate: string; status: string };
}

export interface PhotoGallery {
    total: number;
    byZone: Record<string, PatientPhoto[]>;
}

export const photosApi = {
    upload: (data: {
        file: File;
        patientId: string;
        sessionId?: string;
        bodyZone?: string;
        photoType?: string;
    }) => {
        const fd = new FormData();
        fd.append('file', data.file);
        fd.append('patientId', data.patientId);
        if (data.sessionId) fd.append('sessionId', data.sessionId);
        if (data.bodyZone) fd.append('bodyZone', data.bodyZone);
        if (data.photoType) fd.append('photoType', data.photoType);
        return apiClient.post<PatientPhoto>('/api/photos/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data);
    },

    findByPatient: (patientId: string, params?: { bodyZone?: string; photoType?: string; sessionId?: string }) =>
        apiClient.get<PatientPhoto[]>(`/api/photos/patient/${patientId}`, { params }).then((r) => r.data),

    getGallery: (patientId: string) =>
        apiClient.get<PhotoGallery>(`/api/photos/patient/${patientId}/gallery`).then((r) => r.data),

    findOne: (id: string) =>
        apiClient.get<PatientPhoto>(`/api/photos/${id}`).then((r) => r.data),

    getFileUrl: (id: string) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        return `/api/photos/${id}/file${token ? `?token=${token}` : ''}`;
    },

    update: (id: string, data: { bodyZone?: string; photoType?: string }) =>
        apiClient.put<PatientPhoto>(`/api/photos/${id}`, data).then((r) => r.data),

    pair: (id: string, pairedId: string) =>
        apiClient.post(`/api/photos/${id}/pair/${pairedId}`).then((r) => r.data),

    unpair: (id: string) =>
        apiClient.post(`/api/photos/${id}/unpair`).then((r) => r.data),

    remove: (id: string) =>
        apiClient.delete(`/api/photos/${id}`).then((r) => r.data),
};
