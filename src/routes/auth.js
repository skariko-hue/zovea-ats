import express from 'express';
import { z } from 'zod';
import { verifyPassword } from '../lib/auth.js';

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/');
  return res.render('pages/login', { req, error: null });
});

router.post('/login', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    const { email, password } = schema.parse(req.body);

    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).render('pages/login', { req, error: 'Onjuiste inloggegevens.' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).render('pages/login', { req, error: 'Onjuiste inloggegevens.' });

    req.session.userId = user.id;
    return res.redirect('/');
  } catch (e) {
    return next(e);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

export default router;

