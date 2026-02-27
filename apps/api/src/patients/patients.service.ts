import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreatePatientDto,
    UpdatePatientDto,
    PatientSearchDto,
    RecordPdpaConsentDto,
} from './dto/patient.dto';

@Injectable()
export class PatientsService {
    constructor(private prisma: PrismaService) { }

    // ─── Generate unique patient code ─────────────────────────────────────────
    private async generatePatientCode(tenantId: string): Promise<string> {
        const count = await this.prisma.patient.count({ where: { tenantId } });
        return `PT${String(count + 1).padStart(6, '0')}`;
    }

    // ─── Duplicate detection ───────────────────────────────────────────────────
    async findDuplicates(tenantId: string, phone: string, firstName: string, lastName: string) {
        return this.prisma.patient.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    { phone },
                    {
                        AND: [
                            { firstName: { contains: firstName, mode: 'insensitive' } },
                            { lastName: { contains: lastName, mode: 'insensitive' } },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                patientCode: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                branch: { select: { name: true } },
            },
        });
    }

    // ─── Create patient ────────────────────────────────────────────────────────
    async create(
        tenantId: string,
        branchId: string,
        dto: CreatePatientDto,
        createdById: string,
    ) {
        // Duplicate check
        const duplicates = await this.findDuplicates(tenantId, dto.phone, dto.firstName, dto.lastName);
        if (duplicates.length > 0) {
            return { isDuplicate: true, duplicates, patient: null };
        }

        const patientCode = await this.generatePatientCode(tenantId);

        const patient = await this.prisma.patient.create({
            data: {
                tenantId,
                branchId,
                patientCode,
                firstName: dto.firstName,
                lastName: dto.lastName,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                gender: dto.gender,
                phone: dto.phone,
                email: dto.email,
                lineId: dto.lineId,
                notes: dto.notes,
                referredById: dto.referredById,
            },
            include: { branch: { select: { name: true } } },
        });

        // Auto-record default PDPA consent (data processing required)
        await this.prisma.pdpaConsent.create({
            data: {
                patientId: patient.id,
                consentType: 'data_processing',
                isGranted: true,
            },
        });

        return { isDuplicate: false, duplicates: [], patient };
    }

    // ─── Search patients ───────────────────────────────────────────────────────
    async search(tenantId: string, dto: PatientSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
            tenantId,
            isActive: true,
            isAnonymized: false,
            ...(dto.segment && { segment: dto.segment }),
            ...(dto.branchId && { branchId: dto.branchId }),
            ...(dto.q && {
                OR: [
                    { firstName: { contains: dto.q, mode: 'insensitive' } },
                    { lastName: { contains: dto.q, mode: 'insensitive' } },
                    { phone: { contains: dto.q } },
                    { email: { contains: dto.q, mode: 'insensitive' } },
                    { patientCode: { contains: dto.q, mode: 'insensitive' } },
                ],
            }),
        };

        const [total, patients] = await this.prisma.$transaction([
            this.prisma.patient.count({ where }),
            this.prisma.patient.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    patientCode: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                    gender: true,
                    dateOfBirth: true,
                    segment: true,
                    loyaltyPoints: true,
                    lastVisitDate: true,
                    branch: { select: { id: true, name: true } },
                    _count: { select: { sessions: true, packages: true } },
                },
            }),
        ]);

        return {
            data: patients,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    // ─── Get patient by ID ─────────────────────────────────────────────────────
    async findOne(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId, isActive: true },
            include: {
                branch: { select: { id: true, name: true } },
                medicalHistory: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
                allergies: { orderBy: { createdAt: 'desc' } },
                pdpaConsents: { orderBy: { signedAt: 'desc' } },
                packages: {
                    where: { isActive: true },
                    include: { package: { select: { name: true, totalSessions: true } } },
                    orderBy: { purchasedAt: 'desc' },
                },
                sessions: {
                    take: 10,
                    orderBy: { visitDate: 'desc' },
                    select: {
                        id: true,
                        visitDate: true,
                        status: true,
                        chiefComplaint: true,
                        branch: { select: { name: true } },
                    },
                },
                _count: { select: { sessions: true, packages: true, photos: true } },
            },
        });

        if (!patient) throw new NotFoundException('Patient not found');
        return patient;
    }

    // ─── Update patient ────────────────────────────────────────────────────────
    async update(tenantId: string, patientId: string, dto: UpdatePatientDto) {
        await this.findOne(tenantId, patientId); // ensure exists

        return this.prisma.patient.update({
            where: { id: patientId },
            data: {
                ...dto,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            },
        });
    }

    // ─── Soft delete ───────────────────────────────────────────────────────────
    async softDelete(tenantId: string, patientId: string) {
        await this.findOne(tenantId, patientId);
        return this.prisma.patient.update({
            where: { id: patientId },
            data: { isActive: false },
            select: { id: true },
        });
    }

    // ─── PDPA: Record consent ──────────────────────────────────────────────────
    async recordConsent(patientId: string, dto: RecordPdpaConsentDto, ipAddress?: string) {
        return this.prisma.pdpaConsent.create({
            data: {
                patientId,
                consentType: dto.consentType,
                isGranted: dto.isGranted,
                ipAddress,
            },
        });
    }

    // ─── PDPA: Data export ─────────────────────────────────────────────────────
    async exportPatientData(tenantId: string, patientId: string) {
        const patient = await this.findOne(tenantId, patientId);
        return {
            exportedAt: new Date().toISOString(),
            patient: {
                ...patient,
                sessions: await this.prisma.treatmentSession.findMany({
                    where: { patientId },
                    include: { treatmentLines: true },
                }),
                invoices: await this.prisma.invoice.findMany({ where: { patientId } }),
                photos: await this.prisma.patientPhoto.findMany({
                    where: { patientId },
                    select: { id: true, bodyZone: true, photoType: true, takenAt: true },
                }),
            },
        };
    }

    // ─── PDPA: Data erasure (anonymize, never hard-delete) ────────────────────
    async anonymizePatient(tenantId: string, patientId: string) {
        await this.findOne(tenantId, patientId);

        const anonymized = await this.prisma.patient.update({
            where: { id: patientId },
            data: {
                firstName: '[Removed]',
                lastName: '[Removed]',
                phone: '0000000000',
                email: null,
                lineId: null,
                photoUrl: null,
                notes: null,
                isAnonymized: true,
                isActive: false,
            },
            select: { id: true, patientCode: true, isAnonymized: true },
        });

        return anonymized;
    }

    // ─── Patient timeline (recent interactions across modules) ─────────────────
    async getTimeline(tenantId: string, patientId: string) {
        await this.findOne(tenantId, patientId);

        const [sessions, interactions, invoices] = await this.prisma.$transaction([
            this.prisma.treatmentSession.findMany({
                where: { patientId },
                orderBy: { visitDate: 'desc' },
                take: 20,
                select: {
                    id: true,
                    visitDate: true,
                    status: true,
                    chiefComplaint: true,
                    branch: { select: { name: true } },
                },
            }),
            this.prisma.crmInteraction.findMany({
                where: { patientId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.invoice.findMany({
                where: { patientId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        // Merge and sort all events
        const events = [
            ...sessions.map((s) => ({ type: 'session', date: s.visitDate, data: s })),
            ...interactions.map((i) => ({ type: 'interaction', date: i.createdAt, data: i })),
            ...invoices.map((i) => ({ type: 'invoice', date: i.createdAt, data: i })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return events;
    }
}
