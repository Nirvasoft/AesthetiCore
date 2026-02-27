import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    LogInteractionDto,
    CreditTopUpDto,
    CreditDeductDto,
    AdjustLoyaltyDto,
    CreateCampaignDto,
    UpdateCampaignDto,
    InteractionSearchDto,
    CampaignStatus,
} from './dto/crm.dto';

@Injectable()
export class CrmService {
    constructor(private prisma: PrismaService) { }

    // ───────────────────────────────────────────────────────────────────────────
    // CRM INTERACTIONS
    // ───────────────────────────────────────────────────────────────────────────

    async logInteraction(
        tenantId: string,
        branchId: string,
        staffId: string,
        patientId: string,
        dto: LogInteractionDto,
    ) {
        // Verify patient belongs to tenant
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const interaction = await this.prisma.crmInteraction.create({
            data: {
                patientId,
                branchId,
                staffId,
                type: dto.type,
                channel: dto.channel,
                summary: dto.summary,
                details: dto.details,
                followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
                outcome: dto.outcome,
            },
        });

        // If high-value interaction, consider segment upgrade
        await this.evaluateSegmentUpgrade(tenantId, patientId);

        return interaction;
    }

    async getInteractions(tenantId: string, dto: InteractionSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 20, 100);
        const skip = (page - 1) * limit;

        // Join through patient for tenant isolation
        const where: any = {
            patient: { tenantId },
            ...(dto.patientId && { patientId: dto.patientId }),
            ...(dto.type && { type: dto.type }),
        };

        const [total, interactions] = await this.prisma.$transaction([
            this.prisma.crmInteraction.count({ where }),
            this.prisma.crmInteraction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
                },
            }),
        ]);

        return { data: interactions, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getPatientInteractions(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        return this.prisma.crmInteraction.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getFollowUps(tenantId: string, branchId?: string) {
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.prisma.crmInteraction.findMany({
            where: {
                patient: { tenantId },
                ...(branchId && { branchId }),
                followUpDate: { gte: now, lte: sevenDaysLater },
                isFollowedUp: false,
            },
            orderBy: { followUpDate: 'asc' },
            include: {
                patient: {
                    select: {
                        id: true, firstName: true, lastName: true, phone: true,
                        patientCode: true, segment: true,
                    },
                },
            },
        });
    }

    async markFollowedUp(tenantId: string, interactionId: string) {
        const interaction = await this.prisma.crmInteraction.findFirst({
            where: { id: interactionId, patient: { tenantId } },
        });
        if (!interaction) throw new NotFoundException('Interaction not found');

        return this.prisma.crmInteraction.update({
            where: { id: interactionId },
            data: { isFollowedUp: true, followedUpAt: new Date() },
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CREDIT BALANCE
    // ───────────────────────────────────────────────────────────────────────────

    async topUpCredit(tenantId: string, patientId: string, dto: CreditTopUpDto, staffId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const updated = await this.prisma.$transaction(async (tx) => {
            // Credit the balance
            const p = await tx.patient.update({
                where: { id: patientId },
                data: { creditBalance: { increment: dto.amount } },
                select: { id: true, creditBalance: true },
            });

            // Log the credit transaction
            await tx.creditTransaction.create({
                data: {
                    patientId,
                    amount: dto.amount,
                    type: 'TOP_UP',
                    note: dto.note,
                    receiptRef: dto.receiptRef,
                    processedById: staffId,
                },
            });

            return p;
        });

        return updated;
    }

    async deductCredit(tenantId: string, patientId: string, dto: CreditDeductDto, staffId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        if (patient.creditBalance < dto.amount) {
            throw new UnprocessableEntityException(
                `Insufficient credit balance. Available: ${patient.creditBalance}, Required: ${dto.amount}`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const p = await tx.patient.update({
                where: { id: patientId },
                data: { creditBalance: { decrement: dto.amount } },
                select: { id: true, creditBalance: true },
            });

            await tx.creditTransaction.create({
                data: {
                    patientId,
                    amount: -dto.amount,
                    type: 'DEDUCTION',
                    note: dto.note,
                    receiptRef: dto.invoiceRef,
                    processedById: staffId,
                },
            });

            return p;
        });
    }

    async getCreditHistory(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
            select: { id: true, creditBalance: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const transactions = await this.prisma.creditTransaction.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return { balance: patient.creditBalance, transactions };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LOYALTY POINTS
    // ───────────────────────────────────────────────────────────────────────────

    async adjustLoyalty(tenantId: string, patientId: string, dto: AdjustLoyaltyDto) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId, isActive: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        if (dto.type === 'REDEEM' && patient.loyaltyPoints < dto.points) {
            throw new UnprocessableEntityException(
                `Insufficient loyalty points. Available: ${patient.loyaltyPoints}`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.patient.update({
                where: { id: patientId },
                data: { loyaltyPoints: { increment: dto.points } },
                select: { id: true, loyaltyPoints: true },
            });

            await tx.loyaltyTransaction.create({
                data: {
                    patientId,
                    points: dto.points,
                    type: dto.type,
                    reference: dto.reference,
                    note: dto.note,
                },
            });

            return updated;
        });
    }

    async getLoyaltyHistory(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
            select: { id: true, loyaltyPoints: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const ledger = await this.prisma.loyaltyTransaction.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return { points: patient.loyaltyPoints, ledger };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // SEGMENT ENGINE — auto-upgrade based on activity
    // ───────────────────────────────────────────────────────────────────────────

    private async evaluateSegmentUpgrade(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
            select: {
                id: true, segment: true, loyaltyPoints: true,
                _count: { select: { sessions: true, invoices: true } },
            },
        });
        if (!patient) return;

        let newSegment = patient.segment;

        // Simple rule engine — configurable per tenant in Phase 9
        if (patient.loyaltyPoints >= 10000 || patient._count.sessions >= 20) {
            newSegment = 'VIP';
        } else if (patient._count.sessions >= 5 || patient.loyaltyPoints >= 1000) {
            newSegment = 'ACTIVE';
        } else if (patient._count.sessions === 0) {
            newSegment = 'LEAD';
        }

        if (newSegment !== patient.segment) {
            await this.prisma.patient.update({
                where: { id: patientId },
                data: { segment: newSegment as any },
            });
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CAMPAIGNS
    // ───────────────────────────────────────────────────────────────────────────

    async createCampaign(tenantId: string, createdById: string, dto: CreateCampaignDto) {
        // Estimate audience size
        const audienceCount = await this.prisma.patient.count({
            where: {
                tenantId,
                isActive: true,
                isAnonymized: false,
                ...(dto.targetSegments?.length && { segment: { in: dto.targetSegments as any[] } }),
            },
        });

        const campaign = await this.prisma.campaign.create({
            data: {
                tenantId,
                createdById,
                name: dto.name,
                description: dto.description,
                channel: dto.channel,
                messageTemplate: dto.messageTemplate,
                targetSegments: dto.targetSegments ?? [],
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                audienceCount,
                status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
            },
        });

        return { ...campaign, audienceCount };
    }

    async listCampaigns(tenantId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [total, campaigns] = await this.prisma.$transaction([
            this.prisma.campaign.count({ where: { tenantId } }),
            this.prisma.campaign.findMany({
                where: { tenantId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return { data: campaigns, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async updateCampaign(tenantId: string, campaignId: string, dto: UpdateCampaignDto) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, tenantId },
        });
        if (!campaign) throw new NotFoundException('Campaign not found');
        if (campaign.status === 'SENT') {
            throw new UnprocessableEntityException('Cannot edit a sent campaign');
        }

        return this.prisma.campaign.update({
            where: { id: campaignId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.messageTemplate && { messageTemplate: dto.messageTemplate }),
                ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
                ...(dto.status && { status: dto.status }),
            },
        });
    }

    async dispatchCampaign(tenantId: string, campaignId: string) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id: campaignId, tenantId },
        });
        if (!campaign) throw new NotFoundException('Campaign not found');
        if (campaign.status === 'SENT') {
            throw new UnprocessableEntityException('Campaign already sent');
        }

        // Fetch target patients
        const patients = await this.prisma.patient.findMany({
            where: {
                tenantId,
                isActive: true,
                isAnonymized: false,
                ...(campaign.targetSegments.length > 0 && {
                    segment: { in: campaign.targetSegments as any[] },
                }),
            },
            select: { id: true, phone: true, email: true, lineId: true, firstName: true },
        });

        // Create notification queue records in bulk (actual send in Phase 5 job queue)
        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'SENDING', sentAt: new Date() },
        });

        let queued = 0;
        const batchSize = 100;
        for (let i = 0; i < patients.length; i += batchSize) {
            const batch = patients.slice(i, i + batchSize);
            await this.prisma.notificationLog.createMany({
                data: batch.map((p) => ({
                    channel: campaign.channel,
                    recipient: this.resolveRecipient(p, campaign.channel),
                    body: campaign.messageTemplate.replace('{{name}}', p.firstName),
                    campaignId,
                    patientId: p.id,
                    status: 'queued',
                })),
                skipDuplicates: true,
            });
            queued += batch.length;
        }

        await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'SENT', sentCount: queued },
        });

        return { success: true, queued, campaignId };
    }

    private resolveRecipient(
        patient: { phone: string; email: string | null; lineId: string | null },
        channel: string,
    ): string {
        switch (channel) {
            case 'EMAIL': return patient.email ?? patient.phone;
            case 'LINE': return patient.lineId ?? patient.phone;
            default: return patient.phone;
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // NOTIFICATION LOG (sent/queued history)
    // ───────────────────────────────────────────────────────────────────────────

    async getNotificationLog(tenantId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [total, logs] = await this.prisma.$transaction([
            this.prisma.notificationLog.count({ where: { patient: { tenantId } } }),
            this.prisma.notificationLog.findMany({
                where: { patient: { tenantId } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
                },
            }),
        ]);
        return { data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CRM DASHBOARD STATS
    // ───────────────────────────────────────────────────────────────────────────

    async getDashboardStats(tenantId: string) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [
            totalPatients, newThisMonth, vipCount, leadCount,
            activeCount, dormantCount, pendingFollowUps, sentCampaigns,
        ] = await this.prisma.$transaction([
            this.prisma.patient.count({ where: { tenantId, isActive: true } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true, createdAt: { gte: thirtyDaysAgo } } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true, segment: 'VIP' } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true, segment: 'LEAD' } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true, segment: 'ACTIVE' } }),
            this.prisma.patient.count({ where: { tenantId, isActive: true, segment: 'DORMANT' } }),
            this.prisma.crmInteraction.count({
                where: {
                    patient: { tenantId },
                    followUpDate: { gte: now, lte: sevenDaysLater },
                    isFollowedUp: false,
                },
            }),
            this.prisma.campaign.count({ where: { tenantId, status: 'SENT' } }),
        ]);

        return {
            patients: { total: totalPatients, newThisMonth, bySegment: { VIP: vipCount, ACTIVE: activeCount, LEAD: leadCount, DORMANT: dormantCount } },
            followUps: { pending: pendingFollowUps },
            campaigns: { sent: sentCampaigns },
        };
    }
}
