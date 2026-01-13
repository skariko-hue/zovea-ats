import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { z } from 'zod';

import { UPLOAD_CANDIDATE_DIR, safeStoredName } from '../lib/uploads.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_CANDIDATE_DIR),
    filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

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

router.get('/profiel', async (req, res, next) => {
  try {
    const candidate = await req.prisma.candidate.findUnique({ where: { id: req.user.candidateId } });
    return res.render('candidate/profile', { req, candidate, error: null });
  } catch (e) {
    return next(e);
  }
});

router.post('/profiel', async (req, res, next) => {
  try {
    const schema = z.object({
      phone: z.string().optional().or(z.literal('')),
      location: z.string().min(2),
      jobWishes: z.string().min(2),
      salaryRate: z.string().min(1),
      availability: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);

    await req.prisma.candidate.update({
      where: { id: req.user.candidateId },
      data: {
        phone: v.phone || null,
        location: v.location,
        jobWishes: v.jobWishes,
        salaryRate: v.salaryRate,
        availability: v.availability || null
      }
    });
    return res.redirect('/candidate?ok=1');
  } catch (e) {
    try {
      const candidate = await req.prisma.candidate.findUnique({ where: { id: req.user.candidateId } });
      return res.status(400).render('candidate/profile', { req, candidate, error: 'Controleer je invoer.' });
    } catch (e2) {
      return next(e2);
    }
  }
});

router.post('/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.redirect('/candidate?err=1');
    const schema = z.object({ kind: z.string().optional().or(z.literal('')) });
    const { kind } = schema.parse(req.body);

    const relPath = path.join('uploads', 'candidate', req.file.filename);
    await req.prisma.candidateDocument.create({
      data: {
        candidateId: req.user.candidateId,
        kind: kind || 'CV',
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: relPath,
        uploadedByUserId: req.user.id
      }
    });
    return res.redirect('/candidate?ok=1');
  } catch (e) {
    return next(e);
  }
});

export default router;

