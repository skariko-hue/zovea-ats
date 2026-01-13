import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { z } from 'zod';

import { UPLOAD_CANDIDATE_DIR, safeStoredName } from '../../lib/uploads.js';
import { hashPassword } from '../../lib/auth.js';

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
    const candidates = await req.prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { placedClinic: true }
    });
    return res.render('owner/candidates/list', { req, candidates });
  } catch (e) {
    return next(e);
  }
});

router.get('/new', (req, res) => {
  return res.render('owner/candidates/new', { req, error: null, values: {} });
});

router.post('/new', async (req, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional().or(z.literal('')),
      location: z.string().min(2),
      jobWishes: z.string().min(2),
      salaryRate: z.string().min(1),
      availability: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);
    const candidate = await req.prisma.candidate.create({
      data: {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || null,
        location: v.location,
        jobWishes: v.jobWishes,
        salaryRate: v.salaryRate,
        availability: v.availability || null,
        notes: v.notes || null
      }
    });
    return res.redirect(`/owner/candidates/${candidate.id}`);
  } catch (e) {
    const msg = e?.code === 'P2002' ? 'E-mail bestaat al.' : null;
    if (msg) return res.status(400).render('owner/candidates/new', { req, error: msg, values: req.body });
    return next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const candidate = await req.prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        documents: { orderBy: { createdAt: 'desc' } },
        journeys: { orderBy: { createdAt: 'desc' }, include: { clinic: true } },
        placedClinic: true
      }
    });
    if (!candidate) return res.status(404).render('pages/404', { req });

    const clinics = await req.prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } });
    return res.render('owner/candidates/show', {
      req,
      candidate,
      clinics,
      message: req.query.ok || null,
      error: req.query.err || null
    });
  } catch (e) {
    return next(e);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const candidate = await req.prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) return res.status(404).render('pages/404', { req });
    return res.render('owner/candidates/edit', { req, candidate, error: null });
  } catch (e) {
    return next(e);
  }
});

router.post('/:id/edit', async (req, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional().or(z.literal('')),
      location: z.string().min(2),
      jobWishes: z.string().min(2),
      salaryRate: z.string().min(1),
      availability: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal('')),
      status: z.enum(['ACTIVE', 'INACTIVE'])
    });
    const v = schema.parse(req.body);
    await req.prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || null,
        location: v.location,
        jobWishes: v.jobWishes,
        salaryRate: v.salaryRate,
        availability: v.availability || null,
        notes: v.notes || null,
        status: v.status
      }
    });
    return res.redirect(`/owner/candidates/${req.params.id}?ok=${encodeURIComponent('Kandidaat bijgewerkt.')}`);
  } catch (e) {
    const msg = e?.code === 'P2002' ? 'E-mail bestaat al.' : 'Validatie mislukt.';
    return res.redirect(`/owner/candidates/${req.params.id}?err=${encodeURIComponent(msg)}`);
  }
});

router.post('/:id/create-login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8).optional().or(z.literal(''))
    });
    const { email, password } = schema.parse(req.body);
    const plain = password || `Zovea!${Math.floor(10000 + Math.random() * 90000)}`;
    const passwordHash = await hashPassword(plain);

    await req.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'CANDIDATE',
        candidateId: req.params.id
      }
    });
    return res.redirect(
      `/owner/candidates/${req.params.id}?ok=${encodeURIComponent(`Kandidaat login gemaakt: ${email} / ${plain}`)}`
    );
  } catch (e) {
    const msg = e?.code === 'P2002' ? 'E-mail bestaat al.' : 'Kon login niet maken.';
    return res.redirect(`/owner/candidates/${req.params.id}?err=${encodeURIComponent(msg)}`);
  }
});

router.post('/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.redirect(`/owner/candidates/${req.params.id}?err=${encodeURIComponent('Geen bestand gekozen.')}`);
    const schema = z.object({ kind: z.string().min(1).optional().or(z.literal('')) });
    const { kind } = schema.parse(req.body);

    const relPath = path.join('uploads', 'candidate', req.file.filename);
    await req.prisma.candidateDocument.create({
      data: {
        candidateId: req.params.id,
        kind: kind || 'CV',
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: relPath,
        uploadedByUserId: req.user.id
      }
    });
    return res.redirect(`/owner/candidates/${req.params.id}?ok=${encodeURIComponent('Document toegevoegd.')}`);
  } catch (e) {
    return next(e);
  }
});

export default router;

