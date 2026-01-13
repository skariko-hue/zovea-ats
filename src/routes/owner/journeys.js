import express from 'express';
import { z } from 'zod';

const router = express.Router();

function parseDateTimeLocal(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

router.get('/', async (req, res, next) => {
  try {
    const journeys = await req.prisma.journey.findMany({
      orderBy: { createdAt: 'desc' },
      include: { clinic: true, candidate: true }
    });
    const [clinics, candidates] = await Promise.all([
      req.prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } }),
      req.prisma.candidate.findMany({ orderBy: { createdAt: 'desc' } })
    ]);
    return res.render('owner/journeys/list', { req, journeys, clinics, candidates, error: null, values: {} });
  } catch (e) {
    return next(e);
  }
});

router.post('/new', async (req, res, next) => {
  try {
    const schema = z.object({
      clinicId: z.string().min(1),
      candidateId: z.string().min(1),
      stage: z.enum(['FIRST_INTERVIEW', 'TRIAL_DAY', 'FINAL_OFFER', 'PLACED', 'REJECTED', 'WITHDRAWN']),
      scheduledAt: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);

    const journey = await req.prisma.journey.create({
      data: {
        clinicId: v.clinicId,
        candidateId: v.candidateId,
        stage: v.stage,
        scheduledAt: parseDateTimeLocal(v.scheduledAt) || null,
        notes: v.notes || null,
        createdByUserId: req.user.id
      }
    });

    if (v.stage === 'PLACED') {
      await req.prisma.candidate.update({
        where: { id: v.candidateId },
        data: { placedClinicId: v.clinicId, placedAt: new Date() }
      });
    }

    return res.redirect(`/owner/journeys#j-${journey.id}`);
  } catch (e) {
    try {
      const journeys = await req.prisma.journey.findMany({
        orderBy: { createdAt: 'desc' },
        include: { clinic: true, candidate: true }
      });
      const [clinics, candidates] = await Promise.all([
        req.prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } }),
        req.prisma.candidate.findMany({ orderBy: { createdAt: 'desc' } })
      ]);
      return res.status(400).render('owner/journeys/list', {
        req,
        journeys,
        clinics,
        candidates,
        error: 'Kon traject niet aanmaken. Controleer invoer.',
        values: req.body
      });
    } catch (e2) {
      return next(e2);
    }
  }
});

router.post('/:id/update', async (req, res, next) => {
  try {
    const schema = z.object({
      stage: z.enum(['FIRST_INTERVIEW', 'TRIAL_DAY', 'FINAL_OFFER', 'PLACED', 'REJECTED', 'WITHDRAWN']),
      scheduledAt: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);

    const journey = await req.prisma.journey.update({
      where: { id: req.params.id },
      data: {
        stage: v.stage,
        scheduledAt: parseDateTimeLocal(v.scheduledAt) || null,
        notes: v.notes || null
      }
    });

    if (v.stage === 'PLACED') {
      await req.prisma.candidate.update({
        where: { id: journey.candidateId },
        data: { placedClinicId: journey.clinicId, placedAt: new Date() }
      });
    }

    return res.redirect(`/owner/journeys#j-${journey.id}`);
  } catch (e) {
    return next(e);
  }
});

export default router;

