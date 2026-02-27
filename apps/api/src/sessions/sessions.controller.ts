import {
    Controller, Get, Post, Put, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
    CreateSessionDto,
    UpdateSessionDto,
    AddAddendumDto,
    ContraindicationOverrideDto,
    SessionSearchDto,
    CreateTreatmentLineDto,
} from './dto/session.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) { }

    // ─── List sessions ──────────────────────────────────────────────────────
    @Get()
    @ApiOperation({ summary: 'List treatment sessions — filterable by patient, branch, status' })
    findAll(@Query() query: SessionSearchDto, @Req() req: any) {
        return this.sessionsService.findAll(req.tenantContext.tenantId, query);
    }

    // ─── Create session ─────────────────────────────────────────────────────
    @Post()
    @ApiOperation({ summary: 'Open a new treatment session with SOAP notes + treatment lines' })
    create(@Body() dto: CreateSessionDto, @Req() req: any) {
        return this.sessionsService.create(
            req.tenantContext.tenantId,
            req.tenantContext.branchId,
            req.user.id,
            dto,
        );
    }

    // ─── Get session ────────────────────────────────────────────────────────
    @Get(':id')
    @ApiOperation({ summary: 'Get full session detail (SOAP, treatment lines, photos, audit)' })
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.sessionsService.findOne(req.tenantContext.tenantId, id);
    }

    // ─── Update session (SOAP) ─────────────────────────────────────────────
    @Put(':id')
    @ApiOperation({ summary: 'Update SOAP notes — blocked if session is locked (422)' })
    update(@Param('id') id: string, @Body() dto: UpdateSessionDto, @Req() req: any) {
        return this.sessionsService.update(
            req.tenantContext.tenantId, id, req.user.id, dto,
        );
    }

    // ─── Add treatment line ─────────────────────────────────────────────────
    @Post(':id/treatment-lines')
    @ApiOperation({ summary: 'Add a product/service treatment line — triggers FEFO inventory deduction + contraindication check' })
    addTreatmentLine(
        @Param('id') id: string,
        @Body() dto: CreateTreatmentLineDto,
        @Req() req: any,
    ) {
        return this.sessionsService.addTreatmentLine(
            req.tenantContext.tenantId,
            id,
            req.tenantContext.branchId,
            req.user.id,
            dto,
        );
    }

    // ─── Override contraindication (Doctor only) ────────────────────────────
    @Post(':id/contraindication-override')
    @Roles(UserRole.DOCTOR, UserRole.HQ_ADMIN)
    @ApiOperation({
        summary: 'Override a contraindication alert — doctor only, requires typed reason ≥ 10 chars, logged to audit',
    })
    overrideContraindication(
        @Param('id') id: string,
        @Body() dto: ContraindicationOverrideDto,
        @Req() req: any,
    ) {
        return this.sessionsService.overrideContraindication(
            req.tenantContext.tenantId, id, req.user.id, dto,
        );
    }

    // ─── Doctor e-sign + lock ───────────────────────────────────────────────
    @Post(':id/sign')
    @Roles(UserRole.DOCTOR, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Doctor e-sign and lock session — sets is_locked=TRUE, status=COMPLETED. Any further PUT returns SESSION_LOCKED (422)',
    })
    signAndLock(@Param('id') id: string, @Req() req: any) {
        return this.sessionsService.signAndLock(req.tenantContext.tenantId, id, req.user.id);
    }

    // ─── Add addendum (works even on locked sessions) ──────────────────────
    @Post(':id/addenda')
    @ApiOperation({ summary: 'Add an addendum — allowed even after session is locked' })
    addAddendum(
        @Param('id') id: string,
        @Body() dto: AddAddendumDto,
        @Req() req: any,
    ) {
        return this.sessionsService.addAddendum(
            req.tenantContext.tenantId, id, req.user.id, dto,
        );
    }

    // ─── Audit log ──────────────────────────────────────────────────────────
    @Get(':id/audit-log')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER, UserRole.DOCTOR)
    @ApiOperation({ summary: 'Get immutable EMR audit log for session' })
    getAuditLog(@Param('id') id: string, @Req() req: any) {
        return this.sessionsService.getAuditLog(req.tenantContext.tenantId, id);
    }
}
