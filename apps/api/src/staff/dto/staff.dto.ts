import {
    IsString, IsOptional, IsNumber, IsDateString, IsBoolean,
    IsPositive, IsEnum, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

// ── Staff Profile ─────────────────────────────────────────────────────────────
export class CreateStaffDto {
    @ApiProperty() @IsString() declare firstName: string;
    @ApiProperty() @IsString() declare lastName: string;
    @ApiProperty() @IsString() declare email: string;
    @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) declare role: UserRole;
    @ApiPropertyOptional() @IsOptional() @IsString() specialty?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() commissionRate?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateStaffDto {
    @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
    @ApiPropertyOptional() @IsOptional() @IsEnum(UserRole) role?: UserRole;
    @ApiPropertyOptional() @IsOptional() @IsString() specialty?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() commissionRate?: number;
}

export class StaffSearchDto {
    @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean) activeOnly?: boolean;
    @ApiPropertyOptional() @IsOptional() @Min(1) @Type(() => Number) page?: number;
    @ApiPropertyOptional() @IsOptional() @Min(1) @Type(() => Number) limit?: number;
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export class CreateScheduleDto {
    @ApiProperty() @IsString() declare staffId: string;
    @ApiProperty() @IsDateString() declare startTime: string;
    @ApiProperty() @IsDateString() declare endTime: string;
    @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class UpdateScheduleDto {
    @ApiPropertyOptional() @IsOptional() @IsDateString() startTime?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() endTime?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

// ── Attendance ────────────────────────────────────────────────────────────────
export class ClockInDto {
    @ApiProperty() @IsString() declare staffId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ClockOutDto {
    @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

// ── Leave ─────────────────────────────────────────────────────────────────────
export class CreateLeaveRequestDto {
    @ApiProperty() @IsString() declare staffId: string;
    @ApiProperty({ example: 'annual' }) @IsString() declare leaveType: string;
    @ApiProperty() @IsDateString() declare startDate: string;
    @ApiProperty() @IsDateString() declare endDate: string;
    @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ReviewLeaveDto {
    @ApiProperty({ enum: ['APPROVED', 'REJECTED'] }) @IsString() declare decision: 'APPROVED' | 'REJECTED';
}

// ── Certification ─────────────────────────────────────────────────────────────
export class CreateCertificationDto {
    @ApiProperty() @IsString() declare staffId: string;
    @ApiProperty() @IsString() declare name: string;
    @ApiPropertyOptional() @IsOptional() @IsString() issuer?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() issuedAt?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}
