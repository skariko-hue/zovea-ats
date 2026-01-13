import express from 'express';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const candidateId = req.user.candidateId;
    const candidate = await req.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        journeys: { orderBy: { createdAt: 'desc' }, include: { clinic: true } }
      }
    });
    return res.render('candidate/index', { req, candidate });
  } catch (e) {
    return next(e);
  }
});

export default router;

