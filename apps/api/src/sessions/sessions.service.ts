import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateSessionDto,
    UpdateSessionDto,
    AddAddendumDto,
    ContraindicationOverrideDto,
    SessionSearchDto,
    CreateTreatmentLineDto,
} from './dto/session.dto';

const SESSION_LOCKED_CODE = 'SESSION_LOCKED';
const CONTRAINDICATION_CODE = 'CONTRAINDICATION_ALERT';

@Injectable()
export class SessionsService {
    constructor(private prisma: PrismaService) { }

    // ────────────────────────────────────────────────────────────────────────────
    // CREATE SESSION
    // ────────────────────────────────────────────────────────────────────────────
    async create(
        tenantId: string,
        branchId: string,
        practitionerId: string,
        dto: CreateSessionDto,
    ) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patientId, tenantId, isActive: true },
            include: {
                allergies: true,
                medicalHistory: { where: { isActive: true } },
            },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        let contraindicationAlerts: string[] = [];
        if (dto.treatmentLines?.length) {
            contraindicationAlerts = await this.checkContraindications(
                dto.patientId,
                dto.treatmentLines.map((l) => l.productId).filter(Boolean) as string[],
                dto.treatmentLines.map((l) => l.productName),
                patient.allergies,
            );
        }

        const session = await this.prisma.$transaction(async (tx) => {
            const newSession = await tx.treatmentSession.create({
                data: {
                    tenantId,
                    branchId,
                    patientId: dto.patientId,
                    practitionerId,
                    appointmentId: dto.appointmentId,
                    chiefComplaint: dto.chiefComplaint,
                    subjective: dto.subjective,
                    objective: dto.objective,
                    assessment: dto.assessment,
                    plan: dto.plan,
                    status: 'IN_PROGRESS',
                },
            });

            if (dto.treatmentLines?.length) {
                for (const line of dto.treatmentLines) {
                    await this.createTreatmentLineInternal(tx, newSession.id, branchId, line);
                }
            }

            await tx.emrAuditLog.create({
                data: {
                    sessionId: newSession.id,
                    userId: practitionerId,
                    action: 'SESSION_CREATED',
                    details: { patientId: dto.patientId, branchId },
                },
            });

            return newSession;
        });

        await this.prisma.patient.update({
            where: { id: dto.patientId },
            data: { lastVisitDate: new Date() },
        });

        return {
            session,
            contraindicationAlerts,
            hasContraindications: contraindicationAlerts.length > 0,
        };
    }

    // ────────────────────────────────────────────────────────────────────────────
    // CONTRAINDICATION ENGINE
    // ────────────────────────────────────────────────────────────────────────────
    private async checkContraindications(
        patientId: string,
        productIds: string[],
        productNames: string[],
        allergies: Array<{ allergen: string }>,
    ): Promise<string[]> {
        const alerts: string[] = [];

        for (const name of productNames) {
            for (const allergy of allergies) {
                if (name.toLowerCase().includes(allergy.allergen.toLowerCase())) {
                    alerts.push(
                        `CONTRAINDICATION: "${name}" may conflict with allergy to "${allergy.allergen}"`,
                    );
                }
            }
        }

        const medHistory = await this.prisma.patientMedicalHistory.findMany({
            where: { patientId, isActive: true },
        });

        const knownContraindications: Record<string, string[]> = {
            pregnancy: ['botox', 'botulinum', 'retinol', 'filler'],
            breastfeeding: ['botox', 'botulinum', 'retinol'],
            epilepsy: ['laser', 'ipl'],
            keloid: ['laser', 'microneedling'],
        };

        for (const history of medHistory) {
            const condition = history.condition.toLowerCase();
            for (const [knownCondition, contraProducts] of Object.entries(knownContraindications)) {
                if (condition.includes(knownCondition)) {
                    for (const name of productNames) {
                        if (contraProducts.some((cp) => name.toLowerCase().includes(cp))) {
                            alerts.push(
                                `CONTRAINDICATION: "${name}" is contraindicated with condition "${history.condition}"`,
                            );
                        }
                    }
                }
            }
        }

        void productIds; // reserved for future DB-driven lookup
        return alerts;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // FEFO INVENTORY DEDUCTION
    // ────────────────────────────────────────────────────────────────────────────
    private async createTreatmentLineInternal(
        tx: any,
        sessionId: string,
        branchId: string,
        line: CreateTreatmentLineDto,
    ) {
        let selectedBatchId: string | undefined;

        if (line.productId) {
            const batches = await tx.inventoryBatch.findMany({
                where: {
                    productId: line.productId,
                    branchId,
                    quantityOnHand: { gte: line.quantityUsed },
                    isExpired: false,
                    OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
                },
                orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
                take: 1,
            });

            if (batches.length > 0) {
                selectedBatchId = batches[0].id;

                await tx.inventoryBatch.update({
                    where: { id: selectedBatchId },
                    data: { quantityOnHand: { decrement: line.quantityUsed } },
                });

                await tx.inventoryStock.updateMany({
                    where: { productId: line.productId, branchId },
                    data: { quantityOnHand: { decrement: line.quantityUsed } },
                });
            }
        }

        const treatmentLine = await tx.treatmentLine.create({
            data: {
                sessionId,
                productId: line.productId,
                productName: line.productName,
                batchId: selectedBatchId,
                quantityUsed: line.quantityUsed,
                unit: line.unit,
                bodyZone: line.bodyZone,
                notes: line.notes,
                price: line.price,
            },
        });

        if (selectedBatchId && line.productId) {
            await tx.inventoryTransaction.create({
                data: {
                    batchId: selectedBatchId,
                    branchId,
                    type: 'USAGE',
                    quantity: line.quantityUsed,
                    referenceId: sessionId,
                    referenceType: 'session',
                    treatmentLineId: treatmentLine.id,
                    createdById: 'system',
                },
            });

            const stock = await tx.inventoryStock.findFirst({
                where: { productId: line.productId, branchId },
                include: { product: { select: { name: true, minStockLevel: true } } },
            });
            if (stock && stock.quantityOnHand <= stock.product.minStockLevel) {
                await tx.notificationLog.create({
                    data: {
                        channel: 'INTERNAL',
                        recipient: branchId,
                        body: `STOCK_LOW: ${stock.product.name} at branch has fallen to ${stock.quantityOnHand} units`,
                        status: 'sent',
                    },
                });
            }
        }

        return treatmentLine;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ADD TREATMENT LINE TO EXISTING SESSION
    // ────────────────────────────────────────────────────────────────────────────
    async addTreatmentLine(
        tenantId: string,
        sessionId: string,
        branchId: string,
        userId: string,
        line: CreateTreatmentLineDto,
    ) {
        const session = await this.findOne(tenantId, sessionId);
        if (session.isLocked) {
            throw new UnprocessableEntityException({ message: 'Session is locked', code: SESSION_LOCKED_CODE });
        }

        if (line.productId) {
            const patient = await this.prisma.patient.findFirst({
                where: { id: session.patientId },
                include: { allergies: true },
            });
            if (patient) {
                const alerts = await this.checkContraindications(
                    session.patientId,
                    [line.productId],
                    [line.productName],
                    patient.allergies,
                );
                if (alerts.length > 0) {
                    throw new UnprocessableEntityException({
                        message: 'Contraindication detected. Doctor override required.',
                        code: CONTRAINDICATION_CODE,
                        alerts,
                    });
                }
            }
        }

        return this.prisma.$transaction(async (tx) => {
            const tl = await this.createTreatmentLineInternal(tx, sessionId, branchId, line);
            await tx.emrAuditLog.create({
                data: {
                    sessionId,
                    userId,
                    action: 'TREATMENT_LINE_ADDED',
                    details: { productName: line.productName, quantity: line.quantityUsed },
                },
            });
            return tl;
        });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DOCTOR CONTRAINDICATION OVERRIDE
    // ────────────────────────────────────────────────────────────────────────────
    async overrideContraindication(
        tenantId: string,
        sessionId: string,
        doctorId: string,
        dto: ContraindicationOverrideDto,
    ) {
        if (dto.reason.trim().length < 10) {
            throw new BadRequestException('Override reason must be at least 10 characters');
        }

        const session = await this.findOne(tenantId, sessionId);
        if (session.isLocked) {
            throw new UnprocessableEntityException({ message: 'Session is locked', code: SESSION_LOCKED_CODE });
        }

        await this.prisma.emrAuditLog.create({
            data: {
                sessionId,
                userId: doctorId,
                action: 'CONTRAINDICATION_OVERRIDE',
                details: {
                    treatmentLineId: dto.treatmentLineId,
                    reason: dto.reason,
                    timestamp: new Date().toISOString(),
                },
            },
        });

        await this.prisma.treatmentLine.update({
            where: { id: dto.treatmentLineId },
            data: {
                contraindicationOverrideReason: dto.reason,
                overriddenById: doctorId,
            },
        });

        return { success: true, message: 'Override recorded in audit log' };
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET SESSION
    // ────────────────────────────────────────────────────────────────────────────
    async findOne(tenantId: string, sessionId: string) {
        const session = await this.prisma.treatmentSession.findFirst({
            where: { id: sessionId, tenantId },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        patientCode: true,
                        phone: true,
                        allergies: true,
                        medicalHistory: { where: { isActive: true } },
                    },
                },
                branch: { select: { id: true, name: true } },
                treatmentLines: {
                    include: {
                        product: { select: { id: true, name: true, unit: true } },
                        batch: { select: { lotNumber: true, expiryDate: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                addenda: { orderBy: { createdAt: 'asc' } },
                doctorSignedBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { photos: true, consentForms: true } },
            },
        });

        if (!session) throw new NotFoundException('Session not found');
        return session;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // LIST SESSIONS
    // ────────────────────────────────────────────────────────────────────────────
    async findAll(tenantId: string, dto: SessionSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            ...(dto.patientId && { patientId: dto.patientId }),
            ...(dto.branchId && { branchId: dto.branchId }),
            ...(dto.practitionerId && { practitionerId: dto.practitionerId }),
            ...(dto.status && { status: dto.status }),
        };

        const [total, sessions] = await this.prisma.$transaction([
            this.prisma.treatmentSession.count({ where }),
            this.prisma.treatmentSession.findMany({
                where,
                skip,
                take: limit,
                orderBy: { visitDate: 'desc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, patientCode: true } },
                    branch: { select: { name: true } },
                    _count: { select: { treatmentLines: true } },
                },
            }),
        ]);

        return { data: sessions, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UPDATE SESSION (SOAP — blocked if locked)
    // ────────────────────────────────────────────────────────────────────────────
    async update(tenantId: string, sessionId: string, userId: string, dto: UpdateSessionDto) {
        const session = await this.findOne(tenantId, sessionId);

        if (session.isLocked) {
            throw new UnprocessableEntityException({
                message: 'This session is locked. Add an addendum instead.',
                code: SESSION_LOCKED_CODE,
            });
        }

        const updated = await this.prisma.treatmentSession.update({
            where: { id: sessionId },
            data: { ...dto },
        });

        await this.prisma.emrAuditLog.create({
            data: {
                sessionId,
                userId,
                action: 'SESSION_UPDATED',
                details: { changes: Object.keys(dto) },
            },
        });

        return updated;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DOCTOR E-SIGN + LOCK
    // ────────────────────────────────────────────────────────────────────────────
    async signAndLock(tenantId: string, sessionId: string, doctorId: string) {
        const session = await this.findOne(tenantId, sessionId);

        if (session.isLocked) {
            throw new UnprocessableEntityException({ message: 'Session already locked.', code: SESSION_LOCKED_CODE });
        }
        if (!session.treatmentLines?.length) {
            throw new BadRequestException('Cannot lock an empty session.');
        }

        const locked = await this.prisma.treatmentSession.update({
            where: { id: sessionId },
            data: {
                isLocked: true,
                status: 'COMPLETED',
                doctorSignedById: doctorId,
                doctorSignedAt: new Date(),
            },
            select: {
                id: true,
                isLocked: true,
                status: true,
                doctorSignedAt: true,
                doctorSignedBy: { select: { firstName: true, lastName: true } },
            },
        });

        await this.prisma.emrAuditLog.create({
            data: {
                sessionId,
                userId: doctorId,
                action: 'SESSION_LOCKED',
                details: { lockedAt: locked.doctorSignedAt?.toISOString(), doctorId },
            },
        });

        return locked;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ADD ADDENDUM (works on locked sessions)
    // ────────────────────────────────────────────────────────────────────────────
    async addAddendum(tenantId: string, sessionId: string, userId: string, dto: AddAddendumDto) {
        await this.findOne(tenantId, sessionId);

        const addendum = await this.prisma.sessionAddendum.create({
            data: { sessionId, content: dto.content, addedById: userId },
        });

        await this.prisma.emrAuditLog.create({
            data: {
                sessionId,
                userId,
                action: 'ADDENDUM_ADDED',
                details: { addendumId: addendum.id },
            },
        });

        return addendum;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // AUDIT LOG
    // ────────────────────────────────────────────────────────────────────────────
    async getAuditLog(tenantId: string, sessionId: string) {
        await this.findOne(tenantId, sessionId);
        return this.prisma.emrAuditLog.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'desc' },
        });
    }
}
