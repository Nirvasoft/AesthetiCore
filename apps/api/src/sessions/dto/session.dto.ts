import {
    IsString, IsOptional, IsEnum, IsArray, IsNumber,
    IsPositive, Min, ValidateNested,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SessionStatus } from '@prisma/client';

// ─── Treatment Line ──────────────────────────────────────────────────────────
export class CreateTreatmentLineDto {
    @ApiPropertyOptional({ description: 'Product ID (null = free-text service)' })
    @IsOptional()
    @IsString()
    productId?: string;

    @ApiProperty({ example: 'Botulinum Toxin Type A' })
    @IsString()
    declare productName: string;

    @ApiProperty({ example: 2.5 })
    @IsNumber()
    @IsPositive()
    declare quantityUsed: number;

    @ApiPropertyOptional({ example: 'units' })
    @IsOptional()
    @IsString()
    unit?: string;

    @ApiPropertyOptional({ example: 'forehead' })
    @IsOptional()
    @IsString()
    bodyZone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ example: 1500.00 })
    @IsNumber()
    @Min(0)
    declare price: number;
}

// ─── Create Session ──────────────────────────────────────────────────────────
export class CreateSessionDto {
    @ApiProperty({ description: 'Patient ID' })
    @IsString()
    declare patientId: string;

    @ApiPropertyOptional({ description: 'Linked appointment ID' })
    @IsOptional()
    @IsString()
    appointmentId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chiefComplaint?: string;

    @ApiPropertyOptional({ description: 'SOAP - Subjective' })
    @IsOptional()
    @IsString()
    subjective?: string;

    @ApiPropertyOptional({ description: 'SOAP - Objective' })
    @IsOptional()
    @IsString()
    objective?: string;

    @ApiPropertyOptional({ description: 'SOAP - Assessment' })
    @IsOptional()
    @IsString()
    assessment?: string;

    @ApiPropertyOptional({ description: 'SOAP - Plan' })
    @IsOptional()
    @IsString()
    plan?: string;

    @ApiPropertyOptional({ type: [CreateTreatmentLineDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTreatmentLineDto)
    treatmentLines?: CreateTreatmentLineDto[];
}

// ─── Update Session ──────────────────────────────────────────────────────────
export class UpdateSessionDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chiefComplaint?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    subjective?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    objective?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    assessment?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    plan?: string;

    @ApiPropertyOptional({ enum: SessionStatus })
    @IsOptional()
    @IsEnum(SessionStatus)
    status?: SessionStatus;
}

// ─── Add Addendum ────────────────────────────────────────────────────────────
export class AddAddendumDto {
    @ApiProperty({ description: 'Addendum content — can be added even after session lock' })
    @IsString()
    declare content: string;
}

// ─── Doctor Override ─────────────────────────────────────────────────────────
export class ContraindicationOverrideDto {
    @ApiProperty({ description: 'Treatment line ID with contraindication' })
    @IsString()
    declare treatmentLineId: string;

    @ApiProperty({ description: 'Mandatory override reason (min 10 chars)', minLength: 10 })
    @IsString()
    declare reason: string;
}

// ─── Session Search ──────────────────────────────────────────────────────────
export class SessionSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    patientId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;

    @ApiPropertyOptional({ enum: SessionStatus })
    @IsOptional()
    @IsEnum(SessionStatus)
    status?: SessionStatus;

    @ApiPropertyOptional()
    @IsOptional()
    page?: number;

    @ApiPropertyOptional()
    @IsOptional()
    limit?: number;
}
