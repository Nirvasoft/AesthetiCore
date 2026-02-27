import {
    Controller, Get, Post, Put, Param, Body, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
    StockSearchDto, ReceiveBatchDto, AdjustStockDto,
    CreatePurchaseOrderDto, ReceiveGrnDto, CreateStockTransferDto,
} from './dto/inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
    constructor(private readonly svc: InventoryService) { }

    // ── Dashboard ──────────────────────────────────────────────────────────────
    @Get('dashboard')
    @ApiOperation({ summary: 'Inventory dashboard — totals, expiry alerts, recent transactions' })
    getDashboard(@Query('branchId') branchId: string, @Req() req: any) {
        return this.svc.getDashboard(req.tenantContext.tenantId, branchId);
    }

    // ── Stock Levels ───────────────────────────────────────────────────────────
    @Get('stock')
    @ApiOperation({ summary: 'List stock levels across products (paginated, filterable)' })
    getStock(@Query() q: StockSearchDto, @Req() req: any) {
        return this.svc.getStockLevels(req.tenantContext.tenantId, q);
    }

    @Get('stock/low')
    @ApiOperation({ summary: 'Products below minimum stock level' })
    getLowStock(@Query('branchId') branchId: string, @Req() req: any) {
        return this.svc.getLowStockAlerts(req.tenantContext.tenantId, branchId);
    }

    @Get('stock/expiring')
    @ApiOperation({ summary: 'Batches expiring within N days (default 90)' })
    @ApiQuery({ name: 'days', required: false })
    getExpiring(@Query('days') days: number, @Req() req: any) {
        return this.svc.getExpiringBatches(req.tenantContext.tenantId, days ?? 90);
    }

    @Post('stock/adjust')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Adjust batch quantity (ADJUSTMENT, WASTAGE, EXPIRED)' })
    adjustStock(@Body() dto: AdjustStockDto, @Req() req: any) {
        return this.svc.adjustStock(
            req.tenantContext.tenantId, req.tenantContext.branchId, dto, req.user.id,
        );
    }

    // ── Products ───────────────────────────────────────────────────────────────
    @Get('products')
    @ApiOperation({ summary: 'List all products for the tenant' })
    listProducts(@Query('search') search: string, @Req() req: any) {
        return this.svc.listProducts(req.tenantContext.tenantId, search);
    }

    @Get('products/:productId/batches')
    @ApiOperation({ summary: 'Get all active batches for a product' })
    getProductBatches(
        @Param('productId') productId: string,
        @Query('branchId') branchId: string,
        @Req() req: any,
    ) {
        return this.svc.getProductBatches(req.tenantContext.tenantId, productId, branchId);
    }

    @Post('products/:productId/batches')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Manually receive a new batch for a product' })
    receiveBatch(
        @Param('productId') productId: string,
        @Body() dto: ReceiveBatchDto,
        @Req() req: any,
    ) {
        return this.svc.receiveBatch(
            req.tenantContext.tenantId, req.tenantContext.branchId, productId, dto, req.user.id,
        );
    }

    // ── Suppliers ──────────────────────────────────────────────────────────────
    @Get('suppliers')
    @ApiOperation({ summary: 'List suppliers for the tenant' })
    listSuppliers(@Req() req: any) {
        return this.svc.listSuppliers(req.tenantContext.tenantId);
    }

    // ── Purchase Orders ────────────────────────────────────────────────────────
    @Get('purchase-orders')
    @ApiOperation({ summary: 'List purchase orders (filterable by branch and status)' })
    listPOs(
        @Query('branchId') branchId: string,
        @Query('status') status: string,
        @Req() req: any,
    ) {
        return this.svc.listPurchaseOrders(req.tenantContext.tenantId, branchId, status);
    }

    @Post('purchase-orders')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Create a new purchase order (starts as DRAFT)' })
    createPO(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
        return this.svc.createPurchaseOrder(req.tenantContext.tenantId, req.user.id, dto);
    }

    @Get('purchase-orders/:id')
    @ApiOperation({ summary: 'Get full PO details with line items and GRN records' })
    getPO(@Param('id') id: string, @Req() req: any) {
        return this.svc.getPurchaseOrder(req.tenantContext.tenantId, id);
    }

    @Put('purchase-orders/:id/submit')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit DRAFT PO for approval' })
    submitPO(@Param('id') id: string, @Req() req: any) {
        return this.svc.submitPurchaseOrder(req.tenantContext.tenantId, id);
    }

    @Put('purchase-orders/:id/approve')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve a submitted PO' })
    approvePO(@Param('id') id: string, @Req() req: any) {
        return this.svc.approvePurchaseOrder(req.tenantContext.tenantId, id, req.user.id);
    }

    @Post('purchase-orders/:id/grn')
    @Roles(UserRole.BRANCH_MANAGER, UserRole.HQ_ADMIN)
    @ApiOperation({ summary: 'Receive goods against an approved PO (creates batches + updates stock)' })
    receiveGrn(@Param('id') id: string, @Body() dto: ReceiveGrnDto, @Req() req: any) {
        return this.svc.receiveGrn(req.tenantContext.tenantId, id, req.user.id, dto);
    }

    // ── Stock Transfers ────────────────────────────────────────────────────────
    @Get('transfers')
    @ApiOperation({ summary: 'List stock transfers involving this branch' })
    listTransfers(@Query('branchId') branchId: string, @Req() req: any) {
        return this.svc.listStockTransfers(req.tenantContext.tenantId, branchId);
    }

    @Post('transfers')
    @ApiOperation({ summary: 'Request a stock transfer between branches' })
    createTransfer(@Body() dto: CreateStockTransferDto, @Req() req: any) {
        return this.svc.createStockTransfer(req.tenantContext.tenantId, req.user.id, dto);
    }

    @Put('transfers/:id/approve')
    @Roles(UserRole.HQ_ADMIN, UserRole.BRANCH_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve & execute stock transfer (atomic deduct/add)' })
    approveTransfer(@Param('id') id: string, @Req() req: any) {
        return this.svc.approveStockTransfer(req.tenantContext.tenantId, id, req.user.id);
    }
}
