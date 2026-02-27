import apiClient from '../lib/api-client';

export type AppointmentStatus =
    | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN'
    | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export interface Appointment {
    id: string;
    branchId: string;
    patientId: string;
    practitionerId?: string;
    roomId?: string;
    status: AppointmentStatus;
    startTime: string;
    endTime: string;
    serviceNote?: string;
    depositAmount?: number;
    depositPaid: boolean;
    isNoShow: boolean;
    cancelReason?: string;
    createdAt: string;
    patient?: { id: string; firstName: string; lastName: string; patientCode: string; phone?: string };
    room?: { id: string; name: string };
    branch?: { id: string; name: string };
    session?: { id: string; status: string };
}

export interface Room {
    id: string;
    branchId: string;
    name: string;
    capacity: number;
    isActive: boolean;
}

export interface WaitlistEntry {
    id: string;
    branchId: string;
    patientId: string;
    preferredDate?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
}

export interface ApptDashboard {
    today: {
        total: number; pending: number; confirmed: number;
        checkedIn: number; completed: number; noShow: number; cancelled: number;
    };
    weekUpcoming: number;
    waitlistCount: number;
    noShowRate: number;
}

export const appointmentsApi = {
    getDashboard: (branchId?: string) =>
        apiClient.get<ApptDashboard>('/api/appointments/dashboard', { params: { branchId } }).then(r => r.data),

    list: (params?: {
        branchId?: string; practitionerId?: string; patientId?: string;
        status?: string; from?: string; to?: string; page?: number; limit?: number;
    }) =>
        apiClient.get('/api/appointments', { params }).then(r => r.data),

    get: (id: string) =>
        apiClient.get<Appointment>(`/api/appointments/${id}`).then(r => r.data),

    create: (data: {
        patientId: string; practitionerId?: string; roomId?: string;
        startTime: string; endTime: string; serviceNote?: string; depositAmount?: number;
    }) =>
        apiClient.post<Appointment>('/api/appointments', data).then(r => r.data),

    update: (id: string, data: { practitionerId?: string; roomId?: string; serviceNote?: string; depositAmount?: number }) =>
        apiClient.put<Appointment>(`/api/appointments/${id}`, data).then(r => r.data),

    confirm: (id: string) => apiClient.put(`/api/appointments/${id}/confirm`).then(r => r.data),
    checkIn: (id: string) => apiClient.put(`/api/appointments/${id}/check-in`).then(r => r.data),
    start: (id: string) => apiClient.put(`/api/appointments/${id}/start`).then(r => r.data),
    complete: (id: string) => apiClient.put(`/api/appointments/${id}/complete`).then(r => r.data),
    noShow: (id: string) => apiClient.put(`/api/appointments/${id}/no-show`).then(r => r.data),
    cancel: (id: string, reason: string) => apiClient.put(`/api/appointments/${id}/cancel`, { reason }).then(r => r.data),
    reschedule: (id: string, data: { newStartTime: string; newEndTime: string; reason?: string }) =>
        apiClient.put(`/api/appointments/${id}/reschedule`, data).then(r => r.data),

    getSlots: (params: { date: string; duration?: number; practitionerId?: string }) =>
        apiClient.get('/api/appointments/slots', { params }).then(r => r.data),

    // Rooms
    listRooms: () => apiClient.get<Room[]>('/api/appointments/rooms').then(r => r.data),
    createRoom: (data: { name: string; capacity?: number }) =>
        apiClient.post<Room>('/api/appointments/rooms', data).then(r => r.data),
    toggleRoom: (id: string) => apiClient.put(`/api/appointments/rooms/${id}/toggle`).then(r => r.data),

    // Waitlist
    listWaitlist: () => apiClient.get<WaitlistEntry[]>('/api/appointments/waitlist').then(r => r.data),
    addToWaitlist: (data: { patientId: string; preferredDate?: string; notes?: string }) =>
        apiClient.post<WaitlistEntry>('/api/appointments/waitlist', data).then(r => r.data),
    removeFromWaitlist: (id: string) => apiClient.delete(`/api/appointments/waitlist/${id}`).then(r => r.data),
};
