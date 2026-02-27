import {
    Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePhotoDto, PhotoSearchDto } from './dto/photo.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'photos');

@Injectable()
export class PhotosService {
    constructor(private prisma: PrismaService) { }

    // ── UPLOAD ──────────────────────────────────────────────────────────────
    async upload(
        tenantId: string,
        patientId: string,
        file: Express.Multer.File,
        opts: { sessionId?: string; bodyZone?: string; photoType?: string },
    ) {
        // verify patient belongs to tenant
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        // verify session if provided
        if (opts.sessionId) {
            const session = await this.prisma.treatmentSession.findFirst({
                where: { id: opts.sessionId, tenantId, patientId },
            });
            if (!session) throw new NotFoundException('Session not found or does not belong to this patient');
        }

        // save file to local disk
        const patientDir = path.join(UPLOAD_DIR, patientId);
        fs.mkdirSync(patientDir, { recursive: true });

        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `${randomUUID()}${ext}`;
        const filePath = path.join(patientDir, filename);

        fs.writeFileSync(filePath, file.buffer);

        // create DB record
        const fileKey = `${patientId}/${filename}`;
        return this.prisma.patientPhoto.create({
            data: {
                patientId,
                sessionId: opts.sessionId || null,
                s3Key: fileKey,
                s3Bucket: 'local',
                bodyZone: opts.bodyZone || null,
                photoType: opts.photoType || null,
            },
        });
    }

    // ── LIST BY PATIENT ────────────────────────────────────────────────────
    async findByPatient(tenantId: string, patientId: string, dto: PhotoSearchDto) {
        // verify patient belongs to tenant
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
            select: { id: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        return this.prisma.patientPhoto.findMany({
            where: {
                patientId,
                ...(dto.bodyZone && { bodyZone: dto.bodyZone }),
                ...(dto.photoType && { photoType: dto.photoType }),
                ...(dto.sessionId && { sessionId: dto.sessionId }),
            },
            orderBy: { takenAt: 'desc' },
        });
    }

    // ── GET ONE ──────────────────────────────────────────────────────────────
    async findOne(tenantId: string, id: string) {
        const photo = await this.prisma.patientPhoto.findUnique({
            where: { id },
            include: {
                patient: { select: { id: true, tenantId: true, firstName: true, lastName: true, patientCode: true } },
                session: { select: { id: true, chiefComplaint: true, visitDate: true, status: true } },
            },
        });
        if (!photo || photo.patient.tenantId !== tenantId) {
            throw new NotFoundException('Photo not found');
        }
        return photo;
    }

    // ── SERVE FILE ──────────────────────────────────────────────────────────
    async getFilePath(tenantId: string, id: string): Promise<string> {
        const photo = await this.findOne(tenantId, id);
        const filePath = path.join(UPLOAD_DIR, photo.s3Key);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('File not found on disk');
        }
        return filePath;
    }

    // ── UPDATE METADATA ─────────────────────────────────────────────────────
    async update(tenantId: string, id: string, dto: UpdatePhotoDto) {
        const photo = await this.findOne(tenantId, id);
        return this.prisma.patientPhoto.update({
            where: { id: photo.id },
            data: {
                ...(dto.bodyZone !== undefined && { bodyZone: dto.bodyZone }),
                ...(dto.photoType !== undefined && { photoType: dto.photoType }),
            },
        });
    }

    // ── PAIR BEFORE/AFTER ───────────────────────────────────────────────────
    async pairPhotos(tenantId: string, photoId: string, pairedId: string) {
        if (photoId === pairedId) throw new BadRequestException('Cannot pair a photo with itself');

        const [photo, paired] = await Promise.all([
            this.findOne(tenantId, photoId),
            this.findOne(tenantId, pairedId),
        ]);

        if (photo.patientId !== paired.patientId) {
            throw new BadRequestException('Both photos must belong to the same patient');
        }

        // set reciprocal pairing
        await this.prisma.$transaction([
            this.prisma.patientPhoto.update({
                where: { id: photoId },
                data: { pairedWithId: pairedId },
            }),
            this.prisma.patientPhoto.update({
                where: { id: pairedId },
                data: { pairedWithId: photoId },
            }),
        ]);

        return { message: 'Photos paired successfully', photoId, pairedId };
    }

    // ── UNPAIR ──────────────────────────────────────────────────────────────
    async unpairPhoto(tenantId: string, id: string) {
        const photo = await this.findOne(tenantId, id);
        const pairedId = photo.pairedWithId;

        const updates = [
            this.prisma.patientPhoto.update({
                where: { id },
                data: { pairedWithId: null },
            }),
        ];

        if (pairedId) {
            updates.push(
                this.prisma.patientPhoto.update({
                    where: { id: pairedId },
                    data: { pairedWithId: null },
                }),
            );
        }

        await this.prisma.$transaction(updates);
        return { message: 'Photos unpaired' };
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    async remove(tenantId: string, id: string) {
        const photo = await this.findOne(tenantId, id);

        // unpair first
        if (photo.pairedWithId) {
            await this.prisma.patientPhoto.update({
                where: { id: photo.pairedWithId },
                data: { pairedWithId: null },
            });
        }

        // delete file from disk
        const filePath = path.join(UPLOAD_DIR, photo.s3Key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await this.prisma.patientPhoto.delete({ where: { id } });
        return { message: 'Photo deleted' };
    }

    // ── GALLERY — grouped by body zone w/ pair info ────────────────────────
    async getGallery(tenantId: string, patientId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, tenantId },
            select: { id: true },
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const photos = await this.prisma.patientPhoto.findMany({
            where: { patientId },
            orderBy: [{ bodyZone: 'asc' }, { takenAt: 'desc' }],
        });

        // group by body zone
        const grouped: Record<string, typeof photos> = {};
        for (const p of photos) {
            const zone = p.bodyZone || 'untagged';
            if (!grouped[zone]) grouped[zone] = [];
            grouped[zone].push(p);
        }

        return { total: photos.length, byZone: grouped };
    }
}
