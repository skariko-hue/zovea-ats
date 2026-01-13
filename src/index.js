import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import { PrismaClient } from '@prisma/client';

import { attachUserToRequest, requireAuth, requireRole } from './lib/auth.js';
import { renderError } from './lib/render.js';
import authRoutes from './routes/auth.js';
import ownerRoutes from './routes/owner.js';
import clientRoutes from './routes/client.js';
import candidateRoutes from './routes/candidate.js';

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SQLiteStore = SQLiteStoreFactory(session);
app.use(
  session({
    store: new SQLiteStore({
      dir: path.join(process.cwd(), '.sessions'),
      db: 'sessions.sqlite',
      concurrentDB: true
    }),
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});
app.use(attachUserToRequest);

app.get('/', requireAuth, (req, res) => {
  if (req.user?.role === 'OWNER') return res.redirect('/owner');
  if (req.user?.role === 'CLIENT') return res.redirect('/client');
  if (req.user?.role === 'CANDIDATE') return res.redirect('/candidate');
  return res.redirect('/login');
});

app.use(authRoutes);
app.use('/owner', requireAuth, requireRole('OWNER'), ownerRoutes);
app.use('/client', requireAuth, requireRole('CLIENT'), clientRoutes);
app.use('/candidate', requireAuth, requireRole('CANDIDATE'), candidateRoutes);

app.use((req, res) => res.status(404).render('pages/404', { req }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err);
  const status = err?.statusCode || 500;
  return renderError(res.status(status), req, err);
});

app.listen(PORT, () => {
  console.log(`Zovea ATS running on http://localhost:${PORT}`);
});

