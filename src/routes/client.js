import express from 'express';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const clinic = await req.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        journeys: {
          orderBy: { createdAt: 'desc' },
          include: {
            candidate: {
              include: {
                documents: { where: { kind: 'CV' }, orderBy: { createdAt: 'desc' } }
              }
            }
          }
        }
      }
    });
    return res.render('client/index', { req, clinic });
  } catch (e) {
    return next(e);
  }
});

export default router;

