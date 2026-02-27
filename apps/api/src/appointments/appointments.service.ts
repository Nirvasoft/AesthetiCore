import {
    Injectable, NotFoundException, BadRequestException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateAppointmentDto, UpdateAppointmentDto, RescheduleDto,
    CancelAppointmentDto, AppointmentSearchDto, AvailableSlotsDto,
    WaitlistDto, CreateRoomDto,
} from './dto/appointments.dto';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) { }

    // ── Overlap check ──────────────────────────────────────────────────────────
    private async checkOverlap(
        branchId: string,
        startTime: Date,
        endTime: Date,
        practitionerId?: string,
        roomId?: string,
        excludeId?: string,
    ) {
        const overlapping = await this.prisma.appointment.findFirst({
            where: {
                branchId,
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                ...(excludeId && { id: { not: excludeId } }),
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                OR: [
                    ...(practitionerId ? [{ practitionerId }] : []),
                    ...(roomId ? [{ roomId }] : []),
                ],
            },
            select: { id: true, practitionerId: true, roomId: true },
        });

        if (overlapping) {
            const conflict = overlapping.practitionerId === practitionerId
                ? 'Practitioner already booked'
                : 'Room already booked';
            throw new UnprocessableEntityException(
                `${conflict} during this time slot`,
            );
        }
    }

    // ── CRUD ────────────────────────────────────────────────────────────────────

    async createAppointment(tenantId: string, branchId: string, dto: CreateAppointmentDto) {
        // Verify patient
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const start = new Date(dto.startTime);
        const end = new Date(dto.endTime);
        if (end <= start) throw new BadRequestException('End time must be after start time');

        // Check double-booking
        if (dto.practitionerId || dto.roomId) {
            await this.checkOverlap(branchId, start, end, dto.practitionerId, dto.roomId);
        }

        return this.prisma.appointment.create({
            data: {
                branchId,
                patientId: dto.patientId,
                practitionerId: dto.practitionerId,
                roomId: dto.roomId,
                startTime: start,
                endTime: end,
                serviceNote: dto.serviceNote,
                depositAmount: dto.depositAmount,
                status: 'PENDING',
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
                room: { select: { id: true, name: true } },
            },
        });
    }

    async listAppointments(tenantId: string, dto: AppointmentSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 50, 200);
        const skip = (page - 1) * limit;

        const where: any = {
            branch: { tenantId },
            ...(dto.branchId && { branchId: dto.branchId }),
            ...(dto.practitionerId && { practitionerId: dto.practitionerId }),
            ...(dto.patientId && { patientId: dto.patientId }),
            ...(dto.status && { status: dto.status }),
            ...(dto.from || dto.to ? {
                startTime: {
                    ...(dto.from && { gte: new Date(dto.from) }),
                    ...(dto.to && { lte: new Date(dto.to) }),
                },
            } : {}),
        };

        const [total, appointments] = await this.prisma.$transaction([
            this.prisma.appointment.count({ where }),
            this.prisma.appointment.findMany({
                where, skip, take: limit,
                orderBy: { startTime: 'asc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
                    room: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                },
            }),
        ]);

        return { data: appointments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getAppointment(tenantId: string, id: string) {
        const appt = await this.prisma.appointment.findFirst({
            where: { id, branch: { tenantId } },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
                room: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
                session: { select: { id: true, status: true } },
            },
        });
        if (!appt) throw new NotFoundException('Appointment not found');
        return appt;
    }

    async updateAppointment(tenantId: string, id: string, dto: UpdateAppointmentDto) {
        await this.getAppointment(tenantId, id);
        return this.prisma.appointment.update({
            where: { id },
            data: {
                ...(dto.practitionerId !== undefined && { practitionerId: dto.practitionerId }),
                ...(dto.roomId !== undefined && { roomId: dto.roomId }),
                ...(dto.serviceNote !== undefined && { serviceNote: dto.serviceNote }),
                ...(dto.depositAmount !== undefined && { depositAmount: dto.depositAmount }),
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                room: { select: { id: true, name: true } },
            },
        });
    }

    // ── Status transitions ─────────────────────────────────────────────────────

    private async transition(tenantId: string, id: string, from: string[], to: string, extra: any = {}) {
        const appt = await this.getAppointment(tenantId, id);
        if (!from.includes(appt.status)) {
            throw new UnprocessableEntityException(
                `Cannot transition from ${appt.status} to ${to}`,
            );
        }
        return this.prisma.appointment.update({
            where: { id },
            data: { status: to as any, ...extra },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                room: { select: { id: true, name: true } },
            },
        });
    }

    async confirm(tenantId: string, id: string) {
        return this.transition(tenantId, id, ['PENDING'], 'CONFIRMED');
    }

    async checkIn(tenantId: string, id: string) {
        return this.transition(tenantId, id, ['CONFIRMED'], 'CHECKED_IN');
    }

    async startSession(tenantId: string, id: string) {
        return this.transition(tenantId, id, ['CHECKED_IN'], 'IN_PROGRESS');
    }

    async complete(tenantId: string, id: string) {
        return this.transition(tenantId, id, ['IN_PROGRESS', 'CHECKED_IN'], 'COMPLETED');
    }

    async markNoShow(tenantId: string, id: string) {
        return this.transition(tenantId, id, ['PENDING', 'CONFIRMED'], 'NO_SHOW', { isNoShow: true });
    }

    async cancel(tenantId: string, id: string, dto: CancelAppointmentDto) {
        return this.transition(
            tenantId, id,
            ['PENDING', 'CONFIRMED'],
            'CANCELLED',
            { cancelReason: dto.reason },
        );
    }

    async reschedule(tenantId: string, id: string, dto: RescheduleDto) {
        const appt = await this.getAppointment(tenantId, id);
        if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status)) {
            throw new UnprocessableEntityException(`Cannot reschedule a ${appt.status} appointment`);
        }

        const start = new Date(dto.newStartTime);
        const end = new Date(dto.newEndTime);
        if (end <= start) throw new BadRequestException('End time must be after start time');

        if (appt.practitionerId || appt.roomId) {
            await this.checkOverlap(
                appt.branchId, start, end,
                appt.practitionerId ?? undefined,
                appt.roomId ?? undefined,
                id,
            );
        }

        return this.prisma.appointment.update({
            where: { id },
            data: {
                startTime: start,
                endTime: end,
                serviceNote: dto.reason
                    ? `${appt.serviceNote ? appt.serviceNote + ' | ' : ''}Rescheduled: ${dto.reason}`
                    : appt.serviceNote,
                status: 'CONFIRMED',
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                room: { select: { id: true, name: true } },
            },
        });
    }

    // ── Available Slots ─────────────────────────────────────────────────────────

    async getAvailableSlots(tenantId: string, branchId: string, dto: AvailableSlotsDto) {
        const date = new Date(dto.date);
        const dayStart = new Date(date); dayStart.setHours(9, 0, 0, 0);   // clinic opens 09:00
        const dayEnd = new Date(date); dayEnd.setHours(18, 0, 0, 0);    // clinic closes 18:00
        const duration = dto.duration ?? 60; // default 60 min

        const where: any = {
            branchId,
            branch: { tenantId },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            startTime: { gte: dayStart },
            endTime: { lte: dayEnd },
            ...(dto.practitionerId && { practitionerId: dto.practitionerId }),
        };

        const booked = await this.prisma.appointment.findMany({
            where,
            select: { startTime: true, endTime: true, practitionerId: true, roomId: true },
            orderBy: { startTime: 'asc' },
        });

        // Generate slots
        const slots: Array<{ start: string; end: string }> = [];
        let cursor = new Date(dayStart);

        while (cursor.getTime() + duration * 60000 <= dayEnd.getTime()) {
            const slotEnd = new Date(cursor.getTime() + duration * 60000);

            const hasConflict = booked.some(
                (b) => cursor < b.endTime && slotEnd > b.startTime,
            );

            if (!hasConflict) {
                slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
            }

            cursor = new Date(cursor.getTime() + 30 * 60000); // 30-min step
        }

        return { date: dto.date, duration, slots };
    }

    // ── Rooms ──────────────────────────────────────────────────────────────────

    async listRooms(tenantId: string, branchId: string) {
        return this.prisma.room.findMany({
            where: { branchId, branch: { tenantId } },
            orderBy: { name: 'asc' },
        });
    }

    async createRoom(tenantId: string, branchId: string, dto: CreateRoomDto) {
        return this.prisma.room.create({
            data: {
                branchId,
                name: dto.name,
                capacity: dto.capacity ?? 1,
            },
        });
    }

    async toggleRoom(tenantId: string, roomId: string) {
        const room = await this.prisma.room.findFirst({
            where: { id: roomId, branch: { tenantId } },
        });
        if (!room) throw new NotFoundException('Room not found');
        return this.prisma.room.update({
            where: { id: roomId },
            data: { isActive: !room.isActive },
        });
    }

    // ── Waitlist ───────────────────────────────────────────────────────────────

    async listWaitlist(tenantId: string, branchId: string) {
        return this.prisma.waitlistEntry.findMany({
            where: { branchId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async addToWaitlist(tenantId: string, branchId: string, dto: WaitlistDto) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        return this.prisma.waitlistEntry.create({
            data: {
                branchId,
                patientId: dto.patientId,
                preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
                notes: dto.notes,
            },
        });
    }

    async removeFromWaitlist(tenantId: string, id: string) {
        const entry = await this.prisma.waitlistEntry.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Waitlist entry not found');
        return this.prisma.waitlistEntry.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    async getDashboard(tenantId: string, branchId?: string) {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

        const where: any = { branch: { tenantId }, ...(branchId && { branchId }) };
        const todayWhere = { ...where, startTime: { gte: todayStart, lte: todayEnd } };

        const [
            todayTotal, todayPending, todayConfirmed, todayCheckedIn,
            todayCompleted, todayNoShow, todayCancelled,
            weekUpcoming, waitlistCount,
        ] = await this.prisma.$transaction([
            this.prisma.appointment.count({ where: todayWhere }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'PENDING' } }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'CONFIRMED' } }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'CHECKED_IN' } }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'COMPLETED' } }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'NO_SHOW' } }),
            this.prisma.appointment.count({ where: { ...todayWhere, status: 'CANCELLED' } }),
            this.prisma.appointment.count({
                where: { ...where, startTime: { gte: now, lte: weekEnd }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
            }),
            this.prisma.waitlistEntry.count({ where: { ...(branchId && { branchId }), isActive: true } }),
        ]);

        // No-show rate (last 30 days)
        const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalLast30, noShowLast30] = await this.prisma.$transaction([
            this.prisma.appointment.count({
                where: { ...where, startTime: { gte: thirtyDaysAgo }, status: { in: ['COMPLETED', 'NO_SHOW'] } },
            }),
            this.prisma.appointment.count({
                where: { ...where, startTime: { gte: thirtyDaysAgo }, status: 'NO_SHOW' },
            }),
        ]);

        return {
            today: {
                total: todayTotal, pending: todayPending, confirmed: todayConfirmed,
                checkedIn: todayCheckedIn, completed: todayCompleted,
                noShow: todayNoShow, cancelled: todayCancelled,
            },
            weekUpcoming,
            waitlistCount,
            noShowRate: totalLast30 > 0 ? Math.round((noShowLast30 / totalLast30) * 100) : 0,
        };
    }
}
