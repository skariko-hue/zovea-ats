import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const router = express.Router();

function notFound() {
  const err = new Error('Bestand niet gevonden.');
  err.statusCode = 404;
  err.publicMessage = 'Bestand niet gevonden.';
  return err;
}

function forbidden() {
  const err = new Error('Geen toegang.');
  err.statusCode = 403;
  err.publicMessage = 'Geen toegang tot dit bestand.';
  return err;
}

router.get('/clinic/:docId', async (req, res, next) => {
  try {
    const doc = await req.prisma.clinicDocument.findUnique({
      where: { id: req.params.docId },
      include: { clinic: true }
    });
    if (!doc) return next(notFound());

    const user = req.user;
    const can =
      user.role === 'OWNER' || (user.role === 'CLIENT' && user.clinicId && user.clinicId === doc.clinicId);
    if (!can) return next(forbidden());

    const abs = path.isAbsolute(doc.storagePath) ? doc.storagePath : path.join(process.cwd(), doc.storagePath);
    if (!fs.existsSync(abs)) return next(notFound());

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    return res.sendFile(abs);
  } catch (e) {
    return next(e);
  }
});

router.get('/candidate/:docId', async (req, res, next) => {
  try {
    const doc = await req.prisma.candidateDocument.findUnique({
      where: { id: req.params.docId },
      include: { candidate: true }
    });
    if (!doc) return next(notFound());

    const user = req.user;

    // Candidate can always see own docs
    if (user.role === 'CANDIDATE' && user.candidateId === doc.candidateId) {
      // ok
    } else if (user.role === 'OWNER') {
      // ok
    } else if (user.role === 'CLIENT') {
      // Client can only see candidate docs if there's at least one journey connecting them
      const link = await req.prisma.journey.findFirst({
        where: { clinicId: user.clinicId, candidateId: doc.candidateId },
        select: { id: true }
      });
      if (!link) return next(forbidden());
    } else {
      return next(forbidden());
    }

    const abs = path.isAbsolute(doc.storagePath) ? doc.storagePath : path.join(process.cwd(), doc.storagePath);
    if (!fs.existsSync(abs)) return next(notFound());

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    return res.sendFile(abs);
  } catch (e) {
    return next(e);
  }
});

export default router;

