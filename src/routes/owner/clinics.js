import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

import { UPLOAD_CLINIC_DIR, safeStoredName } from '../../lib/uploads.js';
import { hashPassword } from '../../lib/auth.js';
import { sendMail } from '../../lib/mailer.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_CLINIC_DIR),
    filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.get('/', async (req, res, next) => {
  try {
    const clinics = await req.prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } });
    return res.render('owner/clinics/list', { req, clinics });
  } catch (e) {
    return next(e);
  }
});

router.get('/new', (req, res) => {
  return res.render('owner/clinics/new', { req, error: null, values: {} });
});

router.post('/new', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      address: z.string().min(5),
      kvkNumber: z.string().min(4),
      contactName: z.string().min(2),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);
    const clinic = await req.prisma.clinic.create({
      data: {
        name: v.name,
        address: v.address,
        kvkNumber: v.kvkNumber,
        contactName: v.contactName,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone || null,
        notes: v.notes || null
      }
    });
    return res.redirect(`/owner/clinics/${clinic.id}`);
  } catch (e) {
    const msg = e?.code === 'P2002' ? 'KvK nummer bestaat al.' : null;
    if (msg) return res.status(400).render('owner/clinics/new', { req, error: msg, values: req.body });
    return next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const clinic = await req.prisma.clinic.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        documents: { orderBy: { createdAt: 'desc' } },
        journeys: { orderBy: { createdAt: 'desc' }, include: { candidate: true } }
      }
    });
    if (!clinic) return res.status(404).render('pages/404', { req });

    const candidates = await req.prisma.candidate.findMany({ orderBy: { createdAt: 'desc' } });
    return res.render('owner/clinics/show', { req, clinic, candidates, message: req.query.ok || null, error: req.query.err || null });
  } catch (e) {
    return next(e);
  }
});

router.get('/:id/edit', async (req, res, next) => {
  try {
    const clinic = await req.prisma.clinic.findUnique({ where: { id: req.params.id } });
    if (!clinic) return res.status(404).render('pages/404', { req });
    return res.render('owner/clinics/edit', { req, clinic, error: null });
  } catch (e) {
    return next(e);
  }
});

router.post('/:id/edit', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      address: z.string().min(5),
      kvkNumber: z.string().min(4),
      contactName: z.string().min(2),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional().or(z.literal('')),
      notes: z.string().optional().or(z.literal(''))
    });
    const v = schema.parse(req.body);
    await req.prisma.clinic.update({
      where: { id: req.params.id },
      data: {
        name: v.name,
        address: v.address,
        kvkNumber: v.kvkNumber,
        contactName: v.contactName,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone || null,
        notes: v.notes || null
      }
    });
    return res.redirect(`/owner/clinics/${req.params.id}?ok=${encodeURIComponent('Kliniek bijgewerkt.')}`);
  } catch (e) {
    const clinic = await req.prisma.clinic.findUnique({ where: { id: req.params.id } });
    const msg = e?.code === 'P2002' ? 'KvK nummer bestaat al.' : 'Validatie mislukt.';
    return res.status(400).render('owner/clinics/edit', { req, clinic, error: msg });
  }
});

router.post('/:id/create-login', async (req, res, next) => {
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
        role: 'CLIENT',
        clinicId: req.params.id
      }
    });
    return res.redirect(
      `/owner/clinics/${req.params.id}?ok=${encodeURIComponent(`Client login gemaakt: ${email} / ${plain}`)}`
    );
  } catch (e) {
    const msg = e?.code === 'P2002' ? 'E-mail bestaat al.' : 'Kon login niet maken.';
    return res.redirect(`/owner/clinics/${req.params.id}?err=${encodeURIComponent(msg)}`);
  }
});

router.post('/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.redirect(`/owner/clinics/${req.params.id}?err=${encodeURIComponent('Geen bestand gekozen.')}`);

    const relPath = path.join('uploads', 'clinic', req.file.filename);
    await req.prisma.clinicDocument.create({
      data: {
        clinicId: req.params.id,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: relPath,
        uploadedByUserId: req.user.id
      }
    });
    return res.redirect(`/owner/clinics/${req.params.id}?ok=${encodeURIComponent('Document toegevoegd.')}`);
  } catch (e) {
    return next(e);
  }
});

router.post('/:id/documents/:docId/email', async (req, res, next) => {
  try {
    const clinic = await req.prisma.clinic.findUnique({ where: { id: req.params.id } });
    const doc = await req.prisma.clinicDocument.findUnique({ where: { id: req.params.docId } });
    if (!clinic || !doc) return res.redirect(`/owner/clinics/${req.params.id}?err=${encodeURIComponent('Document niet gevonden.')}`);

    const abs = path.isAbsolute(doc.storagePath) ? doc.storagePath : path.join(process.cwd(), doc.storagePath);
    if (!fs.existsSync(abs)) return res.redirect(`/owner/clinics/${req.params.id}?err=${encodeURIComponent('Bestand ontbreekt op disk.')}`);

    await sendMail({
      to: clinic.contactEmail,
      subject: `Zovea Talent — Document voor ${clinic.name}`,
      text: `Beste ${clinic.contactName},\n\nIn de bijlage vind je het document "${doc.originalName}".\n\nMet vriendelijke groet,\nZovea Talent`,
      attachments: [{ filename: doc.originalName, path: abs, contentType: doc.mimeType }]
    });

    return res.redirect(`/owner/clinics/${req.params.id}?ok=${encodeURIComponent('Document is (proef) gemaild naar de kliniek.')}`);
  } catch (e) {
    return next(e);
  }
});

export default router;

