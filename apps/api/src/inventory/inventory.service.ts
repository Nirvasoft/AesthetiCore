import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    StockSearchDto,
    ReceiveBatchDto,
    AdjustStockDto,
    CreatePurchaseOrderDto,
    ReceiveGrnDto,
    CreateStockTransferDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

    // ───────────────────────────────────────────────────────────────────────────
    // STOCK LEVELS
    // ───────────────────────────────────────────────────────────────────────────

    async getStockLevels(tenantId: string, dto: StockSearchDto) {
        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 30, 100);
        const skip = (page - 1) * limit;

        const productWhere: any = {
            tenantId,
            isActive: true,
            ...(dto.search && {
                OR: [
                    { name: { contains: dto.search, mode: 'insensitive' } },
                    { sku: { contains: dto.search, mode: 'insensitive' } },
                ],
            }),
        };

        const stockWhere: any = {
            ...(dto.branchId && { branchId: dto.branchId }),
            product: productWhere,
        };

        if (dto.filter === 'low_stock') {
            stockWhere.quantityOnHand = { lte: this.prisma.$queryRaw`"minStockLevel"` };
        }

        const [total, stocks] = await this.prisma.$transaction([
            this.prisma.inventoryStock.count({ where: stockWhere }),
            this.prisma.inventoryStock.findMany({
                where: stockWhere,
                skip,
                take: limit,
                orderBy: { product: { name: 'asc' } },
                include: {
                    product: {
                        select: {
                            id: true, name: true, sku: true, unit: true,
                            minStockLevel: true, costPrice: true, sellingPrice: true,
                            requiresLot: true,
                        },
                    },
                    branch: { select: { id: true, name: true } },
                },
            }),
        ]);

        // Annotate each stock with low-stock flag
        const data = stocks.map((s) => ({
            ...s,
            isLow: Number(s.quantityOnHand) <= s.product.minStockLevel,
        }));

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async getLowStockAlerts(tenantId: string, branchId?: string) {
        const stocks = await this.prisma.inventoryStock.findMany({
            where: {
                product: { tenantId, isActive: true },
                ...(branchId && { branchId }),
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true, minStockLevel: true } },
                branch: { select: { id: true, name: true } },
            },
        });

        return stocks
            .filter((s) => Number(s.quantityOnHand) <= s.product.minStockLevel)
            .map((s) => ({
                ...s,
                deficit: s.product.minStockLevel - Number(s.quantityOnHand),
            }));
    }

    async getExpiringBatches(tenantId: string, daysAhead = 90) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);

        return this.prisma.inventoryBatch.findMany({
            where: {
                product: { tenantId },
                expiryDate: { lte: cutoff },
                quantityOnHand: { gt: 0 },
                isExpired: false,
            },
            orderBy: { expiryDate: 'asc' },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true } },
            },
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // BATCHES
    // ───────────────────────────────────────────────────────────────────────────

    async getProductBatches(tenantId: string, productId: string, branchId?: string) {
        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
        if (!product) throw new NotFoundException('Product not found');

        return this.prisma.inventoryBatch.findMany({
            where: {
                productId,
                ...(branchId && { branchId }),
                quantityOnHand: { gt: 0 },
                isExpired: false,
            },
            orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
        });
    }

    async receiveBatch(
        tenantId: string,
        branchId: string,
        productId: string,
        dto: ReceiveBatchDto,
        userId: string,
    ) {
        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
        if (!product) throw new NotFoundException('Product not found');

        return this.prisma.$transaction(async (tx) => {
            const batch = await tx.inventoryBatch.create({
                data: {
                    productId,
                    branchId,
                    lotNumber: dto.lotNumber,
                    expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
                    quantityIn: dto.quantityIn,
                    quantityOnHand: dto.quantityIn,
                    costPerUnit: dto.costPerUnit,
                },
            });

            // Upsert stock level
            await tx.inventoryStock.upsert({
                where: { productId_branchId: { productId, branchId } },
                create: { productId, branchId, quantityOnHand: dto.quantityIn },
                update: { quantityOnHand: { increment: dto.quantityIn } },
            });

            // Inventory transaction record
            await tx.inventoryTransaction.create({
                data: {
                    batchId: batch.id,
                    branchId,
                    type: 'RECEIPT',
                    quantity: dto.quantityIn,
                    referenceType: 'manual_receipt',
                    createdById: userId,
                    notes: `Manual receipt — lot: ${dto.lotNumber ?? 'N/A'}`,
                },
            });

            return batch;
        });
    }

    async adjustStock(tenantId: string, branchId: string, dto: AdjustStockDto, userId: string) {
        const batch = await this.prisma.inventoryBatch.findFirst({
            where: { id: dto.batchId },
            include: { product: { select: { tenantId: true, id: true } } },
        });
        if (!batch || batch.product.tenantId !== tenantId) {
            throw new NotFoundException('Batch not found');
        }

        const newQty = Number(batch.quantityOnHand) + dto.quantity;
        if (newQty < 0) {
            throw new BadRequestException(`Insufficient stock. Available: ${batch.quantityOnHand}`);
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.inventoryBatch.update({
                where: { id: dto.batchId },
                data: { quantityOnHand: newQty },
            });

            await tx.inventoryStock.updateMany({
                where: { productId: batch.productId, branchId },
                data: { quantityOnHand: { increment: dto.quantity } },
            });

            await tx.inventoryTransaction.create({
                data: {
                    batchId: dto.batchId,
                    branchId,
                    type: dto.type as any,
                    quantity: dto.quantity,
                    referenceType: 'adjustment',
                    notes: dto.notes,
                    createdById: userId,
                },
            });

            return { success: true, newQuantityOnHand: newQty };
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PRODUCTS
    // ───────────────────────────────────────────────────────────────────────────

    async listProducts(tenantId: string, search?: string) {
        return this.prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { sku: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            },
            include: {
                category: { select: { id: true, name: true } },
                _count: { select: { batches: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async listSuppliers(tenantId: string) {
        return this.prisma.supplier.findMany({
            where: { tenantId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PURCHASE ORDERS
    // ───────────────────────────────────────────────────────────────────────────

    async createPurchaseOrder(tenantId: string, createdById: string, dto: CreatePurchaseOrderDto) {
        // Validate supplier
        const supplier = await this.prisma.supplier.findFirst({
            where: { id: dto.supplierId, tenantId },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');

        const totalAmount = dto.items.reduce(
            (sum, item) => sum + item.quantity * item.unitCost,
            0,
        );

        return this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.create({
                data: {
                    branchId: dto.branchId,
                    supplierId: dto.supplierId,
                    totalAmount,
                    notes: dto.notes,
                    expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
                    createdById,
                    status: 'DRAFT',
                    items: {
                        create: dto.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            totalCost: item.quantity * item.unitCost,
                        })),
                    },
                },
                include: { items: true, supplier: { select: { name: true } } },
            });
            return po;
        });
    }

    async listPurchaseOrders(tenantId: string, branchId?: string, status?: string) {
        return this.prisma.purchaseOrder.findMany({
            where: {
                branch: { tenantId },
                ...(branchId && { branchId }),
                ...(status && { status }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
                _count: { select: { items: true } },
            },
        });
    }

    async getPurchaseOrder(tenantId: string, poId: string) {
        const po = await this.prisma.purchaseOrder.findFirst({
            where: { id: poId, branch: { tenantId } },
            include: {
                supplier: true,
                branch: { select: { id: true, name: true } },
                items: {
                    include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
                },
                grnRecords: true,
            },
        });
        if (!po) throw new NotFoundException('Purchase order not found');
        return po;
    }

    async approvePurchaseOrder(tenantId: string, poId: string, approverId: string) {
        const po = await this.getPurchaseOrder(tenantId, poId);
        if (po.status !== 'DRAFT' && po.status !== 'SUBMITTED') {
            throw new UnprocessableEntityException(`Cannot approve PO in status: ${po.status}`);
        }

        return this.prisma.purchaseOrder.update({
            where: { id: poId },
            data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
        });
    }

    async submitPurchaseOrder(tenantId: string, poId: string) {
        const po = await this.getPurchaseOrder(tenantId, poId);
        if (po.status !== 'DRAFT') {
            throw new UnprocessableEntityException('Only DRAFT orders can be submitted');
        }
        return this.prisma.purchaseOrder.update({
            where: { id: poId },
            data: { status: 'SUBMITTED' },
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // GRN — GOODS RECEIPT
    // ───────────────────────────────────────────────────────────────────────────

    async receiveGrn(tenantId: string, poId: string, receivedById: string, dto: ReceiveGrnDto) {
        const po = await this.getPurchaseOrder(tenantId, poId);

        if (po.status !== 'APPROVED') {
            throw new UnprocessableEntityException('Only APPROVED purchase orders can be received');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create GRN record
            const grn = await tx.grnRecord.create({
                data: { purchaseOrderId: poId, receivedById, notes: dto.notes },
            });

            // Process each item — create batch + update stock
            for (const item of dto.items) {
                const batch = await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        branchId: po.branchId,
                        lotNumber: item.lotNumber,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        quantityIn: item.quantityReceived,
                        quantityOnHand: item.quantityReceived,
                        costPerUnit: item.costPerUnit,
                    },
                });

                await tx.inventoryStock.upsert({
                    where: { productId_branchId: { productId: item.productId, branchId: po.branchId } },
                    create: { productId: item.productId, branchId: po.branchId, quantityOnHand: item.quantityReceived },
                    update: { quantityOnHand: { increment: item.quantityReceived } },
                });

                await tx.inventoryTransaction.create({
                    data: {
                        batchId: batch.id,
                        branchId: po.branchId,
                        type: 'RECEIPT',
                        quantity: item.quantityReceived,
                        referenceId: poId,
                        referenceType: 'purchase_order',
                        createdById: receivedById,
                    },
                });
            }

            // Mark PO as received
            await tx.purchaseOrder.update({
                where: { id: poId },
                data: { status: 'RECEIVED' },
            });

            return grn;
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // STOCK TRANSFERS
    // ───────────────────────────────────────────────────────────────────────────

    async createStockTransfer(tenantId: string, requestedById: string, dto: CreateStockTransferDto) {
        if (dto.fromBranchId === dto.toBranchId) {
            throw new BadRequestException('Source and destination branches must be different');
        }

        // Validate all batches have sufficient stock
        for (const item of dto.items) {
            const batch = await this.prisma.inventoryBatch.findFirst({
                where: { id: item.batchId, branchId: dto.fromBranchId },
            });
            if (!batch) throw new NotFoundException(`Batch ${item.batchId} not found at source branch`);
            if (Number(batch.quantityOnHand) < item.quantity) {
                throw new UnprocessableEntityException(
                    `Insufficient stock for batch ${item.batchId}. Available: ${batch.quantityOnHand}`,
                );
            }
        }

        return this.prisma.stockTransfer.create({
            data: {
                fromBranchId: dto.fromBranchId,
                toBranchId: dto.toBranchId,
                requestedById,
                notes: dto.notes,
                status: 'PENDING',
                items: {
                    create: dto.items.map((i) => ({
                        productId: i.productId,
                        batchId: i.batchId,
                        quantity: i.quantity,
                    })),
                },
            },
            include: { items: true },
        });
    }

    async approveStockTransfer(tenantId: string, transferId: string, approverId: string) {
        const transfer = await this.prisma.stockTransfer.findFirst({
            where: { id: transferId },
            include: { items: true },
        });
        if (!transfer) throw new NotFoundException('Transfer not found');
        if (transfer.status !== 'PENDING') {
            throw new UnprocessableEntityException(`Cannot approve transfer in status: ${transfer.status}`);
        }

        return this.prisma.$transaction(async (tx) => {
            // Deduct from source, add to destination
            for (const item of transfer.items) {
                // Deduct from source batch
                await tx.inventoryBatch.update({
                    where: { id: item.batchId },
                    data: { quantityOnHand: { decrement: item.quantity } },
                });

                await tx.inventoryStock.updateMany({
                    where: { productId: item.productId, branchId: transfer.fromBranchId },
                    data: { quantityOnHand: { decrement: item.quantity } },
                });

                // Add to destination — create new batch at destination
                const srcBatch = await tx.inventoryBatch.findUnique({ where: { id: item.batchId } });
                const destBatch = await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        branchId: transfer.toBranchId,
                        lotNumber: srcBatch?.lotNumber,
                        expiryDate: srcBatch?.expiryDate,
                        quantityIn: item.quantity,
                        quantityOnHand: item.quantity,
                        costPerUnit: srcBatch?.costPerUnit ?? 0,
                    },
                });

                await tx.inventoryStock.upsert({
                    where: { productId_branchId: { productId: item.productId, branchId: transfer.toBranchId } },
                    create: { productId: item.productId, branchId: transfer.toBranchId, quantityOnHand: item.quantity },
                    update: { quantityOnHand: { increment: item.quantity } },
                });

                // Transactions for both sides
                await tx.inventoryTransaction.createMany({
                    data: [
                        {
                            batchId: item.batchId, branchId: transfer.fromBranchId,
                            type: 'TRANSFER_OUT', quantity: -item.quantity,
                            referenceId: transferId, referenceType: 'transfer',
                            createdById: approverId,
                        },
                        {
                            batchId: destBatch.id, branchId: transfer.toBranchId,
                            type: 'TRANSFER_IN', quantity: item.quantity,
                            referenceId: transferId, referenceType: 'transfer',
                            createdById: approverId,
                        },
                    ],
                });
            }

            return tx.stockTransfer.update({
                where: { id: transferId },
                data: { status: 'RECEIVED', approvedById: approverId, approvedAt: new Date() },
            });
        });
    }

    async listStockTransfers(tenantId: string, branchId?: string) {
        return this.prisma.stockTransfer.findMany({
            where: {
                OR: [
                    { fromBranchId: branchId ?? undefined },
                    { toBranchId: branchId ?? undefined },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { transfer: false } } },
            take: 50,
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // INVENTORY DASHBOARD
    // ───────────────────────────────────────────────────────────────────────────

    async getDashboard(tenantId: string, branchId?: string) {
        const now = new Date();
        const expiry30 = new Date(now); expiry30.setDate(now.getDate() + 30);
        const expiry90 = new Date(now); expiry90.setDate(now.getDate() + 90);

        const [
            totalProducts, totalBatches, lowStockCount,
            expiring30, expiring90, pendingPos,
            recentTransactions,
        ] = await this.prisma.$transaction([
            this.prisma.product.count({ where: { tenantId, isActive: true } }),
            this.prisma.inventoryBatch.count({
                where: {
                    product: { tenantId },
                    quantityOnHand: { gt: 0 },
                    isExpired: false,
                    ...(branchId && { branchId }),
                },
            }),
            // Low stock
            this.prisma.inventoryStock.count({
                where: { product: { tenantId }, ...(branchId && { branchId }) },
            }),
            // Expiring in 30d
            this.prisma.inventoryBatch.count({
                where: {
                    product: { tenantId },
                    expiryDate: { gte: now, lte: expiry30 },
                    quantityOnHand: { gt: 0 },
                    isExpired: false,
                    ...(branchId && { branchId }),
                },
            }),
            // Expiring in 90d
            this.prisma.inventoryBatch.count({
                where: {
                    product: { tenantId },
                    expiryDate: { gte: now, lte: expiry90 },
                    quantityOnHand: { gt: 0 },
                    isExpired: false,
                    ...(branchId && { branchId }),
                },
            }),
            // Pending POs
            this.prisma.purchaseOrder.count({
                where: { branch: { tenantId }, status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } },
            }),
            // Recent transactions
            this.prisma.inventoryTransaction.findMany({
                where: { ...(branchId && { branchId }) },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    batch: { include: { product: { select: { name: true, sku: true } } } },
                },
            }),
        ]);

        return {
            totals: { products: totalProducts, batches: totalBatches, lowStock: lowStockCount },
            expiry: { within30Days: expiring30, within90Days: expiring90 },
            orders: { pendingPOs: pendingPos },
            recentTransactions,
        };
    }
}
