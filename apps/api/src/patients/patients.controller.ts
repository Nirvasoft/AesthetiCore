import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, Req,
    HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import {
    CreatePatientDto,
    UpdatePatientDto,
    PatientSearchDto,
    RecordPdpaConsentDto,
} from './dto/patient.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get()
    @ApiOperation({ summary: 'Search patients — by name, phone, email, code' })
    search(@Query() query: PatientSearchDto, @Req() req: any) {
        return this.patientsService.search(req.tenantContext.tenantId, query);
    }

    @Get('duplicates')
    @ApiOperation({ summary: 'Check for duplicate patients before registration' })
    @ApiQuery({ name: 'phone', required: true })
    @ApiQuery({ name: 'firstName', required: true })
    @ApiQuery({ name: 'lastName', required: true })
    checkDuplicates(
        @Query('phone') phone: string,
        @Query('firstName') firstName: string,
        @Query('lastName') lastName: string,
        @Req() req: any,
    ) {
        return this.patientsService.findDuplicates(
            req.tenantContext.tenantId, phone, firstName, lastName,
        );
    }

    @Post()
    @ApiOperation({ summary: 'Register a new patient (includes duplicate detection)' })
    create(@Body() dto: CreatePatientDto, @Req() req: any) {
        return this.patientsService.create(
            req.tenantContext.tenantId,
            req.tenantContext.branchId,
            dto,
            req.user.id,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get full patient profile' })
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.patientsService.findOne(req.tenantContext.tenantId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update patient profile' })
    update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Req() req: any) {
        return this.patientsService.update(req.tenantContext.tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft-delete patient (admin/manager only)' })
    softDelete(@Param('id') id: string, @Req() req: any) {
        return this.patientsService.softDelete(req.tenantContext.tenantId, id);
    }

    @Get(':id/timeline')
    @ApiOperation({ summary: 'Get patient activity timeline' })
    getTimeline(@Param('id') id: string, @Req() req: any) {
        return this.patientsService.getTimeline(req.tenantContext.tenantId, id);
    }

    @Post(':id/consents')
    @ApiOperation({ summary: 'Record PDPA consent for patient' })
    recordConsent(
        @Param('id') id: string,
        @Body() dto: RecordPdpaConsentDto,
        @Req() req: any,
    ) {
        return this.patientsService.recordConsent(id, dto, req.ip);
    }

    @Get(':id/data-export')
    @ApiOperation({ summary: 'Export all patient data (PDPA portability)' })
    exportData(@Param('id') id: string, @Req() req: any) {
        return this.patientsService.exportPatientData(req.tenantContext.tenantId, id);
    }

    @Delete(':id/data-erasure')
    @Roles(UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Anonymize patient data (PDPA right to erasure) — HQ Admin only' })
    anonymize(@Param('id') id: string, @Req() req: any) {
        return this.patientsService.anonymizePatient(req.tenantContext.tenantId, id);
    }
}
