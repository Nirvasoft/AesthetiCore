import {
    IsString, IsOptional, IsNumber, IsPositive,
    IsDateString, IsArray, ValidateNested, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Stock / Batch ──────────────────────────────────────────────────────────────
export class StockSearchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter: low_stock | expiring_soon | all' })
    @IsOptional()
    @IsString()
    filter?: string;

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

export class ReceiveBatchDto {
    @ApiPropertyOptional({ example: 'LOT-2026-001' })
    @IsOptional()
    @IsString()
    lotNumber?: string;

    @ApiPropertyOptional({ example: '2027-06-30' })
    @IsOptional()
    @IsDateString()
    expiryDate?: string;

    @ApiProperty({ example: 50 })
    @IsNumber()
    @IsPositive()
    declare quantityIn: number;

    @ApiProperty({ example: 450.00, description: 'Cost per unit' })
    @IsNumber()
    @IsPositive()
    declare costPerUnit: number;
}

export class AdjustStockDto {
    @ApiProperty({ example: 'batch-id-here' })
    @IsString()
    declare batchId: string;

    @ApiProperty({ example: -5, description: 'Positive = add, negative = remove' })
    @IsNumber()
    declare quantity: number;

    @ApiProperty({ example: 'ADJUSTMENT', enum: ['ADJUSTMENT', 'WASTAGE', 'EXPIRED'] })
    @IsString()
    declare type: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────
export class PurchaseOrderItemDto {
    @ApiProperty({ example: 'product-id-here' })
    @IsString()
    declare productId: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @IsPositive()
    declare quantity: number;

    @ApiProperty({ example: 450.00 })
    @IsNumber()
    @IsPositive()
    declare unitCost: number;
}

export class CreatePurchaseOrderDto {
    @ApiProperty()
    @IsString()
    declare branchId: string;

    @ApiProperty()
    @IsString()
    declare supplierId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expectedAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [PurchaseOrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseOrderItemDto)
    declare items: PurchaseOrderItemDto[];
}

// ── GRN — Goods Receipt Note ──────────────────────────────────────────────────
export class GrnItemDto {
    @ApiProperty({ description: 'Product ID' })
    @IsString()
    declare productId: string;

    @ApiProperty({ example: 95, description: 'Actual quantity received' })
    @IsNumber()
    @IsPositive()
    declare quantityReceived: number;

    @ApiPropertyOptional({ example: 'LOT-2026-001' })
    @IsOptional()
    @IsString()
    lotNumber?: string;

    @ApiPropertyOptional({ example: '2027-06-30' })
    @IsOptional()
    @IsDateString()
    expiryDate?: string;

    @ApiProperty({ example: 450.00 })
    @IsNumber()
    @IsPositive()
    declare costPerUnit: number;
}

export class ReceiveGrnDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [GrnItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GrnItemDto)
    declare items: GrnItemDto[];
}

// ── Stock Transfer ────────────────────────────────────────────────────────────
export class StockTransferItemDto {
    @ApiProperty()
    @IsString()
    declare productId: string;

    @ApiProperty()
    @IsString()
    declare batchId: string;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @IsPositive()
    declare quantity: number;
}

export class CreateStockTransferDto {
    @ApiProperty({ description: 'Source branch ID' })
    @IsString()
    declare fromBranchId: string;

    @ApiProperty({ description: 'Destination branch ID' })
    @IsString()
    declare toBranchId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [StockTransferItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StockTransferItemDto)
    declare items: StockTransferItemDto[];
}
