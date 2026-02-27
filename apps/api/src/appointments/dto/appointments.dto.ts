import {
    IsString, IsOptional, IsNumber, IsDateString,
    IsPositive, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Book Appointment ──────────────────────────────────────────────────────────
export class CreateAppointmentDto {
    @ApiProperty()
    @IsString()
    declare patientId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    roomId?: string;

    @ApiProperty({ example: '2026-03-15T09:00:00Z' })
    @IsDateString()
    declare startTime: string;

    @ApiProperty({ example: '2026-03-15T10:00:00Z' })
    @IsDateString()
    declare endTime: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    serviceNote?: string;

    @ApiPropertyOptional({ example: 500 })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    depositAmount?: number;
}

// ── Update Appointment ────────────────────────────────────────────────────────
export class UpdateAppointmentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    roomId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    serviceNote?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @IsPositive()
    depositAmount?: number;
}

// ── Reschedule ────────────────────────────────────────────────────────────────
export class RescheduleDto {
    @ApiProperty({ example: '2026-03-16T10:00:00Z' })
    @IsDateString()
    declare newStartTime: string;

    @ApiProperty({ example: '2026-03-16T11:00:00Z' })
    @IsDateString()
    declare newEndTime: string;

    @ApiPropertyOptional({ example: 'Patient requested reschedule' })
    @IsOptional()
    @IsString()
    reason?: string;
}

// ── Cancel ────────────────────────────────────────────────────────────────────
export class CancelAppointmentDto {
    @ApiProperty({ example: 'Patient cancelled due to travel' })
    @IsString()
    declare reason: string;
}

// ── Search / Calendar Query ──────────────────────────────────────────────────
export class AppointmentSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    patientId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Start of date range (ISO)' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ description: 'End of date range (ISO)' })
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Min(1)
    @Type(() => Number)
    page?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Min(1)
    @Type(() => Number)
    limit?: number;
}

// ── Available Slots Query ─────────────────────────────────────────────────────
export class AvailableSlotsDto {
    @ApiProperty({ example: '2026-03-15' })
    @IsDateString()
    declare date: string;

    @ApiPropertyOptional({ example: 60, description: 'Desired duration in minutes' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    duration?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;
}

// ── Waitlist ──────────────────────────────────────────────────────────────────
export class WaitlistDto {
    @ApiProperty()
    @IsString()
    declare patientId: string;

    @ApiPropertyOptional({ example: '2026-03-20' })
    @IsOptional()
    @IsDateString()
    preferredDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Room ──────────────────────────────────────────────────────────────────────
export class CreateRoomDto {
    @ApiProperty({ example: 'Treatment Room A' })
    @IsString()
    declare name: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    capacity?: number;
}
