import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import {
    CreateStaffDto, UpdateStaffDto, StaffSearchDto,
    CreateScheduleDto, UpdateScheduleDto,
    ClockInDto, ClockOutDto,
    CreateLeaveRequestDto, ReviewLeaveDto,
    CreateCertificationDto,
} from './dto/staff.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
    constructor(private readonly svc: StaffService) { }

    // ── Dashboard ──────────────────────────────────────────────────────────────
    @Get('dashboard')
    @ApiOperation({ summary: 'HR dashboard — headcount, on-duty, pending leave, expiring certs' })
    getDashboard(@Req() req: any) {
        return this.svc.getDashboard(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    // ── Directory ──────────────────────────────────────────────────────────────
    @Get()
    @ApiOperation({ summary: 'List staff with filters' })
    list(@Query() q: StaffSearchDto, @Req() req: any) {
        return this.svc.listStaff(req.tenantContext.tenantId, q);
    }

    @Post()
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Create new staff member + profile' })
    create(@Body() dto: CreateStaffDto, @Req() req: any) {
        return this.svc.createStaff(req.tenantContext.tenantId, req.tenantContext.branchId, dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get staff detail with schedules, attendance, leave, certs' })
    get(@Param('id') id: string, @Req() req: any) {
        return this.svc.getStaff(req.tenantContext.tenantId, id);
    }

    @Put(':id')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Update staff details' })
    update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Req() req: any) {
        return this.svc.updateStaff(req.tenantContext.tenantId, id, dto);
    }

    @Put(':id/toggle')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle staff active/inactive' })
    toggle(@Param('id') id: string, @Req() req: any) {
        return this.svc.toggleActive(req.tenantContext.tenantId, id);
    }

    // ── Schedules ──────────────────────────────────────────────────────────────
    @Get('schedules/list')
    @ApiOperation({ summary: 'List schedules by date range and staff' })
    listSchedules(
        @Query('from') from: string, @Query('to') to: string,
        @Query('staffId') staffId: string, @Req() req: any,
    ) {
        return this.svc.listSchedules(req.tenantContext.tenantId, req.tenantContext.branchId, from, to, staffId);
    }

    @Post('schedules')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Create shift schedule' })
    createSchedule(@Body() dto: CreateScheduleDto, @Req() req: any) {
        return this.svc.createSchedule(req.tenantContext.tenantId, req.tenantContext.branchId, dto);
    }

    @Put('schedules/:id')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Update schedule' })
    updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: any) {
        return this.svc.updateSchedule(req.tenantContext.tenantId, id, dto);
    }

    @Delete('schedules/:id')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete schedule' })
    deleteSchedule(@Param('id') id: string, @Req() req: any) {
        return this.svc.deleteSchedule(req.tenantContext.tenantId, id);
    }

    // ── Attendance ─────────────────────────────────────────────────────────────
    @Get('attendance/on-duty')
    @ApiOperation({ summary: 'List currently on-duty staff' })
    getOnDuty(@Req() req: any) {
        return this.svc.getOnDuty(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    @Get('attendance/list')
    @ApiOperation({ summary: 'List attendance logs' })
    listAttendance(
        @Query('from') from: string, @Query('to') to: string,
        @Query('staffId') staffId: string, @Req() req: any,
    ) {
        return this.svc.listAttendance(req.tenantContext.tenantId, req.tenantContext.branchId, from, to, staffId);
    }

    @Post('attendance/clock-in')
    @ApiOperation({ summary: 'Clock in (checks for duplicate)' })
    clockIn(@Body() dto: ClockInDto, @Req() req: any) {
        return this.svc.clockIn(req.tenantContext.tenantId, dto);
    }

    @Put('attendance/:id/clock-out')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Clock out' })
    clockOut(@Param('id') id: string, @Body() dto: ClockOutDto, @Req() req: any) {
        return this.svc.clockOut(req.tenantContext.tenantId, id, dto);
    }

    // ── Leave ──────────────────────────────────────────────────────────────────
    @Get('leave')
    @ApiOperation({ summary: 'List leave requests' })
    listLeave(@Query('status') status: string, @Req() req: any) {
        return this.svc.listLeaveRequests(req.tenantContext.tenantId, req.tenantContext.branchId, status);
    }

    @Post('leave')
    @ApiOperation({ summary: 'Submit leave request' })
    createLeave(@Body() dto: CreateLeaveRequestDto, @Req() req: any) {
        return this.svc.createLeaveRequest(req.tenantContext.tenantId, dto);
    }

    @Put('leave/:id/review')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve or reject leave request' })
    reviewLeave(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @Req() req: any) {
        return this.svc.reviewLeave(req.tenantContext.tenantId, id, req.tenantContext.userId, dto);
    }

    // ── Certifications ─────────────────────────────────────────────────────────
    @Get('certifications')
    @ApiOperation({ summary: 'List certifications' })
    listCerts(@Req() req: any) {
        return this.svc.listCertifications(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    @Get('certifications/expiring')
    @ApiOperation({ summary: 'Certifications expiring within 30 days' })
    expiring(@Req() req: any) {
        return this.svc.getExpiringSoon(req.tenantContext.tenantId, req.tenantContext.branchId);
    }

    @Post('certifications')
    @ApiOperation({ summary: 'Add certification' })
    addCert(@Body() dto: CreateCertificationDto, @Req() req: any) {
        return this.svc.addCertification(req.tenantContext.tenantId, dto);
    }

    @Delete('certifications/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete certification' })
    deleteCert(@Param('id') id: string, @Req() req: any) {
        return this.svc.deleteCertification(req.tenantContext.tenantId, id);
    }
}
