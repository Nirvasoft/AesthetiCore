import {
    Injectable, NotFoundException, BadRequestException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateInvoiceDto, RecordPaymentDto, VoidInvoiceDto,
    RefundDto, CreateInstalmentPlanDto, CommissionSearchDto, InvoiceSearchDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
    constructor(private prisma: PrismaService) { }

    // ── Helpers ─────────────────────────────────────────────────────────────────
    private async nextInvoiceNumber(branchId: string): Promise<string> {
        const count = await this.prisma.invoice.count({ where: { branchId } });
        const year = new Date().getFullYear();
        return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    private calcLine(qty: number, unit: number, pct = 0, flat = 0) {
        const gross = qty * unit;
        const discAmt = flat + (gross * pct) / 100;
        return { gross, discAmt, lineTotal: gross - discAmt };
    }

    // ── INVOICES ─────────────────────────────────────────────────────────────────

    async listInvoices(tenantId: string, dto: InvoiceSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
            branch: { tenantId },
            ...(dto.patientId && { patientId: dto.patientId }),
            ...(dto.status && { status: dto.status }),
            ...(dto.fromDate || dto.toDate ? {
                createdAt: {
                    ...(dto.fromDate && { gte: new Date(dto.fromDate) }),
                    ...(dto.toDate && { lte: new Date(dto.toDate) }),
                },
            } : {}),
        };

        const [total, invoices] = await this.prisma.$transaction([
            this.prisma.invoice.count({ where }),
            this.prisma.invoice.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
                    branch: { select: { id: true, name: true } },
                    _count: { select: { payments: true, items: true } },
                },
            }),
        ]);

        return { data: invoices, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getInvoice(tenantId: string, invoiceId: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, branch: { tenantId } },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
                branch: { select: { id: true, name: true } },
                items: true,
                payments: { include: { refunds: true } },
                instalmentPlan: { include: { payments: true } },
                commissions: true,
            },
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    async createInvoice(tenantId: string, branchId: string, createdById: string, dto: CreateInvoiceDto) {
        // Verify patient
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        return this.prisma.$transaction(async (tx) => {
            const invoiceNumber = await this.nextInvoiceNumber(branchId);

            // Calculate line items
            let subtotal = 0;
            let totalDiscount = dto.overallDiscountAmt ?? 0;

            const itemData = dto.items.map((item) => {
                const { lineTotal, discAmt } = this.calcLine(
                    item.quantity, item.unitPrice, item.discountPct, item.discountAmt,
                );
                subtotal += item.quantity * item.unitPrice;
                totalDiscount += discAmt;
                return {
                    description: item.description,
                    treatmentLineId: item.treatmentLineId,
                    productId: item.productId,
                    sessionId: dto.sessionId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPct: item.discountPct ?? 0,
                    discountAmt: discAmt,
                    lineTotal,
                    type: item.productId ? 'product' : 'service',
                };
            });

            const afterDiscount = subtotal - totalDiscount;
            const scPct = dto.serviceChargePct ?? 0;
            const serviceChargeAmt = (afterDiscount * scPct) / 100;
            const taxableBase = afterDiscount + serviceChargeAmt;
            const taxAmount = (taxableBase * dto.taxRate) / 100;
            const totalAmount = taxableBase + taxAmount;

            const invoice = await tx.invoice.create({
                data: {
                    branchId,
                    patientId: dto.patientId,
                    sessionId: dto.sessionId,
                    invoiceNumber,
                    status: 'ISSUED',
                    subtotal,
                    discountAmount: totalDiscount,
                    taxRate: dto.taxRate,
                    taxAmount,
                    serviceChargePct: scPct,
                    serviceChargeAmt,
                    totalAmount,
                    notes: dto.notes,
                    issuedAt: new Date(),
                    items: { create: itemData },
                },
                include: { items: true },
            });

            // Auto-compute commissions if session has a practitioner
            if (dto.sessionId) {
                const session = await tx.treatmentSession.findUnique({
                    where: { id: dto.sessionId },
                    select: { practitionerId: true },
                });
                if (session?.practitionerId) {
                    const staffProfile = await tx.staffProfile.findFirst({
                        where: { userId: session.practitionerId, branchId },
                        select: { commissionRate: true },
                    });
                    if (staffProfile) {
                        const commRate = Number(staffProfile.commissionRate);
                        const commAmt = (totalAmount * commRate);
                        const now = new Date();
                        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        await tx.commission.create({
                            data: {
                                practitionerId: session.practitionerId,
                                branchId,
                                invoiceId: invoice.id,
                                sessionId: dto.sessionId,
                                amount: commAmt,
                                rate: commRate,
                                periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
                                periodEnd,
                            },
                        });
                    }
                }
            }

            // Notify low paidAmount = 0
            return invoice;
        });
    }

    // ── PAYMENTS ─────────────────────────────────────────────────────────────────

    async recordPayment(tenantId: string, invoiceId: string, processedById: string, dto: RecordPaymentDto) {
        const invoice = await this.getInvoice(tenantId, invoiceId);

        if (['VOIDED', 'REFUNDED'].includes(invoice.status)) {
            throw new UnprocessableEntityException(`Cannot record payment on ${invoice.status} invoice`);
        }

        const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
        if (dto.amount > remaining + 0.01) {
            throw new BadRequestException(
                `Payment amount ฿${dto.amount} exceeds outstanding balance ฿${remaining.toFixed(2)}`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            // If paying from patient credit — deduct credit
            if (dto.method === 'PATIENT_CREDIT') {
                const patient = await tx.patient.findUnique({
                    where: { id: invoice.patientId },
                    select: { creditBalance: true },
                });
                if (!patient || Number(patient.creditBalance) < dto.amount) {
                    throw new UnprocessableEntityException('Insufficient patient credit balance');
                }
                await tx.patient.update({
                    where: { id: invoice.patientId },
                    data: { creditBalance: { decrement: dto.amount } },
                });
                await tx.creditTransaction.create({
                    data: {
                        patientId: invoice.patientId,
                        amount: -dto.amount,
                        type: 'DEDUCTION',
                        receiptRef: invoice.invoiceNumber,
                        note: `Invoice payment ${invoice.invoiceNumber}`,
                        processedById,
                    },
                });
            }

            const payment = await tx.payment.create({
                data: {
                    invoiceId,
                    method: dto.method,
                    amount: dto.amount,
                    reference: dto.reference,
                    note: dto.note,
                    processedById,
                },
            });

            const newPaid = Number(invoice.paidAmount) + dto.amount;
            const newStatus = newPaid >= Number(invoice.totalAmount) - 0.01 ? 'PAID' : 'PARTIALLY_PAID';

            await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    paidAmount: newPaid,
                    status: newStatus,
                    ...(newStatus === 'PAID' && { paidAt: new Date() }),
                },
            });

            // Auto-earn loyalty points: 1 point per 100 THB paid
            const pointsEarned = Math.floor(dto.amount / 100);
            if (pointsEarned > 0) {
                await tx.patient.update({
                    where: { id: invoice.patientId },
                    data: { loyaltyPoints: { increment: pointsEarned } },
                });
                await tx.loyaltyTransaction.create({
                    data: {
                        patientId: invoice.patientId,
                        points: pointsEarned,
                        type: 'EARN',
                        reference: invoice.invoiceNumber,
                        note: `Earned ${pointsEarned} pts from invoice ${invoice.invoiceNumber}`,
                    },
                });
            }

            return { payment, newStatus, newPaidAmount: newPaid, loyaltyPointsEarned: pointsEarned };
        });
    }

    // ── VOID ─────────────────────────────────────────────────────────────────────

    async voidInvoice(tenantId: string, invoiceId: string, userId: string, dto: VoidInvoiceDto) {
        const invoice = await this.getInvoice(tenantId, invoiceId);

        if (invoice.status === 'VOIDED') throw new UnprocessableEntityException('Invoice already voided');
        if (Number(invoice.paidAmount) > 0) {
            throw new UnprocessableEntityException(
                'Cannot void an invoice with payments recorded. Use refund instead.',
            );
        }

        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'VOIDED', voidedAt: new Date(), voidReason: dto.reason },
        });
    }

    // ── REFUND ────────────────────────────────────────────────────────────────────

    async issueRefund(tenantId: string, invoiceId: string, userId: string, dto: RefundDto) {
        const invoice = await this.getInvoice(tenantId, invoiceId);

        if (!['PAID', 'PARTIALLY_PAID'].includes(invoice.status)) {
            throw new UnprocessableEntityException('Can only refund PAID or PARTIALLY_PAID invoices');
        }
        if (dto.amount > Number(invoice.paidAmount)) {
            throw new BadRequestException(`Refund ฿${dto.amount} exceeds total paid ฿${invoice.paidAmount}`);
        }

        // Find a payment to attach refund to (most recent)
        const latestPayment = invoice.payments.sort(
            (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
        )[0];
        if (!latestPayment) throw new BadRequestException('No payments found to refund against');

        return this.prisma.$transaction(async (tx) => {
            const refund = await tx.refund.create({
                data: {
                    paymentId: latestPayment.id,
                    amount: dto.amount,
                    reason: dto.reason,
                    refundedToCredit: dto.refundToCredit ?? false,
                    processedById: userId,
                },
            });

            const newPaid = Number(invoice.paidAmount) - dto.amount;
            const newStatus = newPaid <= 0 ? 'REFUNDED' : 'PARTIALLY_PAID';

            await tx.invoice.update({
                where: { id: invoiceId },
                data: { paidAmount: newPaid, status: newStatus },
            });

            // If refunding to credit, add to patient credit balance
            if (dto.refundToCredit) {
                await tx.patient.update({
                    where: { id: invoice.patientId },
                    data: { creditBalance: { increment: dto.amount } },
                });
                await tx.creditTransaction.create({
                    data: {
                        patientId: invoice.patientId,
                        amount: dto.amount,
                        type: 'REFUND',
                        receiptRef: invoice.invoiceNumber,
                        note: `Refund from invoice ${invoice.invoiceNumber}`,
                        processedById: userId,
                    },
                });
            }

            return { refund, newStatus, newPaidAmount: newPaid };
        });
    }

    // ── INSTALMENT PLANS ──────────────────────────────────────────────────────────

    async createInstalmentPlan(tenantId: string, dto: CreateInstalmentPlanDto) {
        const invoice = await this.getInvoice(tenantId, dto.invoiceId);
        if (invoice.instalmentPlan) {
            throw new UnprocessableEntityException('Invoice already has an instalment plan');
        }

        const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
        const perInstalment = outstanding / dto.instalments;
        const interval = dto.intervalDays ?? 30;
        const firstDue = new Date(dto.firstDueDate);

        const planPayments = Array.from({ length: dto.instalments }, (_, i) => {
            const dueDate = new Date(firstDue);
            dueDate.setDate(firstDue.getDate() + i * interval);
            return { dueDate, amount: perInstalment, status: 'PENDING' };
        });

        return this.prisma.instalmentPlan.create({
            data: {
                invoiceId: dto.invoiceId,
                instalments: dto.instalments,
                intervalDays: interval,
                payments: { create: planPayments },
            },
            include: { payments: true },
        });
    }

    // ── COMMISSIONS ───────────────────────────────────────────────────────────────

    async getCommissions(tenantId: string, dto: CommissionSearchDto) {
        return this.prisma.commission.findMany({
            where: {
                invoice: { branch: { tenantId } },
                ...(dto.practitionerId && { practitionerId: dto.practitionerId }),
                ...(dto.branchId && { branchId: dto.branchId }),
                ...(dto.fromDate || dto.toDate ? {
                    periodStart: {
                        ...(dto.fromDate && { gte: new Date(dto.fromDate) }),
                        ...(dto.toDate && { lte: new Date(dto.toDate) }),
                    },
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                invoice: { select: { invoiceNumber: true, totalAmount: true, status: true } },
            },
        });
    }

    async markCommissionPaid(tenantId: string, commissionId: string) {
        const comm = await this.prisma.commission.findFirst({
            where: { id: commissionId, invoice: { branch: { tenantId } } },
        });
        if (!comm) throw new NotFoundException('Commission record not found');

        return this.prisma.commission.update({
            where: { id: commissionId },
            data: { isPaid: true, paidAt: new Date() },
        });
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────────────

    async getDashboard(tenantId: string, branchId?: string, fromDate?: string, toDate?: string) {
        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        const where: any = { branch: { tenantId }, ...(branchId && { branchId }) };
        const periodWhere = { ...where, createdAt: { gte: start, lte: end } };

        const commWhere: any = {
            invoice: { branch: { tenantId } },
            ...(branchId && { branchId }),
        };

        const [
            totalInvoices, paidInvoices, partialInvoices, overdueCount,
            revenueData, pendingComm, paidComm,
        ] = await this.prisma.$transaction([
            this.prisma.invoice.count({ where: periodWhere }),
            this.prisma.invoice.count({ where: { ...periodWhere, status: 'PAID' } }),
            this.prisma.invoice.count({ where: { ...periodWhere, status: 'PARTIALLY_PAID' } }),
            this.prisma.invoice.count({ where: { ...where, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } } }),
            // Sum revenue
            this.prisma.invoice.aggregate({ where: { ...periodWhere, status: 'PAID' }, _sum: { totalAmount: true } }),
            this.prisma.commission.aggregate({ where: { ...commWhere, isPaid: false }, _sum: { amount: true } }),
            this.prisma.commission.aggregate({ where: { ...commWhere, isPaid: true, createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        ]);

        return {
            period: { from: start, to: end },
            invoices: {
                total: totalInvoices, paid: paidInvoices,
                partial: partialInvoices, outstanding: overdueCount,
            },
            revenue: { total: Number(revenueData._sum.totalAmount ?? 0) },
            commissions: {
                pending: Number(pendingComm._sum.amount ?? 0),
                paid: Number(paidComm._sum.amount ?? 0),
            },
        };
    }
}
