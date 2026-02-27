import {
    IsString, IsOptional, IsEnum, IsNumber, IsArray,
    IsDateString, Min, IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InteractionType {
    CALL = 'CALL',
    CONSULTATION = 'CONSULTATION',
    FOLLOW_UP = 'FOLLOW_UP',
    COMPLAINT = 'COMPLAINT',
    FEEDBACK = 'FEEDBACK',
    APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
    MARKETING = 'MARKETING',
    OTHER = 'OTHER',
}

export enum InteractionChannel {
    PHONE = 'PHONE',
    LINE = 'LINE',
    EMAIL = 'EMAIL',
    IN_PERSON = 'IN_PERSON',
    SMS = 'SMS',
    SOCIAL_MEDIA = 'SOCIAL_MEDIA',
}

export enum CampaignStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    SENDING = 'SENDING',
    SENT = 'SENT',
    CANCELLED = 'CANCELLED',
}

export enum CampaignChannel {
    SMS = 'SMS',
    LINE = 'LINE',
    EMAIL = 'EMAIL',
    PUSH = 'PUSH',
}

// ── Log CRM Interaction ────────────────────────────────────────────────────────
export class LogInteractionDto {
    @ApiProperty({ enum: InteractionType })
    @IsEnum(InteractionType)
    declare type: InteractionType;

    @ApiProperty({ enum: InteractionChannel })
    @IsEnum(InteractionChannel)
    declare channel: InteractionChannel;

    @ApiProperty({ example: 'Patient enquired about filler packages' })
    @IsString()
    declare summary: string;

    @ApiPropertyOptional({ example: 'Recommended the Restylane package, sent price list via LINE' })
    @IsOptional()
    @IsString()
    details?: string;

    @ApiPropertyOptional({ example: '2026-03-15T10:00:00Z', description: 'Schedule a follow-up date' })
    @IsOptional()
    @IsDateString()
    followUpDate?: string;

    @ApiPropertyOptional({ example: 'High interest in Botox — prioritize next contact' })
    @IsOptional()
    @IsString()
    outcome?: string;
}

// ── Credit Balance ──────────────────────────────────────────────────────────────
export class CreditTopUpDto {
    @ApiProperty({ example: 5000, description: 'Amount in base currency (THB)' })
    @IsNumber()
    @IsPositive()
    declare amount: number;

    @ApiPropertyOptional({ example: 'Cash payment at counter' })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional({ example: 'RCP-2026-001' })
    @IsOptional()
    @IsString()
    receiptRef?: string;
}

export class CreditDeductDto {
    @ApiProperty({ example: 1500 })
    @IsNumber()
    @IsPositive()
    declare amount: number;

    @ApiProperty({ example: 'INV-2026-0023' })
    @IsString()
    declare invoiceRef: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;
}

// ── Loyalty Points ──────────────────────────────────────────────────────────────
export class AdjustLoyaltyDto {
    @ApiProperty({ example: 150, description: 'Positive = earn, negative = redeem' })
    @IsNumber()
    declare points: number;

    @ApiProperty({ example: 'EARN', enum: ['EARN', 'REDEEM', 'EXPIRE', 'ADJUST'] })
    @IsString()
    declare type: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reference?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;
}

// ── Campaign ────────────────────────────────────────────────────────────────────
export class CreateCampaignDto {
    @ApiProperty({ example: 'Valentine Flash Promo' })
    @IsString()
    declare name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: CampaignChannel })
    @IsEnum(CampaignChannel)
    declare channel: CampaignChannel;

    @ApiProperty({ example: '💝 Special Valentine offer — 20% off Botox this weekend!' })
    @IsString()
    declare messageTemplate: string;

    @ApiPropertyOptional({
        example: ['VIP', 'ACTIVE'],
        description: 'Patient segments to target. Empty = all active patients',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetSegments?: string[];

    @ApiPropertyOptional({ description: 'Schedule send time (ISO 8601). Null = send immediately' })
    @IsOptional()
    @IsDateString()
    scheduledAt?: string;
}

export class UpdateCampaignDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    messageTemplate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @ApiPropertyOptional({ enum: CampaignStatus })
    @IsOptional()
    @IsEnum(CampaignStatus)
    status?: CampaignStatus;
}

// ── Interaction Search ────────────────────────────────────────────────────────
export class InteractionSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    patientId?: string;

    @ApiPropertyOptional({ enum: InteractionType })
    @IsOptional()
    @IsEnum(InteractionType)
    type?: InteractionType;

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
