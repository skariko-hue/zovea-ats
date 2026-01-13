import express from 'express';

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

export default router;

