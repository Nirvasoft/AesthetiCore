import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly svc: AnalyticsService) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Executive dashboard — cross-module KPIs' })
    getDashboard(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getExecutiveDashboard(req.tenantContext.tenantId, branchId, from, to);
    }

    @Get('revenue')
    @ApiOperation({ summary: 'Monthly revenue trend' })
    getRevenue(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getRevenueTrend(req.tenantContext.tenantId, branchId, from, to);
    }

    @Get('patients')
    @ApiOperation({ summary: 'Patient metrics — growth, retention, segments' })
    getPatientMetrics(@Req() req: any) {
        return this.svc.getPatientMetrics(req.tenantContext.tenantId);
    }

    @Get('practitioners')
    @ApiOperation({ summary: 'Practitioner performance — sessions, commissions' })
    getPractitioners(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getPractitionerPerformance(req.tenantContext.tenantId, branchId, from, to);
    }

    @Get('inventory')
    @ApiOperation({ summary: 'Inventory consumption — top products, wastage, stock by branch' })
    getInventory(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getInventoryConsumption(req.tenantContext.tenantId, branchId, from, to);
    }

    @Get('branches')
    @ApiOperation({ summary: 'Branch comparison — revenue, appointments per branch' })
    getBranches(
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getBranchComparison(req.tenantContext.tenantId, from, to);
    }

    @Get('appointments')
    @ApiOperation({ summary: 'Appointment analytics — status distribution, peak hours' })
    getAppointments(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getAppointmentAnalytics(req.tenantContext.tenantId, branchId, from, to);
    }

    @Get('treatments')
    @ApiOperation({ summary: 'Top treatments by volume and revenue' })
    getTreatments(
        @Query('branchId') branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Req() req: any,
    ) {
        return this.svc.getTopTreatments(req.tenantContext.tenantId, branchId, from, to);
    }
}
