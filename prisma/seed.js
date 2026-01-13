import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser({ email, password, role, clinicId = null, candidateId = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, clinicId, candidateId, isActive: true },
    create: { email, passwordHash, role, clinicId, candidateId, isActive: true }
  });
}

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { kvkNumber: '12345678' },
    update: {},
    create: {
      name: 'Voorbeeld Kliniek B.V.',
      address: 'Hoofdstraat 1, 1234 AB Amsterdam',
      kvkNumber: '12345678',
      contactName: 'Sanne de Vries',
      contactEmail: 'contact@kliniek.local',
      contactPhone: '+31 6 12345678',
      notes: 'Demo-kliniek voor Zovea Talent.'
    }
  });

  const candidate = await prisma.candidate.upsert({
    where: { email: 'kandidaat@zovea.local' },
    update: {},
    create: {
      firstName: 'Noor',
      lastName: 'Jansen',
      email: 'kandidaat@zovea.local',
      phone: '+31 6 87654321',
      location: 'Utrecht (en omgeving)',
      jobWishes: 'Tandartsassistent, 32 uur, voorkeur voor moderne praktijk met doorgroeimogelijkheden.',
      salaryRate: '€ 3.200 p/m (indicatie) / € 35 p/u (zzp)',
      availability: 'Beschikbaar op dinsdagen en donderdagen; overige dagen in overleg.',
      status: 'ACTIVE',
      notes: 'Kandidaat zoekt korte reistijd en vaste vrije vrijdag.'
    }
  });

  const owner = await upsertUser({
    email: 'eigenaar@zovea.local',
    password: 'Zovea!12345',
    role: 'OWNER'
  });

  const clientUser = await upsertUser({
    email: 'client@kliniek.local',
    password: 'Zovea!12345',
    role: 'CLIENT',
    clinicId: clinic.id
  });

  const candidateUser = await upsertUser({
    email: 'kandidaat@zovea.local',
    password: 'Zovea!12345',
    role: 'CANDIDATE',
    candidateId: candidate.id
  });

  await prisma.journey.create({
    data: {
      clinicId: clinic.id,
      candidateId: candidate.id,
      stage: 'FIRST_INTERVIEW',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Eerste kennismaking gepland via Teams.',
      createdByUserId: owner.id
    }
  });

  console.log('Seed complete.');
  console.log('Owner:', owner.email);
  console.log('Client:', clientUser.email, '(clinic:', clinic.name + ')');
  console.log('Candidate:', candidateUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

