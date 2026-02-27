import apiClient from '../lib/api-client';

export interface StaffMember {
    id: string; firstName: string; lastName: string; email: string;
    role: string; isActive: boolean; branchId?: string; createdAt: string;
    branch?: { id: string; name: string };
    staffProfile?: {
        id: string; specialty?: string; licenseNumber?: string;
        commissionRate: number; isActive: boolean;
        schedules?: Schedule[]; attendanceLogs?: AttendanceLog[];
        leaveRequests?: LeaveRequest[]; certifications?: Certification[];
    };
}
export interface Schedule {
    id: string; staffId: string; branchId: string;
    startTime: string; endTime: string; note?: string;
    staff?: { id: string; user: { firstName: string; lastName: string; role?: string } };
}
export interface AttendanceLog {
    id: string; staffId: string; clockIn: string; clockOut?: string; note?: string;
    staff?: { id: string; user: { firstName: string; lastName: string } };
}
export interface LeaveRequest {
    id: string; staffId: string; leaveType: string;
    startDate: string; endDate: string; reason?: string;
    status: string; reviewedById?: string; reviewedAt?: string; createdAt: string;
    staff?: { id: string; user: { firstName: string; lastName: string } };
}
export interface Certification {
    id: string; staffId: string; name: string; issuer?: string;
    issuedAt?: string; expiresAt?: string; createdAt: string;
    staff?: { id: string; user: { firstName: string; lastName: string } };
}
export interface StaffDashboard {
    totalStaff: number; activeStaff: number; onDuty: number;
    pendingLeave: number; expiringSoon: number;
}

export const staffApi = {
    getDashboard: () => apiClient.get<StaffDashboard>('/api/staff/dashboard').then(r => r.data),
    list: (p?: { branchId?: string; role?: string; search?: string; activeOnly?: boolean; page?: number }) =>
        apiClient.get('/api/staff', { params: p }).then(r => r.data),
    get: (id: string) => apiClient.get<StaffMember>(`/api/staff/${id}`).then(r => r.data),
    create: (data: { firstName: string; lastName: string; email: string; role: string; specialty?: string; licenseNumber?: string; commissionRate?: number; branchId?: string }) =>
        apiClient.post('/api/staff', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put(`/api/staff/${id}`, data).then(r => r.data),
    toggle: (id: string) => apiClient.put(`/api/staff/${id}/toggle`).then(r => r.data),

    // Schedules
    listSchedules: (p?: { from?: string; to?: string; staffId?: string }) =>
        apiClient.get<Schedule[]>('/api/staff/schedules/list', { params: p }).then(r => r.data),
    createSchedule: (data: { staffId: string; startTime: string; endTime: string; note?: string }) =>
        apiClient.post('/api/staff/schedules', data).then(r => r.data),
    deleteSchedule: (id: string) => apiClient.delete(`/api/staff/schedules/${id}`).then(r => r.data),

    // Attendance
    getOnDuty: () => apiClient.get<AttendanceLog[]>('/api/staff/attendance/on-duty').then(r => r.data),
    listAttendance: (p?: { from?: string; to?: string; staffId?: string }) =>
        apiClient.get<AttendanceLog[]>('/api/staff/attendance/list', { params: p }).then(r => r.data),
    clockIn: (data: { staffId: string; note?: string }) =>
        apiClient.post('/api/staff/attendance/clock-in', data).then(r => r.data),
    clockOut: (id: string, data?: { note?: string }) =>
        apiClient.put(`/api/staff/attendance/${id}/clock-out`, data ?? {}).then(r => r.data),

    // Leave
    listLeave: (status?: string) => apiClient.get<LeaveRequest[]>('/api/staff/leave', { params: { status } }).then(r => r.data),
    createLeave: (data: { staffId: string; leaveType: string; startDate: string; endDate: string; reason?: string }) =>
        apiClient.post('/api/staff/leave', data).then(r => r.data),
    reviewLeave: (id: string, decision: 'APPROVED' | 'REJECTED') =>
        apiClient.put(`/api/staff/leave/${id}/review`, { decision }).then(r => r.data),

    // Certifications
    listCerts: () => apiClient.get<Certification[]>('/api/staff/certifications').then(r => r.data),
    getExpiring: () => apiClient.get<Certification[]>('/api/staff/certifications/expiring').then(r => r.data),
    addCert: (data: { staffId: string; name: string; issuer?: string; issuedAt?: string; expiresAt?: string }) =>
        apiClient.post('/api/staff/certifications', data).then(r => r.data),
    deleteCert: (id: string) => apiClient.delete(`/api/staff/certifications/${id}`).then(r => r.data),
};
