import {
    Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    // ── Executive Dashboard ────────────────────────────────────────────────────
    async getExecutiveDashboard(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const branchFilter: any = { branch: { tenantId }, ...(branchId && { branchId }) };
        const periodFilter = { ...branchFilter, createdAt: { gte: start, lte: end } };

        const [
            totalRevenue, invoiceCount, paidInvoices,
            patientCount, newPatients,
            appointmentCount, noShowCount,
            inventoryValue,
        ] = await this.prisma.$transaction([
            this.prisma.invoice.aggregate({ where: { ...periodFilter, status: 'PAID' }, _sum: { totalAmount: true } }),
            this.prisma.invoice.count({ where: periodFilter }),
            this.prisma.invoice.count({ where: { ...periodFilter, status: 'PAID' } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true } }),
            this.prisma.patient.count({ where: { tenantId, createdAt: { gte: start, lte: end } } }),
            this.prisma.appointment.count({ where: { ...branchFilter, startTime: { gte: start, lte: end } } }),
            this.prisma.appointment.count({ where: { ...branchFilter, startTime: { gte: start, lte: end }, status: 'NO_SHOW' } }),
            this.prisma.inventoryStock.aggregate({ where: branchFilter, _sum: { quantityOnHand: true } }),
        ]);

        const revenue = Number(totalRevenue._sum.totalAmount ?? 0);
        const avgInvoice = paidInvoices > 0 ? revenue / paidInvoices : 0;

        return {
            period: { from: start, to: end },
            revenue: { total: revenue, avgInvoice: Math.round(avgInvoice) },
            invoices: { total: invoiceCount, paid: paidInvoices },
            patients: { total: patientCount, new: newPatients },
            appointments: { total: appointmentCount, noShow: noShowCount, noShowRate: appointmentCount > 0 ? Math.round((noShowCount / appointmentCount) * 100) : 0 },
            inventory: { totalStockUnits: Number(inventoryValue._sum.quantityOnHand ?? 0) },
        };
    }

    // ── Revenue Trend ──────────────────────────────────────────────────────────
    async getRevenueTrend(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const end = to ? new Date(to) : now;

        const branchFilter: any = { branch: { tenantId }, ...(branchId && { branchId }) };

        const invoices = await this.prisma.invoice.findMany({
            where: { ...branchFilter, status: 'PAID', paidAt: { gte: start, lte: end } },
            select: { totalAmount: true, paidAt: true },
            orderBy: { paidAt: 'asc' },
        });

        // Group by month
        const monthly: Record<string, number> = {};
        for (const inv of invoices) {
            if (!inv.paidAt) continue;
            const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = (monthly[key] ?? 0) + Number(inv.totalAmount);
        }

        return Object.entries(monthly).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));
    }

    // ── Patient Metrics ────────────────────────────────────────────────────────
    async getPatientMetrics(tenantId: string) {
        const now = new Date();
        const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

        const [total, active, vip, inactive, newLast30, newLast90] = await this.prisma.$transaction([
            this.prisma.patient.count({ where: { tenantId } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true } }),
            this.prisma.patient.count({ where: { tenantId, segment: 'VIP' } }),
            this.prisma.patient.count({ where: { tenantId, isActive: false } }),
            this.prisma.patient.count({ where: { tenantId, createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } } }),
            this.prisma.patient.count({ where: { tenantId, createdAt: { gte: new Date(now.getTime() - 90 * 86400000) } } }),
        ]);

        // Monthly new patients (last 6 months)
        const patients = await this.prisma.patient.findMany({
            where: { tenantId, createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true },
        });

        const monthlyNew: Record<string, number> = {};
        for (const p of patients) {
            const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
            monthlyNew[key] = (monthlyNew[key] ?? 0) + 1;
        }

        return {
            total, active, vip, inactive,
            newLast30Days: newLast30,
            newLast90Days: newLast90,
            retentionRate: total > 0 ? Math.round((active / total) * 100) : 0,
            monthlyGrowth: Object.entries(monthlyNew).map(([month, count]) => ({ month, count })),
        };
    }

    // ── Practitioner Performance ───────────────────────────────────────────────
    async getPractitionerPerformance(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const sessions = await this.prisma.treatmentSession.groupBy({
            by: ['practitionerId'],
            where: {
                tenantId,
                ...(branchId && { branchId }),
                visitDate: { gte: start, lte: end },
                status: 'COMPLETED',
            },
            _count: { id: true },
        });

        const commissions = await this.prisma.commission.groupBy({
            by: ['practitionerId'],
            where: {
                invoice: { branch: { tenantId } },
                ...(branchId && { branchId }),
                periodStart: { gte: start },
            },
            _sum: { amount: true },
            _count: { id: true },
        });

        // Merge
        const practMap: Record<string, { sessions: number; revenue: number; commissions: number }> = {};
        for (const s of sessions) {
            practMap[s.practitionerId] = { sessions: s._count.id, revenue: 0, commissions: 0 };
        }
        for (const c of commissions) {
            if (!practMap[c.practitionerId]) practMap[c.practitionerId] = { sessions: 0, revenue: 0, commissions: 0 };
            practMap[c.practitionerId].commissions = Number(c._sum.amount ?? 0);
        }

        return Object.entries(practMap)
            .map(([practitionerId, data]) => ({ practitionerId, ...data }))
            .sort((a, b) => b.sessions - a.sessions);
    }

    // ── Inventory Consumption ──────────────────────────────────────────────────
    async getInventoryConsumption(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const transactions = await this.prisma.inventoryTransaction.findMany({
            where: {
                branch: { tenantId },
                ...(branchId && { branchId }),
                createdAt: { gte: start, lte: end },
            },
            include: {
                batch: { select: { productId: true, product: { select: { name: true } } } },
            },
        });

        // Top consumed (negative qty = consumption)
        const consumption: Record<string, { name: string; used: number; wasted: number }> = {};
        for (const tx of transactions) {
            const pid = tx.batch?.productId ?? 'unknown';
            const name = tx.batch?.product?.name ?? 'Unknown';
            if (!consumption[pid]) consumption[pid] = { name, used: 0, wasted: 0 };

            if (tx.type === 'USAGE') consumption[pid].used += Math.abs(Number(tx.quantity));
            if (tx.type === 'WASTAGE') consumption[pid].wasted += Math.abs(Number(tx.quantity));
        }

        const topConsumed = Object.entries(consumption)
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => b.used - a.used)
            .slice(0, 15);

        // Stock value by branch
        const stockByBranch = await this.prisma.inventoryStock.groupBy({
            by: ['branchId'],
            where: { branch: { tenantId } },
            _sum: { quantityOnHand: true },
        });

        return { topConsumed, stockByBranch };
    }

    // ── Branch Comparison ──────────────────────────────────────────────────────
    async getBranchComparison(tenantId: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const branches = await this.prisma.branch.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, name: true },
        });

        const results = [];
        for (const branch of branches) {
            const [revenue, patients, appointments] = await this.prisma.$transaction([
                this.prisma.invoice.aggregate({
                    where: { branchId: branch.id, status: 'PAID', paidAt: { gte: start, lte: end } },
                    _sum: { totalAmount: true },
                }),
                this.prisma.appointment.count({
                    where: { branchId: branch.id, startTime: { gte: start, lte: end } },
                }),
                this.prisma.appointment.count({
                    where: { branchId: branch.id, startTime: { gte: start, lte: end }, status: 'COMPLETED' },
                }),
            ]);

            results.push({
                branchId: branch.id,
                branchName: branch.name,
                revenue: Number(revenue._sum.totalAmount ?? 0),
                totalAppointments: patients,
                completedAppointments: appointments,
            });
        }

        return results.sort((a, b) => b.revenue - a.revenue);
    }

    // ── Appointment Analytics ──────────────────────────────────────────────────
    async getAppointmentAnalytics(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const where: any = { branch: { tenantId }, ...(branchId && { branchId }), startTime: { gte: start, lte: end } };

        // Status distribution
        const statusGroups = await this.prisma.appointment.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
        });

        // Peak hours
        const appointments = await this.prisma.appointment.findMany({
            where,
            select: { startTime: true },
        });

        const hourCounts: Record<number, number> = {};
        for (const a of appointments) {
            const h = new Date(a.startTime).getHours();
            hourCounts[h] = (hourCounts[h] ?? 0) + 1;
        }

        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: Number(hour), count }))
            .sort((a, b) => a.hour - b.hour);

        return {
            statusDistribution: statusGroups.map(g => ({ status: g.status, count: g._count.id })),
            peakHours,
        };
    }

    // ── Top Treatments ─────────────────────────────────────────────────────────
    async getTopTreatments(tenantId: string, branchId?: string, from?: string, to?: string) {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = to ? new Date(to) : now;

        const lines = await this.prisma.treatmentLine.findMany({
            where: {
                session: {
                    tenantId,
                    ...(branchId && { branchId }),
                    visitDate: { gte: start, lte: end },
                    status: 'COMPLETED',
                },
            },
            select: { productName: true, quantityUsed: true, price: true },
        });

        const treatments: Record<string, { name: string; count: number; revenue: number }> = {};
        for (const l of lines) {
            const key = l.productName;
            if (!treatments[key]) treatments[key] = { name: key, count: 0, revenue: 0 };
            treatments[key].count += 1;
            treatments[key].revenue += Number(l.quantityUsed) * Number(l.price);
        }

        return Object.values(treatments)
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
    }
}
