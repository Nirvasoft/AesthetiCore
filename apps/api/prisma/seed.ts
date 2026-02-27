import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL']
        ?? 'postgresql://postgres:pgadmin@localhost:5433/aestheticore?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding AesthetiCore database...\n');

    // ── 1. Tenant ──
    const tenant = await prisma.tenant.create({
        data: { name: 'AesthetiCore Bangkok', slug: 'aestheticore-bkk', settings: { defaultCurrency: 'THB', taxRate: 7 } },
    });
    console.log('✅ Tenant:', tenant.name);

    // ── 2. Branches ──
    const hq = await prisma.branch.create({
        data: { tenantId: tenant.id, name: 'Sukhumvit HQ', code: 'SKV-HQ', address: '123 Sukhumvit Soi 33, Bangkok 10110', phone: '+66-2-123-4567', email: 'hq@aestheticore.com' },
    });
    const silom = await prisma.branch.create({
        data: { tenantId: tenant.id, name: 'Silom Branch', code: 'SLM-01', address: '456 Silom Road, Bangkok 10500', phone: '+66-2-987-6543', email: 'silom@aestheticore.com' },
    });
    console.log('✅ Branches: 2');

    // ── 3. Rooms ──
    const rooms = await Promise.all([
        prisma.room.create({ data: { branchId: hq.id, name: 'Treatment Room A' } }),
        prisma.room.create({ data: { branchId: hq.id, name: 'Treatment Room B' } }),
        prisma.room.create({ data: { branchId: hq.id, name: 'Consultation Room', capacity: 2 } }),
        prisma.room.create({ data: { branchId: hq.id, name: 'Laser Room' } }),
        prisma.room.create({ data: { branchId: silom.id, name: 'Room 1' } }),
        prisma.room.create({ data: { branchId: silom.id, name: 'Room 2' } }),
    ]);
    console.log('✅ Rooms:', rooms.length);

    // ── 4. Users ──
    const pw = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: hq.id, email: 'admin@aestheticore.com', passwordHash: pw, firstName: 'Somchai', lastName: 'Rattanakul', role: 'HQ_ADMIN' },
    });
    const doctor = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: hq.id, email: 'dr.nara@aestheticore.com', passwordHash: pw, firstName: 'Dr. Nara', lastName: 'Siriwan', role: 'DOCTOR' },
    });
    const nurse = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: hq.id, email: 'ploy@aestheticore.com', passwordHash: pw, firstName: 'Ploy', lastName: 'Chaiworapat', role: 'NURSE' },
    });
    const reception = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: hq.id, email: 'mae@aestheticore.com', passwordHash: pw, firstName: 'Mae', lastName: 'Pimchan', role: 'RECEPTIONIST' },
    });
    const mgr = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: silom.id, email: 'tong@aestheticore.com', passwordHash: pw, firstName: 'Tong', lastName: 'Prasert', role: 'BRANCH_MANAGER' },
    });
    console.log('✅ Users: 5 (all password: admin123)');

    // ── 5. Staff Profiles ──
    await prisma.staffProfile.create({ data: { userId: doctor.id, branchId: hq.id, specialty: 'Dermatology & Laser', licenseNumber: 'TH-MD-48721', commissionRate: 0.15 } });
    await prisma.staffProfile.create({ data: { userId: nurse.id, branchId: hq.id, specialty: 'Aesthetics Nursing', commissionRate: 0.05 } });
    await prisma.staffProfile.create({ data: { userId: mgr.id, branchId: silom.id, specialty: 'Operations', commissionRate: 0.03 } });
    console.log('✅ Staff Profiles: 3');

    // ── 6. Patients ──
    const patients = await Promise.all([
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0001', firstName: 'Lalisa', lastName: 'Manoban', phone: '081-234-5678', email: 'lalisa@email.com', gender: 'Female', segment: 'VIP', loyaltyPoints: 520, dateOfBirth: new Date('1997-03-27') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0002', firstName: 'Bright', lastName: 'Vachirawit', phone: '082-345-6789', email: 'bright@email.com', gender: 'Male', segment: 'ACTIVE', loyaltyPoints: 320, dateOfBirth: new Date('1991-12-04') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0003', firstName: 'Yaya', lastName: 'Urassaya', phone: '083-456-7890', email: 'yaya@email.com', gender: 'Female', segment: 'VIP', loyaltyPoints: 1050, dateOfBirth: new Date('1993-03-18') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0004', firstName: 'Nadech', lastName: 'Kugimiya', phone: '084-567-8901', gender: 'Male', segment: 'ACTIVE', loyaltyPoints: 180, dateOfBirth: new Date('1991-12-17') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: silom.id, patientCode: 'PT-0005', firstName: 'Mai', lastName: 'Davika', phone: '085-678-9012', email: 'mai@email.com', gender: 'Female', segment: 'ACTIVE', loyaltyPoints: 90, dateOfBirth: new Date('1992-05-16') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: silom.id, patientCode: 'PT-0006', firstName: 'Win', lastName: 'Metawin', phone: '086-789-0123', gender: 'Male', segment: 'LEAD', dateOfBirth: new Date('1999-02-21') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0007', firstName: 'Baifern', lastName: 'Pimchanok', phone: '087-890-1234', email: 'baifern@email.com', gender: 'Female', segment: 'VIP', loyaltyPoints: 840, dateOfBirth: new Date('1992-09-30') } }),
        prisma.patient.create({ data: { tenantId: tenant.id, branchId: hq.id, patientCode: 'PT-0008', firstName: 'James', lastName: 'Jirayu', phone: '088-901-2345', gender: 'Male', segment: 'INACTIVE', dateOfBirth: new Date('1993-12-22') } }),
    ]);
    console.log('✅ Patients:', patients.length);

    // ── 7. Product Categories + Products ──
    const catInjectable = await prisma.productCategory.create({ data: { tenantId: tenant.id, name: 'Injectable' } });
    const catSkincare = await prisma.productCategory.create({ data: { tenantId: tenant.id, name: 'Skincare' } });
    const catSupplies = await prisma.productCategory.create({ data: { tenantId: tenant.id, name: 'Supplies' } });
    const catRetail = await prisma.productCategory.create({ data: { tenantId: tenant.id, name: 'Retail' } });

    const products = await Promise.all([
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catInjectable.id, sku: 'INJ-BOT-50', name: 'Botox 50U Vial', unit: 'vial', costPrice: 3500, sellingPrice: 8500, minStockLevel: 5 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catInjectable.id, sku: 'INJ-FIL-1ML', name: 'HA Filler 1ml', unit: 'syringe', costPrice: 5000, sellingPrice: 15000, minStockLevel: 10 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSkincare.id, sku: 'SKC-PEEL-GL', name: 'Glycolic Acid Peel 30%', unit: 'bottle', costPrice: 800, sellingPrice: 3500, minStockLevel: 3 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catRetail.id, sku: 'SKC-SUNSC', name: 'Medical Sunscreen SPF50', unit: 'tube', costPrice: 280, sellingPrice: 890, minStockLevel: 20 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSupplies.id, sku: 'SUP-GLOVE-M', name: 'Nitrile Gloves (M)', unit: 'box', costPrice: 150, sellingPrice: 0, minStockLevel: 10 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSupplies.id, sku: 'SUP-GAUZE', name: 'Sterile Gauze', unit: 'pack', costPrice: 45, sellingPrice: 0, minStockLevel: 15 } }),
    ]);

    // Stock + Batches for HQ
    for (const product of products) {
        const qty = Math.floor(Math.random() * 40) + 5;
        await prisma.inventoryBatch.create({
            data: {
                productId: product.id, branchId: hq.id,
                lotNumber: `LOT-${product.sku}-001`,
                expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                quantityIn: qty, quantityOnHand: qty, costPerUnit: Number(product.costPrice),
            },
        });
        await prisma.inventoryStock.create({
            data: { productId: product.id, branchId: hq.id, quantityOnHand: qty },
        });
    }
    console.log('✅ Products:', products.length, '| Stock + Batches created');

    // ── 8. Appointments (today) ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aptData = [
        { patientId: patients[0].id, hr: 9, status: 'CONFIRMED' as const, note: 'Botox — Forehead', roomId: rooms[0].id },
        { patientId: patients[1].id, hr: 10, status: 'CHECKED_IN' as const, note: 'Pico Laser Session', roomId: rooms[3].id },
        { patientId: patients[2].id, hr: 11, status: 'PENDING' as const, note: 'Filler — Lips consultation', roomId: rooms[0].id },
        { patientId: patients[6].id, hr: 14, status: 'CONFIRMED' as const, note: 'PRP Therapy', roomId: rooms[1].id },
        { patientId: patients[3].id, hr: 15, status: 'PENDING' as const, note: 'Botox — Jawline Slimming', roomId: rooms[0].id },
    ];
    for (const a of aptData) {
        const start = new Date(today); start.setHours(a.hr);
        const end = new Date(start); end.setMinutes(45);
        await prisma.appointment.create({
            data: { branchId: hq.id, patientId: a.patientId, practitionerId: doctor.id, roomId: a.roomId, startTime: start, endTime: end, status: a.status, serviceNote: a.note },
        });
    }
    console.log('✅ Appointments: 5 (today)');

    // ── 9. Treatment Sessions (completed, past) ──
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.treatmentSession.create({
        data: {
            tenantId: tenant.id, branchId: hq.id, patientId: patients[0].id, practitionerId: doctor.id,
            doctorSignedById: doctor.id, status: 'COMPLETED', visitDate: lastWeek, doctorSignedAt: lastWeek,
            chiefComplaint: 'Forehead wrinkles — patient requests 30 units',
            assessment: 'Dynamic rhytides - moderate',
            plan: 'Administered 30U Botox across 5 injection sites. Patient tolerated well.',
        },
    });
    await prisma.treatmentSession.create({
        data: {
            tenantId: tenant.id, branchId: hq.id, patientId: patients[2].id, practitionerId: doctor.id,
            doctorSignedById: doctor.id, status: 'COMPLETED', visitDate: new Date(Date.now() - 3 * 86400000), doctorSignedAt: new Date(Date.now() - 3 * 86400000),
            chiefComplaint: 'PIH from old acne marks',
            assessment: 'Post-inflammatory hyperpigmentation',
            plan: '2 passes Pico Laser 1064nm. Mild erythema post-treatment.',
        },
    });
    console.log('✅ Treatment Sessions: 2');

    // ── 10. Invoices ──
    const inv1 = await prisma.invoice.create({
        data: { branchId: hq.id, patientId: patients[0].id, invoiceNumber: 'INV-2026-0001', subtotal: 8500, taxAmount: 595, discountAmount: 0, totalAmount: 9095, status: 'PAID', issuedAt: lastWeek, paidAt: lastWeek },
    });
    await prisma.invoiceItem.create({
        data: { invoiceId: inv1.id, description: 'Botox — Forehead (30U)', quantity: 1, unitPrice: 8500, lineTotal: 8500, type: 'service' },
    });
    await prisma.payment.create({
        data: { invoiceId: inv1.id, method: 'CREDIT_CARD', amount: 9095, reference: 'VISA-***4521', processedById: reception.id },
    });

    const inv2 = await prisma.invoice.create({
        data: { branchId: hq.id, patientId: patients[2].id, invoiceNumber: 'INV-2026-0002', subtotal: 5500, taxAmount: 385, discountAmount: 500, totalAmount: 5385, status: 'PAID', issuedAt: new Date(Date.now() - 3 * 86400000), paidAt: new Date(Date.now() - 3 * 86400000) },
    });
    await prisma.invoiceItem.create({
        data: { invoiceId: inv2.id, description: 'Pico Laser Session', quantity: 1, unitPrice: 5500, lineTotal: 5500, type: 'service' },
    });
    await prisma.payment.create({
        data: { invoiceId: inv2.id, method: 'QR_CODE', amount: 5385, reference: 'QR-PROMPTPAY', processedById: reception.id },
    });

    const inv3 = await prisma.invoice.create({
        data: { branchId: hq.id, patientId: patients[1].id, invoiceNumber: 'INV-2026-0003', subtotal: 12000, taxAmount: 840, discountAmount: 0, totalAmount: 12840, status: 'ISSUED', issuedAt: new Date() },
    });
    await prisma.invoiceItem.create({
        data: { invoiceId: inv3.id, description: 'Botox — Jawline Slimming', quantity: 1, unitPrice: 12000, lineTotal: 12000, type: 'service' },
    });
    console.log('✅ Invoices: 3 (2 paid, 1 outstanding)');

    // ── 11. Campaigns ──
    await prisma.campaign.create({
        data: { tenantId: tenant.id, createdById: admin.id, name: 'Summer Glow Package', description: 'IPL + Chemical Peel combo at 20% off', channel: 'LINE', messageTemplate: 'Hi {{name}}! ☀️ Enjoy 20% off our Summer Glow Package...', targetSegments: ['VIP', 'ACTIVE'], status: 'SCHEDULED', audienceCount: 120, scheduledAt: new Date(Date.now() + 2 * 86400000) },
    });
    await prisma.campaign.create({
        data: { tenantId: tenant.id, createdById: admin.id, name: 'VIP Loyalty Rewards', description: 'Double points for VIP patients this month', channel: 'EMAIL', messageTemplate: 'Dear {{name}}, as a valued VIP member...', targetSegments: ['VIP'], status: 'SENT', audienceCount: 45, sentCount: 43, sentAt: new Date(Date.now() - 5 * 86400000) },
    });
    console.log('✅ Campaigns: 2');

    console.log('\n🎉 Seeding complete!');
    console.log('────────────────────────────────');
    console.log('   Login:    admin@aestheticore.com');
    console.log('   Password: admin123');
    console.log('   (All 5 users share the same password)');
    console.log('────────────────────────────────\n');
}

main()
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });
