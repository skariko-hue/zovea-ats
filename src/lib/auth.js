import bcrypt from 'bcryptjs';

export function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.redirect('/login');
  return next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).render('pages/403', { req });
    return next();
  };
}

export async function attachUserToRequest(req, _res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      req.user = null;
      return next();
    }
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true, candidate: true }
    });
    if (!user || !user.isActive) {
      req.session.userId = null;
      req.user = null;
      return next();
    }
    req.user = user;
    return next();
  } catch (e) {
    return next(e);
  }
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

