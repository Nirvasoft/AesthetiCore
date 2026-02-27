import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, Req, Res,
    UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { PhotosService } from './photos.service';
import { UploadPhotoDto, UpdatePhotoDto, PhotoSearchDto } from './dto/photo.dto';

@ApiTags('photos')
@ApiBearerAuth()
@Controller('photos')
export class PhotosController {
    constructor(private readonly photosService: PhotosService) { }

    // ── Upload photo ────────────────────────────────────────────────────────
    @Post('upload')
    @ApiOperation({ summary: 'Upload a patient photo — multipart form with file + metadata' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                patientId: { type: 'string' },
                sessionId: { type: 'string' },
                bodyZone: { type: 'string' },
                photoType: { type: 'string', enum: ['before', 'after', 'progress'] },
            },
            required: ['file', 'patientId'],
        },
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new Error('Only image files are allowed'), false);
            }
            cb(null, true);
        },
    }))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadPhotoDto,
        @Req() req: any,
    ) {
        if (!file) throw new Error('No file uploaded');
        return this.photosService.upload(
            req.tenantContext.tenantId,
            dto.patientId,
            file,
            { sessionId: dto.sessionId, bodyZone: dto.bodyZone, photoType: dto.photoType },
        );
    }

    // ── List photos for patient ─────────────────────────────────────────────
    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all photos for a patient — filterable by bodyZone, photoType, sessionId' })
    findByPatient(
        @Param('patientId') patientId: string,
        @Query() query: PhotoSearchDto,
        @Req() req: any,
    ) {
        return this.photosService.findByPatient(req.tenantContext.tenantId, patientId, query);
    }

    // ── Gallery (grouped by zone) ───────────────────────────────────────────
    @Get('patient/:patientId/gallery')
    @ApiOperation({ summary: 'Get photo gallery grouped by body zone with pair info' })
    getGallery(@Param('patientId') patientId: string, @Req() req: any) {
        return this.photosService.getGallery(req.tenantContext.tenantId, patientId);
    }

    // ── Get single photo metadata ───────────────────────────────────────────
    @Get(':id')
    @ApiOperation({ summary: 'Get photo metadata including session and patient info' })
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.photosService.findOne(req.tenantContext.tenantId, id);
    }

    // ── Serve actual image file ─────────────────────────────────────────────
    @Get(':id/file')
    @ApiOperation({ summary: 'Serve the actual image file (for display in UI)' })
    async serveFile(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
        const filePath = await this.photosService.getFilePath(req.tenantContext.tenantId, id);
        return res.sendFile(filePath);
    }

    // ── Update metadata ─────────────────────────────────────────────────────
    @Put(':id')
    @ApiOperation({ summary: 'Update photo metadata (bodyZone, photoType)' })
    update(@Param('id') id: string, @Body() dto: UpdatePhotoDto, @Req() req: any) {
        return this.photosService.update(req.tenantContext.tenantId, id, dto);
    }

    // ── Pair photos (before/after) ──────────────────────────────────────────
    @Post(':id/pair/:pairedId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Pair two photos as before/after — sets reciprocal pairedWithId' })
    pairPhotos(
        @Param('id') id: string,
        @Param('pairedId') pairedId: string,
        @Req() req: any,
    ) {
        return this.photosService.pairPhotos(req.tenantContext.tenantId, id, pairedId);
    }

    // ── Unpair ──────────────────────────────────────────────────────────────
    @Post(':id/unpair')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove before/after pairing from a photo' })
    unpairPhoto(@Param('id') id: string, @Req() req: any) {
        return this.photosService.unpairPhoto(req.tenantContext.tenantId, id);
    }

    // ── Delete photo ────────────────────────────────────────────────────────
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a photo — removes file from disk and unpairs if needed' })
    remove(@Param('id') id: string, @Req() req: any) {
        return this.photosService.remove(req.tenantContext.tenantId, id);
    }
}
