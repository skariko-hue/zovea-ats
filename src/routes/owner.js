import express from 'express';

import clinicsRoutes from './owner/clinics.js';
import candidatesRoutes from './owner/candidates.js';
import journeysRoutes from './owner/journeys.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [clinics, candidates, journeys] = await Promise.all([
      req.prisma.clinic.count(),
      req.prisma.candidate.count(),
      req.prisma.journey.count()
    ]);
    return res.render('owner/index', { req, stats: { clinics, candidates, journeys } });
  } catch (e) {
    return next(e);
  }
});

router.use('/clinics', clinicsRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/journeys', journeysRoutes);

export default router;

