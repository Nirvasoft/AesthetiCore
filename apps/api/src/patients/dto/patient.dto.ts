import { IsString, IsEmail, IsOptional, IsDateString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatientSegment } from '@prisma/client';

export class CreatePatientDto {
    @ApiProperty({ example: 'Zayar' })
    @IsString()
    declare firstName: string;

    @ApiProperty({ example: 'Aung' })
    @IsString()
    declare lastName: string;

    @ApiPropertyOptional({ example: '1990-05-15' })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other'] })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiProperty({ example: '+959123456789' })
    @IsString()
    @MinLength(7)
    declare phone: string;

    @ApiPropertyOptional({ example: 'patient@email.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'line_user_id' })
    @IsOptional()
    @IsString()
    lineId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    referredById?: string;
}

export class UpdatePatientDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lineId?: string;

    @ApiPropertyOptional({ enum: PatientSegment })
    @IsOptional()
    @IsEnum(PatientSegment)
    segment?: PatientSegment;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class PatientSearchDto {
    @ApiPropertyOptional({ description: 'Search by name, phone, or email' })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ enum: PatientSegment })
    @IsOptional()
    @IsEnum(PatientSegment)
    segment?: PatientSegment;

    @ApiPropertyOptional({ description: 'Filter by branchId' })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    limit?: number;
}

export class RecordPdpaConsentDto {
    @ApiProperty({ example: 'data_processing' })
    @IsString()
    declare consentType: string;

    @ApiProperty()
    declare isGranted: boolean;
}
