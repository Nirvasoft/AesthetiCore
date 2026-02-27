import {
    Controller, Get, Post, Put, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import {
    LogInteractionDto,
    CreditTopUpDto,
    CreditDeductDto,
    AdjustLoyaltyDto,
    CreateCampaignDto,
    UpdateCampaignDto,
    InteractionSearchDto,
} from './dto/crm.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
    constructor(private readonly crmService: CrmService) { }

    // ── Dashboard stats ────────────────────────────────────────────────────────
    @Get('dashboard')
    @ApiOperation({ summary: 'CRM dashboard — patient counts by segment, pending follow-ups, campaign stats' })
    getDashboard(@Req() req: any) {
        return this.crmService.getDashboardStats(req.tenantContext.tenantId);
    }

    // ── Interactions ───────────────────────────────────────────────────────────
    @Get('interactions')
    @ApiOperation({ summary: 'List CRM interactions (all patients or filtered by patientId)' })
    listInteractions(@Query() query: InteractionSearchDto, @Req() req: any) {
        return this.crmService.getInteractions(req.tenantContext.tenantId, query);
    }

    @Get('interactions/follow-ups')
    @ApiOperation({ summary: 'Get pending follow-ups due within 7 days' })
    getFollowUps(@Req() req: any) {
        return this.crmService.getFollowUps(
            req.tenantContext.tenantId,
            req.tenantContext.branchId,
        );
    }

    @Post('patients/:patientId/interactions')
    @ApiOperation({ summary: 'Log a CRM interaction for a patient (call, consultation, follow-up…)' })
    logInteraction(
        @Param('patientId') patientId: string,
        @Body() dto: LogInteractionDto,
        @Req() req: any,
    ) {
        return this.crmService.logInteraction(
            req.tenantContext.tenantId,
            req.tenantContext.branchId,
            req.user.id,
            patientId,
            dto,
        );
    }

    @Get('patients/:patientId/interactions')
    @ApiOperation({ summary: 'Get all CRM interactions for a patient' })
    getPatientInteractions(@Param('patientId') patientId: string, @Req() req: any) {
        return this.crmService.getPatientInteractions(req.tenantContext.tenantId, patientId);
    }

    @Put('interactions/:id/follow-up')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark a follow-up as completed' })
    markFollowedUp(@Param('id') id: string, @Req() req: any) {
        return this.crmService.markFollowedUp(req.tenantContext.tenantId, id);
    }

    // ── Credit Balance ─────────────────────────────────────────────────────────
    @Post('patients/:patientId/credit/top-up')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN, UserRole.RECEPTIONIST)
    @ApiOperation({ summary: 'Top up patient credit balance' })
    topUpCredit(
        @Param('patientId') patientId: string,
        @Body() dto: CreditTopUpDto,
        @Req() req: any,
    ) {
        return this.crmService.topUpCredit(
            req.tenantContext.tenantId, patientId, dto, req.user.id,
        );
    }

    @Post('patients/:patientId/credit/deduct')
    @ApiOperation({ summary: 'Deduct from patient credit balance (invoice payment)' })
    deductCredit(
        @Param('patientId') patientId: string,
        @Body() dto: CreditDeductDto,
        @Req() req: any,
    ) {
        return this.crmService.deductCredit(
            req.tenantContext.tenantId, patientId, dto, req.user.id,
        );
    }

    @Get('patients/:patientId/credit')
    @ApiOperation({ summary: 'Get patient credit balance and transaction history' })
    getCreditHistory(@Param('patientId') patientId: string, @Req() req: any) {
        return this.crmService.getCreditHistory(req.tenantContext.tenantId, patientId);
    }

    // ── Loyalty Points ─────────────────────────────────────────────────────────
    @Post('patients/:patientId/loyalty')
    @ApiOperation({ summary: 'Adjust loyalty points (earn, redeem, expire, admin adjust)' })
    adjustLoyalty(
        @Param('patientId') patientId: string,
        @Body() dto: AdjustLoyaltyDto,
        @Req() req: any,
    ) {
        return this.crmService.adjustLoyalty(req.tenantContext.tenantId, patientId, dto);
    }

    @Get('patients/:patientId/loyalty')
    @ApiOperation({ summary: 'Get patient loyalty points balance and ledger' })
    getLoyaltyHistory(@Param('patientId') patientId: string, @Req() req: any) {
        return this.crmService.getLoyaltyHistory(req.tenantContext.tenantId, patientId);
    }

    // ── Campaigns ──────────────────────────────────────────────────────────────
    @Get('campaigns')
    @ApiOperation({ summary: 'List all campaigns' })
    listCampaigns(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Req() req: any,
    ) {
        return this.crmService.listCampaigns(req.tenantContext.tenantId, page, limit);
    }

    @Post('campaigns')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @ApiOperation({ summary: 'Create a new campaign with segment targeting and optional schedule' })
    createCampaign(@Body() dto: CreateCampaignDto, @Req() req: any) {
        return this.crmService.createCampaign(req.tenantContext.tenantId, req.user.id, dto);
    }

    @Put('campaigns/:id')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @ApiOperation({ summary: 'Update campaign (cannot edit after SENT)' })
    updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto, @Req() req: any) {
        return this.crmService.updateCampaign(req.tenantContext.tenantId, id, dto);
    }

    @Post('campaigns/:id/dispatch')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Dispatch campaign — enqueues notifications for all target patients' })
    dispatchCampaign(@Param('id') id: string, @Req() req: any) {
        return this.crmService.dispatchCampaign(req.tenantContext.tenantId, id);
    }

    // ── Notification Log ───────────────────────────────────────────────────────
    @Get('notifications')
    @ApiOperation({ summary: 'View notification send/queue history' })
    getNotificationLog(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Req() req: any,
    ) {
        return this.crmService.getNotificationLog(req.tenantContext.tenantId, page, limit);
    }
}
