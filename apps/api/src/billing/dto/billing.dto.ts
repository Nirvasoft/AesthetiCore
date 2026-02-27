import {
    IsString, IsOptional, IsNumber, IsPositive,
    IsArray, ValidateNested, IsEnum, IsBoolean, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Enums ─────────────────────────────────────────────────────────────────────
export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    QR_CODE = 'QR_CODE',
    BANK_TRANSFER = 'BANK_TRANSFER',
    PATIENT_CREDIT = 'PATIENT_CREDIT',
    PACKAGE = 'PACKAGE',
    INSTALMENT = 'INSTALMENT',
}

export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    ISSUED = 'ISSUED',
    PARTIAL = 'PARTIAL',
    PAID = 'PAID',
    VOID = 'VOID',
    REFUNDED = 'REFUNDED',
}

// ── Invoice Line Item ─────────────────────────────────────────────────────────
export class InvoiceItemDto {
    @ApiProperty({ example: 'Botox — Forehead 20U' })
    @IsString()
    declare description: string;

    @ApiPropertyOptional({ example: 'treatment-line-id' })
    @IsOptional()
    @IsString()
    treatmentLineId?: string;

    @ApiPropertyOptional({ example: 'product-id' })
    @IsOptional()
    @IsString()
    productId?: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsPositive()
    declare quantity: number;

    @ApiProperty({ example: 3500.00 })
    @IsNumber()
    @IsPositive()
    declare unitPrice: number;

    @ApiPropertyOptional({ example: 0, description: 'Discount percentage 0-100' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountPct?: number;

    @ApiPropertyOptional({ example: 0, description: 'Flat discount amount' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmt?: number;
}

// ── Create Invoice ─────────────────────────────────────────────────────────────
export class CreateInvoiceDto {
    @ApiProperty()
    @IsString()
    declare patientId: string;

    @ApiPropertyOptional({ description: 'Link to a treatment session' })
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiProperty({ example: 7, description: 'Tax rate percentage' })
    @IsNumber()
    @Min(0)
    declare taxRate: number;

    @ApiPropertyOptional({ example: 10, description: 'Service charge percentage' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    serviceChargePct?: number;

    @ApiPropertyOptional({ example: 500, description: 'Overall discount amount' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    overallDiscountAmt?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [InvoiceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    declare items: InvoiceItemDto[];
}

// ── Record Payment ────────────────────────────────────────────────────────────
export class RecordPaymentDto {
    @ApiProperty({ example: 3500.00 })
    @IsNumber()
    @IsPositive()
    declare amount: number;

    @ApiProperty({ enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    declare method: PaymentMethod;

    @ApiPropertyOptional({ example: 'TXN-2026-001' })
    @IsOptional()
    @IsString()
    reference?: string;

    @ApiPropertyOptional({ example: 'VISA ending 4242' })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiPropertyOptional({ description: 'Instalment plan ID if method = INSTALMENT' })
    @IsOptional()
    @IsString()
    instalmentPlanId?: string;
}

// ── Void / Refund ──────────────────────────────────────────────────────────────
export class VoidInvoiceDto {
    @ApiProperty({ example: 'Duplicate invoice' })
    @IsString()
    declare reason: string;
}

export class RefundDto {
    @ApiProperty({ example: 1500.00 })
    @IsNumber()
    @IsPositive()
    declare amount: number;

    @ApiProperty({ example: 'Patient requested refund for unused session' })
    @IsString()
    declare reason: string;

    @ApiPropertyOptional({ description: 'If true, refund as patient credit balance' })
    @IsOptional()
    @IsBoolean()
    refundToCredit?: boolean;
}

// ── Instalment Plan ───────────────────────────────────────────────────────────
export class CreateInstalmentPlanDto {
    @ApiProperty({ example: 'inv-id-here' })
    @IsString()
    declare invoiceId: string;

    @ApiProperty({ example: 3, description: 'Number of instalments' })
    @IsNumber()
    @IsPositive()
    declare instalments: number;

    @ApiProperty({ example: '2026-03-01', description: 'First payment due date' })
    @IsString()
    declare firstDueDate: string;

    @ApiPropertyOptional({ example: 30, description: 'Days between each instalment' })
    @IsOptional()
    @IsNumber()
    intervalDays?: number;
}

// ── Commission ─────────────────────────────────────────────────────────────────
export class CommissionSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    practitionerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    toDate?: string;
}

// ── Invoice Search ─────────────────────────────────────────────────────────────
export class InvoiceSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    patientId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    toDate?: string;

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
