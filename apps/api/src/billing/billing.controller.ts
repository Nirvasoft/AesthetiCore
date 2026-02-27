import {
    Controller, Get, Post, Put, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
    CreateInvoiceDto, RecordPaymentDto, VoidInvoiceDto,
    RefundDto, CreateInstalmentPlanDto, CommissionSearchDto, InvoiceSearchDto,
} from './dto/billing.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
    constructor(private readonly svc: BillingService) { }

    // ── Dashboard ──────────────────────────────────────────────────────────────
    @Get('dashboard')
    @ApiOperation({ summary: 'Billing dashboard — revenue, invoice counts, commission summary' })
    getDashboard(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getDashboard(req.tenantContext.tenantId, branchId, from, to);
    }

    // ── Invoices ───────────────────────────────────────────────────────────────
    @Get('invoices')
    @ApiOperation({ summary: 'List invoices (filterable by patient, status, date range)' })
    listInvoices(@Query() q: InvoiceSearchDto, @Req() req: any) {
        return this.svc.listInvoices(req.tenantContext.tenantId, q);
    }

    @Post('invoices')
    @ApiOperation({ summary: 'Create and issue an invoice with line items, tax, and service charge' })
    createInvoice(@Body() dto: CreateInvoiceDto, @Req() req: any) {
        return this.svc.createInvoice(
            req.tenantContext.tenantId, req.tenantContext.branchId, req.user.id, dto,
        );
    }

    @Get('invoices/:id')
    @ApiOperation({ summary: 'Get full invoice with items, payments, refunds, and instalment plan' })
    getInvoice(@Param('id') id: string, @Req() req: any) {
        return this.svc.getInvoice(req.tenantContext.tenantId, id);
    }

    // ── Payments ───────────────────────────────────────────────────────────────
    @Post('invoices/:id/payments')
    @ApiOperation({ summary: 'Record a payment (cash/card/QR/credit/instalment) — auto-earns loyalty points' })
    recordPayment(
        @Param('id') id: string,
        @Body() dto: RecordPaymentDto,
        @Req() req: any,
    ) {
        return this.svc.recordPayment(req.tenantContext.tenantId, id, req.user.id, dto);
    }

    // ── Void ───────────────────────────────────────────────────────────────────
    @Put('invoices/:id/void')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Void an invoice (only if no payments recorded)' })
    voidInvoice(
        @Param('id') id: string,
        @Body() dto: VoidInvoiceDto,
        @Req() req: any,
    ) {
        return this.svc.voidInvoice(req.tenantContext.tenantId, id, req.user.id, dto);
    }

    // ── Refund ─────────────────────────────────────────────────────────────────
    @Post('invoices/:id/refund')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Issue a refund (full or partial) — optionally return as patient credit' })
    issueRefund(
        @Param('id') id: string,
        @Body() dto: RefundDto,
        @Req() req: any,
    ) {
        return this.svc.issueRefund(req.tenantContext.tenantId, id, req.user.id, dto);
    }

    // ── Instalment Plans ───────────────────────────────────────────────────────
    @Post('instalment-plans')
    @ApiOperation({ summary: 'Create an instalment plan for an invoice (splits outstanding balance evenly)' })
    createInstalmentPlan(@Body() dto: CreateInstalmentPlanDto, @Req() req: any) {
        return this.svc.createInstalmentPlan(req.tenantContext.tenantId, dto);
    }

    // ── Commissions ────────────────────────────────────────────────────────────
    @Get('commissions')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'List commissions filterable by practitioner, branch, date range' })
    getCommissions(@Query() q: CommissionSearchDto, @Req() req: any) {
        return this.svc.getCommissions(req.tenantContext.tenantId, q);
    }

    @Put('commissions/:id/paid')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark a commission as paid out' })
    markCommissionPaid(@Param('id') id: string, @Req() req: any) {
        return this.svc.markCommissionPaid(req.tenantContext.tenantId, id);
    }
}
