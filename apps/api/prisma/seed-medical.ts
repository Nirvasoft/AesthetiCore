import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env['DATABASE_URL']
        ?? 'postgresql://postgres:pgadmin@localhost:5433/aestheticore?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const patients = await prisma.patient.findMany({ orderBy: { patientCode: 'asc' } });
    console.log('Found', patients.length, 'patients');

    // Lalisa (VIP, PT-0001) — allergies + med history + PDPA
    await prisma.patientAllergy.createMany({
        data: [
            { patientId: patients[0].id, allergen: 'Lidocaine', reaction: 'Angioedema', severity: 'severe' },
            { patientId: patients[0].id, allergen: 'Latex', reaction: 'Contact dermatitis', severity: 'moderate' },
        ]
    });
    await prisma.patientMedicalHistory.createMany({
        data: [
            { patientId: patients[0].id, condition: 'Hypothyroidism', details: 'On Levothyroxine 50mcg daily', isActive: true },
            { patientId: patients[0].id, condition: 'Rhinoplasty (2020)', details: 'Previous cosmetic surgery — no complications', isActive: false },
        ]
    });
    await prisma.pdpaConsent.createMany({
        data: [
            { patientId: patients[0].id, consentType: 'data_processing', isGranted: true, ipAddress: '203.150.44.12' },
            { patientId: patients[0].id, consentType: 'photo_use', isGranted: true, ipAddress: '203.150.44.12' },
            { patientId: patients[0].id, consentType: 'marketing', isGranted: false, ipAddress: '203.150.44.12' },
        ]
    });
    console.log('✅ Lalisa: 2 allergies, 2 medical, 3 PDPA');

    // Bright (ACTIVE, PT-0002) — penicillin allergy, keloid
    await prisma.patientAllergy.create({ data: { patientId: patients[1].id, allergen: 'Penicillin', reaction: 'Urticaria & dyspnea', severity: 'severe' } });
    await prisma.patientMedicalHistory.create({ data: { patientId: patients[1].id, condition: 'Keloid tendency', details: 'Hypertrophic scarring observed post-biopsy left arm', isActive: true } });
    await prisma.pdpaConsent.createMany({
        data: [
            { patientId: patients[1].id, consentType: 'data_processing', isGranted: true, ipAddress: '110.78.12.55' },
            { patientId: patients[1].id, consentType: 'marketing', isGranted: true, ipAddress: '110.78.12.55' },
        ]
    });
    console.log('✅ Bright: 1 allergy, 1 medical, 2 PDPA');

    // Yaya (VIP, PT-0003) — nickel allergy, melasma
    await prisma.patientAllergy.create({ data: { patientId: patients[2].id, allergen: 'Nickel', reaction: 'Contact dermatitis', severity: 'mild' } });
    await prisma.patientMedicalHistory.createMany({
        data: [
            { patientId: patients[2].id, condition: 'Melasma (Type III)', details: 'Bilateral malar distribution, on topical HQ 4%', isActive: true },
            { patientId: patients[2].id, condition: 'Oral contraceptive use', details: 'Yasmin — contributory factor to melasma', isActive: true },
        ]
    });
    await prisma.pdpaConsent.createMany({
        data: [
            { patientId: patients[2].id, consentType: 'data_processing', isGranted: true },
            { patientId: patients[2].id, consentType: 'photo_use', isGranted: true },
            { patientId: patients[2].id, consentType: 'marketing', isGranted: true },
        ]
    });
    console.log('✅ Yaya: 1 allergy, 2 medical, 3 PDPA');

    // Baifern (VIP, PT-0007)
    await prisma.patientMedicalHistory.create({ data: { patientId: patients[6].id, condition: 'Type 2 Diabetes', details: 'Controlled with Metformin 500mg BID. HbA1c 6.2%', isActive: true } });
    await prisma.patientAllergy.create({ data: { patientId: patients[6].id, allergen: 'Retinol (high conc.)', reaction: 'Severe irritation, erythema', severity: 'moderate' } });
    await prisma.pdpaConsent.createMany({
        data: [
            { patientId: patients[6].id, consentType: 'data_processing', isGranted: true },
            { patientId: patients[6].id, consentType: 'photo_use', isGranted: false },
        ]
    });
    console.log('✅ Baifern: 1 allergy, 1 medical, 2 PDPA');

    // Mai (ACTIVE, PT-0005) — just consents
    await prisma.pdpaConsent.createMany({
        data: [
            { patientId: patients[4].id, consentType: 'data_processing', isGranted: true },
            { patientId: patients[4].id, consentType: 'marketing', isGranted: true },
            { patientId: patients[4].id, consentType: 'photo_use', isGranted: true },
        ]
    });
    console.log('✅ Mai: 3 PDPA consents');

    console.log('\n🎉 Medical + PDPA data seeded!');
    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
