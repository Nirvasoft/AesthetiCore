import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
    CreateAppointmentDto, UpdateAppointmentDto, RescheduleDto,
    CancelAppointmentDto, AppointmentSearchDto, AvailableSlotsDto,
    WaitlistDto, CreateRoomDto,
} from './dto/appointments.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly svc: AppointmentsService) { }

    // ── Dashboard ──────────────────────────────────────────────────────────────
    @Get('dashboard')
    @ApiOperation({ summary: "Today's stats, weekly upcoming, no-show rate" })
    getDashboard(@Query('branchId') branchId: string, @Req() req: any) {
        return this.svc.getDashboard(req.tenantContext.tenantId, branchId);
    }

    // ── Calendar List ──────────────────────────────────────────────────────────
    @Get()
    @ApiOperation({ summary: 'List appointments (calendar view — date range + practitioner + status filter)' })
    list(@Query() q: AppointmentSearchDto, @Req() req: any) {
        return this.svc.listAppointments(req.tenantContext.tenantId, q);
    }

    // ── Book ───────────────────────────────────────────────────────────────────
    @Post()
    @ApiOperation({ summary: 'Book a new appointment (checks for double-booking)' })
    create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
        return this.svc.createAppointment(req.tenantContext.tenantId, req.tenantContext.branchId, dto);
    }

    // ── Available Slots ────────────────────────────────────────────────────────
    @Get('slots')
    @ApiOperation({ summary: 'Get available time slots for a given date & duration' })
    getSlots(@Query() q: AvailableSlotsDto, @Req() req: any) {
        return this.svc.getAvailableSlots(req.tenantContext.tenantId, req.tenantContext.branchId, q);
    }

    // ── Rooms ──────────────────────────────────────────────────────────────────
    @Get('rooms')
    @ApiOperation({ summary: 'List rooms for current branch' })
    listRooms(@Req() req: any) {
        return this.svc.listRooms(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    @Post('rooms')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Create a new room' })
    createRoom(@Body() dto: CreateRoomDto, @Req() req: any) {
        return this.svc.createRoom(req.tenantContext.tenantId, req.tenantContext.branchId, dto);
    }

    @Put('rooms/:id/toggle')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle room active/inactive' })
    toggleRoom(@Param('id') id: string, @Req() req: any) {
        return this.svc.toggleRoom(req.tenantContext.tenantId, id);
    }

    // ── Waitlist ───────────────────────────────────────────────────────────────
    @Get('waitlist')
    @ApiOperation({ summary: 'List active waitlist entries' })
    listWaitlist(@Req() req: any) {
        return this.svc.listWaitlist(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    @Post('waitlist')
    @ApiOperation({ summary: 'Add patient to waitlist' })
    addToWaitlist(@Body() dto: WaitlistDto, @Req() req: any) {
        return this.svc.addToWaitlist(req.tenantContext.tenantId, req.tenantContext.branchId, dto);
    }

    @Delete('waitlist/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove from waitlist' })
    removeFromWaitlist(@Param('id') id: string, @Req() req: any) {
        return this.svc.removeFromWaitlist(req.tenantContext.tenantId, id);
    }

    // ── Single Appointment ─────────────────────────────────────────────────────
    @Get(':id')
    @ApiOperation({ summary: 'Get appointment detail' })
    get(@Param('id') id: string, @Req() req: any) {
        return this.svc.getAppointment(req.tenantContext.tenantId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update appointment fields' })
    update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Req() req: any) {
        return this.svc.updateAppointment(req.tenantContext.tenantId, id, dto);
    }

    // ── Status transitions ────────────────────────────────────────────────────
    @Put(':id/confirm')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'PENDING → CONFIRMED' })
    confirm(@Param('id') id: string, @Req() req: any) {
        return this.svc.confirm(req.tenantContext.tenantId, id);
    }

    @Put(':id/check-in')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'CONFIRMED → CHECKED_IN' })
    checkIn(@Param('id') id: string, @Req() req: any) {
        return this.svc.checkIn(req.tenantContext.tenantId, id);
    }

    @Put(':id/start')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'CHECKED_IN → IN_PROGRESS' })
    start(@Param('id') id: string, @Req() req: any) {
        return this.svc.startSession(req.tenantContext.tenantId, id);
    }

    @Put(':id/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '→ COMPLETED' })
    complete(@Param('id') id: string, @Req() req: any) {
        return this.svc.complete(req.tenantContext.tenantId, id);
    }

    @Put(':id/no-show')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '→ NO_SHOW' })
    noShow(@Param('id') id: string, @Req() req: any) {
        return this.svc.markNoShow(req.tenantContext.tenantId, id);
    }

    @Put(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '→ CANCELLED (with reason)' })
    cancel(@Param('id') id: string, @Body() dto: CancelAppointmentDto, @Req() req: any) {
        return this.svc.cancel(req.tenantContext.tenantId, id, dto);
    }

    @Put(':id/reschedule')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change date/time (with overlap re-check)' })
    reschedule(@Param('id') id: string, @Body() dto: RescheduleDto, @Req() req: any) {
        return this.svc.reschedule(req.tenantContext.tenantId, id, dto);
    }
}
