import {
    Injectable, NotFoundException, BadRequestException, UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateStaffDto, UpdateStaffDto, StaffSearchDto,
    CreateScheduleDto, UpdateScheduleDto,
    ClockInDto, ClockOutDto,
    CreateLeaveRequestDto, ReviewLeaveDto,
    CreateCertificationDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
    constructor(private prisma: PrismaService) { }

    // ── Staff Directory ────────────────────────────────────────────────────────

    async listStaff(tenantId: string, dto: StaffSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            ...(dto.branchId && { branchId: dto.branchId }),
            ...(dto.role && { role: dto.role }),
            ...(dto.activeOnly !== false && { isActive: true }),
            ...(dto.search && {
                OR: [
                    { firstName: { contains: dto.search, mode: 'insensitive' } },
                    { lastName: { contains: dto.search, mode: 'insensitive' } },
                    { email: { contains: dto.search, mode: 'insensitive' } },
                ],
            }),
        };

        const [total, users] = await this.prisma.$transaction([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where, skip, take: limit,
                orderBy: { firstName: 'asc' },
                select: {
                    id: true, firstName: true, lastName: true, email: true,
                    role: true, isActive: true, branchId: true, createdAt: true,
                    branch: { select: { id: true, name: true } },
                    staffProfile: {
                        select: {
                            id: true, specialty: true, licenseNumber: true,
                            commissionRate: true, isActive: true,
                        },
                    },
                },
            }),
        ]);

        return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getStaff(tenantId: string, userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: {
                id: true, firstName: true, lastName: true, email: true,
                role: true, isActive: true, branchId: true, createdAt: true,
                branch: { select: { id: true, name: true } },
                staffProfile: {
                    select: {
                        id: true, specialty: true, licenseNumber: true,
                        commissionRate: true, isActive: true,
                        schedules: { orderBy: { startTime: 'desc' }, take: 10 },
                        attendanceLogs: { orderBy: { clockIn: 'desc' }, take: 10 },
                        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
                        certifications: { orderBy: { createdAt: 'desc' } },
                    },
                },
            },
        });
        if (!user) throw new NotFoundException('Staff member not found');
        return user;
    }

    async createStaff(tenantId: string, branchId: string, dto: CreateStaffDto) {
        // Check unique email
        const existing = await this.prisma.user.findFirst({
            where: { tenantId, email: dto.email },
        });
        if (existing) throw new BadRequestException('Email already in use');

        const targetBranch = dto.branchId || branchId;

        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId,
                    branchId: targetBranch,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    email: dto.email,
                    role: dto.role,
                },
            });

            // Create staff profile for non-PATIENT roles
            if (dto.role !== 'PATIENT') {
                await tx.staffProfile.create({
                    data: {
                        userId: user.id,
                        branchId: targetBranch,
                        specialty: dto.specialty,
                        licenseNumber: dto.licenseNumber,
                        commissionRate: dto.commissionRate ?? 0,
                    },
                });
            }

            return this.getStaff(tenantId, user.id);
        });
    }

    async updateStaff(tenantId: string, userId: string, dto: UpdateStaffDto) {
        const user = await this.getStaff(tenantId, userId);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                ...(dto.role !== undefined && { role: dto.role }),
            },
        });

        if (user.staffProfile) {
            await this.prisma.staffProfile.update({
                where: { id: user.staffProfile.id },
                data: {
                    ...(dto.specialty !== undefined && { specialty: dto.specialty }),
                    ...(dto.licenseNumber !== undefined && { licenseNumber: dto.licenseNumber }),
                    ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
                },
            });
        }

        return this.getStaff(tenantId, userId);
    }

    async toggleActive(tenantId: string, userId: string) {
        const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
        if (!user) throw new NotFoundException('Staff not found');
        return this.prisma.user.update({
            where: { id: userId },
            data: { isActive: !user.isActive },
            select: { id: true, isActive: true },
        });
    }

    // ── Schedules ──────────────────────────────────────────────────────────────

    async listSchedules(tenantId: string, branchId: string, from?: string, to?: string, staffId?: string) {
        const where: any = {
            branchId,
            staff: { user: { tenantId } },
            ...(staffId && { staffId }),
            ...(from || to ? {
                startTime: {
                    ...(from && { gte: new Date(from) }),
                    ...(to && { lte: new Date(to) }),
                },
            } : {}),
        };

        return this.prisma.schedule.findMany({
            where,
            orderBy: { startTime: 'asc' },
            include: {
                staff: {
                    select: {
                        id: true,
                        user: { select: { firstName: true, lastName: true, role: true } },
                    },
                },
            },
        });
    }

    async createSchedule(tenantId: string, branchId: string, dto: CreateScheduleDto) {
        const profile = await this.prisma.staffProfile.findFirst({
            where: { id: dto.staffId, user: { tenantId } },
        });
        if (!profile) throw new NotFoundException('Staff profile not found');

        return this.prisma.schedule.create({
            data: {
                staffId: dto.staffId,
                branchId,
                startTime: new Date(dto.startTime),
                endTime: new Date(dto.endTime),
                note: dto.note,
            },
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    async updateSchedule(tenantId: string, id: string, dto: UpdateScheduleDto) {
        const sched = await this.prisma.schedule.findFirst({
            where: { id, staff: { user: { tenantId } } },
        });
        if (!sched) throw new NotFoundException('Schedule not found');

        return this.prisma.schedule.update({
            where: { id },
            data: {
                ...(dto.startTime && { startTime: new Date(dto.startTime) }),
                ...(dto.endTime && { endTime: new Date(dto.endTime) }),
                ...(dto.note !== undefined && { note: dto.note }),
            },
        });
    }

    async deleteSchedule(tenantId: string, id: string) {
        const sched = await this.prisma.schedule.findFirst({
            where: { id, staff: { user: { tenantId } } },
        });
        if (!sched) throw new NotFoundException('Schedule not found');
        return this.prisma.schedule.delete({ where: { id } });
    }

    // ── Attendance ─────────────────────────────────────────────────────────────

    async clockIn(tenantId: string, dto: ClockInDto) {
        const profile = await this.prisma.staffProfile.findFirst({
            where: { id: dto.staffId, user: { tenantId } },
        });
        if (!profile) throw new NotFoundException('Staff profile not found');

        // Check not already clocked in
        const openLog = await this.prisma.attendanceLog.findFirst({
            where: { staffId: dto.staffId, clockOut: null },
        });
        if (openLog) throw new UnprocessableEntityException('Already clocked in');

        return this.prisma.attendanceLog.create({
            data: { staffId: dto.staffId, clockIn: new Date(), note: dto.note },
        });
    }

    async clockOut(tenantId: string, logId: string, dto: ClockOutDto) {
        const log = await this.prisma.attendanceLog.findFirst({
            where: { id: logId, staff: { user: { tenantId } }, clockOut: null },
        });
        if (!log) throw new NotFoundException('Open attendance log not found');

        return this.prisma.attendanceLog.update({
            where: { id: logId },
            data: { clockOut: new Date(), note: dto.note ?? log.note },
        });
    }

    async listAttendance(tenantId: string, branchId: string, from?: string, to?: string, staffId?: string) {
        return this.prisma.attendanceLog.findMany({
            where: {
                staff: { branchId, user: { tenantId } },
                ...(staffId && { staffId }),
                ...(from || to ? {
                    clockIn: {
                        ...(from && { gte: new Date(from) }),
                        ...(to && { lte: new Date(to) }),
                    },
                } : {}),
            },
            orderBy: { clockIn: 'desc' },
            take: 100,
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    async getOnDuty(tenantId: string, branchId: string) {
        return this.prisma.attendanceLog.findMany({
            where: { staff: { branchId, user: { tenantId } }, clockOut: null },
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true, role: true } } } },
            },
        });
    }

    // ── Leave Requests ─────────────────────────────────────────────────────────

    async createLeaveRequest(tenantId: string, dto: CreateLeaveRequestDto) {
        const profile = await this.prisma.staffProfile.findFirst({
            where: { id: dto.staffId, user: { tenantId } },
        });
        if (!profile) throw new NotFoundException('Staff profile not found');

        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (end < start) throw new BadRequestException('End date must be after start date');

        return this.prisma.leaveRequest.create({
            data: {
                staffId: dto.staffId,
                leaveType: dto.leaveType,
                startDate: start,
                endDate: end,
                reason: dto.reason,
            },
            include: {
                staff: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    async listLeaveRequests(tenantId: string, branchId: string, status?: string) {
        return this.prisma.leaveRequest.findMany({
            where: {
                staff: { branchId, user: { tenantId } },
                ...(status && { status: status as any }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    async reviewLeave(tenantId: string, leaveId: string, userId: string, dto: ReviewLeaveDto) {
        const leave = await this.prisma.leaveRequest.findFirst({
            where: { id: leaveId, staff: { user: { tenantId } } },
        });
        if (!leave) throw new NotFoundException('Leave request not found');
        if (leave.status !== 'PENDING') throw new UnprocessableEntityException('Already reviewed');

        return this.prisma.leaveRequest.update({
            where: { id: leaveId },
            data: {
                status: dto.decision as any,
                reviewedById: userId,
                reviewedAt: new Date(),
            },
        });
    }

    // ── Certifications ─────────────────────────────────────────────────────────

    async listCertifications(tenantId: string, branchId: string) {
        return this.prisma.staffCertification.findMany({
            where: { staff: { branchId, user: { tenantId } } },
            orderBy: { expiresAt: 'asc' },
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            },
        });
    }

    async addCertification(tenantId: string, dto: CreateCertificationDto) {
        const profile = await this.prisma.staffProfile.findFirst({
            where: { id: dto.staffId, user: { tenantId } },
        });
        if (!profile) throw new NotFoundException('Staff profile not found');

        return this.prisma.staffCertification.create({
            data: {
                staffId: dto.staffId,
                name: dto.name,
                issuer: dto.issuer,
                issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
            },
        });
    }

    async deleteCertification(tenantId: string, id: string) {
        const cert = await this.prisma.staffCertification.findFirst({
            where: { id, staff: { user: { tenantId } } },
        });
        if (!cert) throw new NotFoundException('Certification not found');
        return this.prisma.staffCertification.delete({ where: { id } });
    }

    async getExpiringSoon(tenantId: string, branchId: string) {
        const inThirtyDays = new Date();
        inThirtyDays.setDate(inThirtyDays.getDate() + 30);

        return this.prisma.staffCertification.findMany({
            where: {
                staff: { branchId, user: { tenantId } },
                expiresAt: { lte: inThirtyDays, gte: new Date() },
            },
            include: {
                staff: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { expiresAt: 'asc' },
        });
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    async getDashboard(tenantId: string, branchId: string) {
        const [totalStaff, activeStaff, onDuty, pendingLeave, expiringSoon] = await this.prisma.$transaction([
            this.prisma.user.count({ where: { tenantId, branchId, role: { not: 'PATIENT' } } }),
            this.prisma.user.count({ where: { tenantId, branchId, role: { not: 'PATIENT' }, isActive: true } }),
            this.prisma.attendanceLog.count({
                where: { staff: { branchId, user: { tenantId } }, clockOut: null },
            }),
            this.prisma.leaveRequest.count({
                where: { staff: { branchId, user: { tenantId } }, status: 'PENDING' },
            }),
            this.prisma.staffCertification.count({
                where: {
                    staff: { branchId, user: { tenantId } },
                    expiresAt: { lte: new Date(Date.now() + 30 * 86400000), gte: new Date() },
                },
            }),
        ]);

        return { totalStaff, activeStaff, onDuty, pendingLeave, expiringSoon };
    }
}
