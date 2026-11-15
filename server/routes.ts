import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import {
  db,
  AVATARS_DIR,
  CNIC_DIR,
  recalculateWorkerRating,
} from './db.ts';
import {
  type AuthenticatedRequest,
  clearAuthCookie,
  requireAuth,
  requireRole,
  setAuthCookie,
  signAuthToken,
  type UserRole,
} from './auth.ts';
import { emitToAdmins, emitToUser } from './realtime.ts';

const ALLOWED_CITIES = ['Hyderabad', 'Jamshoro'] as const;
const ALLOWED_LANGS = ['en', 'ur', 'sd'] as const;
const ALLOWED_CATEGORIES = [
  'Electrician',
  'Plumber',
  'AC & HVAC',
  'Solar & UPS',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'Home Cleaning',
] as const;

function sanitizeUser(user: any) {
  if (!user) return null;
  const { password_hash: _pw, ...rest } = user;
  return {
    ...rest,
    phone_verified: Boolean(rest.phone_verified),
    is_active: Boolean(rest.is_active),
  };
}

function createNotification(userId: string, title: string, body: string, type = 'info', link = '') {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, type, link)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, title, body, type, link);
  emitToUser(userId, {
    type: 'notification:new',
    notification: { id, user_id: userId, title, body, type, link, is_read: false, created_at: new Date().toISOString() },
  });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const cnicStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CNIC_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  }
};

const uploadAvatar = multer({ storage: avatarStorage, fileFilter: imageFileFilter, limits: { fileSize: 4 * 1024 * 1024 } });
const uploadCnic = multer({ storage: cnicStorage, fileFilter: imageFileFilter, limits: { fileSize: 6 * 1024 * 1024 } });

export function createApiRouter() {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================
  router.post('/auth/register', async (req, res) => {
    try {
      const {
        email,
        phone,
        password,
        full_name,
        role,
        city,
        area = '',
        category = 'Electrician',
        preferred_lang = 'en',
      } = req.body || {};

      if (!email || !password || !full_name || !phone) {
        res.status(400).json({ error: 'Full name, email, phone number, and password are required.' });
        return;
      }
      if (String(password).length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedPhone = String(phone).trim();
      const selectedRole: UserRole = role === 'worker' ? 'worker' : 'customer';
      const selectedCity = ALLOWED_CITIES.includes(city) ? city : 'Hyderabad';
      const selectedLang = ALLOWED_LANGS.includes(preferred_lang) ? preferred_lang : 'en';
      const selectedCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'Electrician';

      const existing = db
        .prepare('SELECT id FROM users WHERE email = ? OR phone = ?')
        .get(normalizedEmail, normalizedPhone);
      if (existing) {
        res.status(409).json({ error: 'An account with this email or phone number already exists.' });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(String(password), 10);

      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO users (id, email, phone, password_hash, full_name, role, city, area, phone_verified, is_active, preferred_lang)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`
        ).run(userId, normalizedEmail, normalizedPhone, passwordHash, String(full_name).trim(), selectedRole, selectedCity, String(area).trim(), selectedLang);

        if (selectedRole === 'worker') {
          const workerId = crypto.randomUUID();
          db.prepare(
            `INSERT INTO worker_profiles (id, user_id, bio, category, experience_years, city, areas_covered, verification_status, is_available)
             VALUES (?, ?, ?, ?, 1, ?, ?, 'unverified', 1)`
          ).run(workerId, userId, '', selectedCategory, selectedCity, String(area).trim() || selectedCity);
        }
      });
      tx();

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const otpId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO otp_codes (id, user_id, phone, code, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+15 minutes'))`
      ).run(otpId, userId, normalizedPhone, otpCode);

      const token = signAuthToken({ userId, role: selectedRole, email: normalizedEmail });
      setAuthCookie(res, token, req);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const workerProfile = selectedRole === 'worker'
        ? db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(userId)
        : null;

      res.status(201).json({
        user: sanitizeUser(user),
        workerProfile,
        token,
        otpPreview: otpCode,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Registration failed' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { identifier, email, password } = req.body || {};
      const loginKey = String(identifier || email || '').trim().toLowerCase();
      if (!loginKey || !password) {
        res.status(400).json({ error: 'Email/phone and password are required.' });
        return;
      }

      const user = db
        .prepare('SELECT * FROM users WHERE lower(email) = ? OR phone = ?')
        .get(loginKey, String(identifier || email || '').trim()) as any;

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }
      if (!user.is_active) {
        res.status(403).json({ error: 'This account has been suspended by an administrator.' });
        return;
      }

      const valid = await bcrypt.compare(String(password), user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      const token = signAuthToken({ userId: user.id, role: user.role, email: user.email });
      setAuthCookie(res, token, req);

      const workerProfile = user.role === 'worker'
        ? db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(user.id)
        : null;

      res.json({
        user: sanitizeUser(user),
        workerProfile,
        token,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Login failed' });
    }
  });

  router.post('/auth/logout', (req, res) => {
    clearAuthCookie(res, req);
    res.json({ ok: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
    if (!user || !user.is_active) {
      clearAuthCookie(res, req);
      res.status(401).json({ error: 'Session no longer valid' });
      return;
    }
    const workerProfile = user.role === 'worker'
      ? db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(user.id)
      : null;
    const unreadNotifications = db
      .prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(user.id) as { cnt: number };

    res.json({
      user: sanitizeUser(user),
      workerProfile,
      unreadNotifications: unreadNotifications.cnt,
    });
  });

  router.post('/auth/send-otp', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const phone = String(req.body?.phone || user.phone || '').trim();
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }
    if (phone !== user.phone) {
      const taken = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, user.id);
      if (taken) {
        res.status(409).json({ error: 'Phone number is already linked to another account' });
        return;
      }
      db.prepare('UPDATE users SET phone = ?, phone_verified = 0 WHERE id = ?').run(phone, user.id);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.prepare(
      `INSERT INTO otp_codes (id, user_id, phone, code, expires_at)
       VALUES (?, ?, ?, ?, datetime('now', '+15 minutes'))`
    ).run(crypto.randomUUID(), user.id, phone, code);

    res.json({
      ok: true,
      phone,
      otpPreview: code,
      message: 'Verification OTP generated for your phone number.',
    });
  });

  router.post('/auth/verify-otp', requireAuth, (req: AuthenticatedRequest, res) => {
    const { code } = req.body || {};
    if (!code) {
      res.status(400).json({ error: '6-digit OTP code is required' });
      return;
    }
    const record = db
      .prepare(
        `SELECT * FROM otp_codes
         WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(req.auth!.userId, String(code).trim()) as any;

    if (!record) {
      res.status(400).json({ error: 'Invalid or expired OTP code.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(record.id);
      db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(req.auth!.userId);
    });
    tx();

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId);
    res.json({ ok: true, user: sanitizeUser(updated) });
  });

  router.post('/auth/forgot-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Account email is required' });
      return;
    }
    const user = db.prepare('SELECT id, email FROM users WHERE lower(email) = ?').get(email) as any;
    if (!user) {
      res.json({ ok: true, message: 'If an account matches this email, a reset token has been generated.' });
      return;
    }

    const token = crypto.randomBytes(16).toString('hex');
    db.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
       VALUES (?, ?, ?, datetime('now', '+30 minutes'))`
    ).run(crypto.randomUUID(), user.id, token);

    res.json({
      ok: true,
      resetTokenPreview: token,
      message: 'Password reset token generated. Use it on the Reset Password form.',
    });
  });

  router.post('/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Valid reset token and password (min 6 characters) are required.' });
      return;
    }

    const record = db
      .prepare(
        `SELECT * FROM password_reset_tokens
         WHERE token = ? AND used = 0 AND expires_at > datetime('now')
         LIMIT 1`
      )
      .get(String(token).trim()) as any;

    if (!record) {
      res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      return;
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    const tx = db.transaction(() => {
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, record.user_id);
    });
    tx();

    res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
  });

  router.patch('/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const { full_name, city, area, preferred_lang } = req.body || {};
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as any;
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nextName = full_name ? String(full_name).trim() : current.full_name;
    const nextCity = ALLOWED_CITIES.includes(city) ? city : current.city;
    const nextArea = area !== undefined ? String(area).trim() : current.area;
    const nextLang = ALLOWED_LANGS.includes(preferred_lang) ? preferred_lang : current.preferred_lang;

    db.prepare(
      `UPDATE users SET full_name = ?, city = ?, area = ?, preferred_lang = ? WHERE id = ?`
    ).run(nextName, nextCity, nextArea, nextLang, current.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(current.id);
    res.json({ user: sanitizeUser(updated) });
  });

  // ==========================================
  // STORAGE & FILE UPLOAD ROUTES (RLS-GATED)
  // ==========================================
  const persistUploadedFile = (kind: 'avatar' | 'cnic', file: Express.Multer.File, ownerUserId: string) => {
    const data = fs.readFileSync(file.path);
    db.prepare(
      `INSERT OR REPLACE INTO uploaded_files (id, kind, filename, mime_type, data, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), kind, file.filename, file.mimetype || 'image/jpeg', data, ownerUserId);
  };

  router.post('/uploads/avatar', requireAuth, uploadAvatar.single('avatar'), (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Please select an image file (JPG, PNG, WebP).' });
      return;
    }
    persistUploadedFile('avatar', req.file, req.auth!.userId);
    const avatarUrl = `/api/files/avatar/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.auth!.userId);
    res.json({ avatarUrl });
  });

  router.get('/files/avatar/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const fullPath = path.join(AVATARS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
      return;
    }
    const row = db
      .prepare("SELECT mime_type, data FROM uploaded_files WHERE filename = ? AND kind = 'avatar'")
      .get(safeName) as { mime_type: string; data: Buffer } | undefined;
    if (!row) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }
    res.contentType(row.mime_type).send(row.data);
  });

  router.post(
    '/uploads/cnic',
    requireAuth,
    requireRole('worker'),
    uploadCnic.fields([
      { name: 'cnicFront', maxCount: 1 },
      { name: 'cnicBack', maxCount: 1 },
    ]),
    (req: AuthenticatedRequest, res) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const cnicNumber = String(req.body?.cnic_number || '').trim();

      if (!cnicNumber || !/^\d{5}-\d{7}-\d$/.test(cnicNumber)) {
        res.status(400).json({ error: 'Enter a valid 13-digit CNIC formatted as 41304-1234567-1.' });
        return;
      }

      const worker = db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(req.auth!.userId) as any;
      if (!worker) {
        res.status(404).json({ error: 'Worker profile not found' });
        return;
      }

      const frontFile = files?.cnicFront?.[0];
      const backFile = files?.cnicBack?.[0];

      if (frontFile) persistUploadedFile('cnic', frontFile, req.auth!.userId);
      if (backFile) persistUploadedFile('cnic', backFile, req.auth!.userId);

      const frontUrl = frontFile ? `/api/files/cnic/${frontFile.filename}` : worker.cnic_front_url;
      const backUrl = backFile ? `/api/files/cnic/${backFile.filename}` : worker.cnic_back_url;

      if (!frontUrl || !backUrl) {
        res.status(400).json({ error: 'Both CNIC front and back images are required for verification.' });
        return;
      }

      db.prepare(
        `UPDATE worker_profiles
         SET cnic_number = ?, cnic_front_url = ?, cnic_back_url = ?, verification_status = 'pending', verification_notes = 'Submitted for admin review.'
         WHERE id = ?`
      ).run(cnicNumber, frontUrl, backUrl, worker.id);

      const user = db.prepare('SELECT full_name, city FROM users WHERE id = ?').get(req.auth!.userId) as any;
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as { id: string }[];
      for (const admin of admins) {
        createNotification(
          admin.id,
          'New CNIC Verification Request',
          `${user?.full_name || 'A worker'} (${user?.city || 'Hyderabad'}) submitted CNIC ${cnicNumber} for review.`,
          'verification',
          '/dashboard/admin'
        );
      }

      const updated = db.prepare('SELECT * FROM worker_profiles WHERE id = ?').get(worker.id);
      res.json({ workerProfile: updated });
    }
  );

  // Strict RBAC on CNIC files: only owning worker or admin
  router.get('/files/cnic/:filename', requireAuth, (req: AuthenticatedRequest, res) => {
    const safeName = path.basename(req.params.filename);

    if (req.auth!.role !== 'admin') {
      const targetUrl = `/api/files/cnic/${safeName}`;
      const owner = db
        .prepare('SELECT user_id FROM worker_profiles WHERE cnic_front_url = ? OR cnic_back_url = ?')
        .get(targetUrl, targetUrl) as { user_id: string } | undefined;

      if (!owner || owner.user_id !== req.auth!.userId) {
        res.status(403).json({ error: 'Forbidden: CNIC documents are restricted to the owner and admins.' });
        return;
      }
    }

    const fullPath = path.join(CNIC_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
      return;
    }

    const row = db
      .prepare("SELECT mime_type, data FROM uploaded_files WHERE filename = ? AND kind = 'cnic'")
      .get(safeName) as { mime_type: string; data: Buffer } | undefined;
    if (!row) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.contentType(row.mime_type).send(row.data);
  });

  // ==========================================
  // PUBLIC WORKER DIRECTORY & PROFILES
  // ==========================================
  router.get('/workers', (req, res) => {
    const {
      city = '',
      category = '',
      q = '',
      verifiedOnly = '',
      availableOnly = '',
      minRating = '0',
      maxPrice = '0',
      sort = 'rating',
    } = req.query as Record<string, string>;

    let sql = `
      SELECT
        wp.*,
        u.full_name,
        u.avatar_url,
        u.area,
        u.phone_verified,
        (SELECT MIN(price_pkr) FROM worker_services ws WHERE ws.worker_id = wp.id AND ws.is_active = 1) as starting_price_pkr,
        (SELECT COUNT(*) FROM worker_services ws WHERE ws.worker_id = wp.id AND ws.is_active = 1) as active_service_count
      FROM worker_profiles wp
      INNER JOIN users u ON u.id = wp.user_id
      WHERE u.is_active = 1
    `;
    const params: any[] = [];

    if (city && ALLOWED_CITIES.includes(city as any)) {
      sql += ` AND wp.city = ?`;
      params.push(city);
    }
    if (category && category !== 'All') {
      sql += ` AND wp.category = ?`;
      params.push(category);
    }
    if (verifiedOnly === 'true') {
      sql += ` AND wp.verification_status = 'verified'`;
    }
    if (availableOnly === 'true') {
      sql += ` AND wp.is_available = 1`;
    }
    const minRatingNum = Number(minRating);
    if (!Number.isNaN(minRatingNum) && minRatingNum > 0) {
      sql += ` AND wp.avg_rating >= ?`;
      params.push(minRatingNum);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      sql += ` AND (
        u.full_name LIKE ? OR
        wp.category LIKE ? OR
        wp.bio LIKE ? OR
        wp.areas_covered LIKE ? OR
        EXISTS (SELECT 1 FROM worker_services ws WHERE ws.worker_id = wp.id AND ws.is_active = 1 AND ws.title LIKE ?)
      )`;
      params.push(like, like, like, like, like);
    }

    const maxPriceNum = Number(maxPrice);
    if (!Number.isNaN(maxPriceNum) && maxPriceNum > 0) {
      sql += ` AND EXISTS (SELECT 1 FROM worker_services ws WHERE ws.worker_id = wp.id AND ws.is_active = 1 AND ws.price_pkr <= ?)`;
      params.push(maxPriceNum);
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY COALESCE(starting_price_pkr, 999999) ASC, wp.avg_rating DESC`;
    } else if (sort === 'experience') {
      sql += ` ORDER BY wp.experience_years DESC, wp.avg_rating DESC`;
    } else {
      sql += ` ORDER BY (wp.verification_status = 'verified') DESC, wp.avg_rating DESC, wp.total_jobs DESC`;
    }

    const workers = db.prepare(sql).all(...params) as any[];
    const servicesStmt = db.prepare('SELECT * FROM worker_services WHERE worker_id = ? AND is_active = 1 ORDER BY price_pkr ASC');

    const enriched = workers.map((w) => ({
      ...w,
      is_available: Boolean(w.is_available),
      phone_verified: Boolean(w.phone_verified),
      services: servicesStmt.all(w.id),
    }));

    res.json({ workers: enriched });
  });

  router.get('/workers/:id', (req, res) => {
    const worker = db
      .prepare(
        `SELECT wp.*, u.full_name, u.avatar_url, u.area, u.phone_verified, u.created_at as member_since
         FROM worker_profiles wp
         INNER JOIN users u ON u.id = wp.user_id
         WHERE wp.id = ? AND u.is_active = 1`
      )
      .get(req.params.id) as any;

    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const services = db
      .prepare('SELECT * FROM worker_services WHERE worker_id = ? AND is_active = 1 ORDER BY price_pkr ASC')
      .all(worker.id);

    const reviews = db
      .prepare(
        `SELECT r.*, u.full_name as customer_name, u.city as customer_city
         FROM reviews r
         INNER JOIN users u ON u.id = r.customer_id
         WHERE r.worker_id = ? AND r.is_hidden = 0
         ORDER BY r.created_at DESC`
      )
      .all(worker.id);

    res.json({
      worker: {
        ...worker,
        is_available: Boolean(worker.is_available),
        phone_verified: Boolean(worker.phone_verified),
      },
      services,
      reviews,
    });
  });

  // ==========================================
  // WORKER DASHBOARD & SERVICE MANAGEMENT
  // ==========================================
  router.get('/worker/dashboard', requireAuth, requireRole('worker'), (req: AuthenticatedRequest, res) => {
    const profile = db
      .prepare('SELECT * FROM worker_profiles WHERE user_id = ?')
      .get(req.auth!.userId) as any;

    if (!profile) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const services = db
      .prepare('SELECT * FROM worker_services WHERE worker_id = ? ORDER BY created_at DESC')
      .all(profile.id);

    const earningsRow = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN status = 'completed' THEN price_pkr ELSE 0 END), 0) as completed_earnings,
          COALESCE(SUM(CASE WHEN status IN ('accepted', 'in_progress') THEN price_pkr ELSE 0 END), 0) as pipeline_earnings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs
         FROM bookings WHERE worker_id = ?`
      )
      .get(profile.id) as any;

    res.json({
      profile: {
        ...profile,
        is_available: Boolean(profile.is_available),
      },
      services: services.map((s: any) => ({ ...s, is_active: Boolean(s.is_active) })),
      stats: earningsRow,
    });
  });

  router.put('/worker/profile', requireAuth, requireRole('worker'), (req: AuthenticatedRequest, res) => {
    const profile = db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(req.auth!.userId) as any;
    if (!profile) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const {
      bio,
      category,
      experience_years,
      city,
      areas_covered,
      is_available,
      availability_schedule,
    } = req.body || {};

    const nextCategory = ALLOWED_CATEGORIES.includes(category) ? category : profile.category;
    const nextCity = ALLOWED_CITIES.includes(city) ? city : profile.city;
    const nextExp = Number.isFinite(Number(experience_years)) ? Math.max(0, Math.min(50, Number(experience_years))) : profile.experience_years;
    const nextAvailable = typeof is_available === 'boolean' ? (is_available ? 1 : 0) : profile.is_available;

    db.prepare(
      `UPDATE worker_profiles
       SET bio = ?, category = ?, experience_years = ?, city = ?, areas_covered = ?, is_available = ?, availability_schedule = ?
       WHERE id = ?`
    ).run(
      bio !== undefined ? String(bio).trim() : profile.bio,
      nextCategory,
      nextExp,
      nextCity,
      areas_covered !== undefined ? String(areas_covered).trim() : profile.areas_covered,
      nextAvailable,
      availability_schedule !== undefined ? String(availability_schedule).trim() : profile.availability_schedule,
      profile.id
    );

    const updated = db.prepare('SELECT * FROM worker_profiles WHERE id = ?').get(profile.id) as any;
    res.json({ profile: { ...updated, is_available: Boolean(updated.is_available) } });
  });

  router.post('/worker/services', requireAuth, requireRole('worker'), (req: AuthenticatedRequest, res) => {
    const profile = db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').get(req.auth!.userId) as any;
    if (!profile) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    const { title, description = '', category, price_pkr, unit = 'per visit' } = req.body || {};
    const priceNum = Number(price_pkr);
    if (!title || !Number.isFinite(priceNum) || priceNum < 100) {
      res.status(400).json({ error: 'Service title and valid PKR price (>= 100) are required.' });
      return;
    }

    const validUnits = ['per visit', 'per hour', 'fixed'];
    const chosenUnit = validUnits.includes(unit) ? unit : 'per visit';
    const chosenCategory = ALLOWED_CATEGORIES.includes(category) ? category : profile.category;
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO worker_services (id, worker_id, title, description, category, price_pkr, unit, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(id, profile.id, String(title).trim(), String(description).trim(), chosenCategory, Math.round(priceNum), chosenUnit);

    const created = db.prepare('SELECT * FROM worker_services WHERE id = ?').get(id) as any;
    res.status(201).json({ service: { ...created, is_active: Boolean(created.is_active) } });
  });

  router.patch('/worker/services/:id', requireAuth, requireRole('worker'), (req: AuthenticatedRequest, res) => {
    const profile = db.prepare('SELECT id FROM worker_profiles WHERE user_id = ?').get(req.auth!.userId) as any;
    const existing = db.prepare('SELECT * FROM worker_services WHERE id = ? AND worker_id = ?').get(req.params.id, profile?.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Service not found or access denied' });
      return;
    }

    const { title, description, price_pkr, unit, is_active } = req.body || {};
    const nextPrice = price_pkr !== undefined ? Math.max(100, Math.round(Number(price_pkr))) : existing.price_pkr;
    const nextActive = typeof is_active === 'boolean' ? (is_active ? 1 : 0) : existing.is_active;

    db.prepare(
      `UPDATE worker_services SET title = ?, description = ?, price_pkr = ?, unit = ?, is_active = ? WHERE id = ?`
    ).run(
      title !== undefined ? String(title).trim() : existing.title,
      description !== undefined ? String(description).trim() : existing.description,
      nextPrice,
      unit || existing.unit,
      nextActive,
      existing.id
    );

    const updated = db.prepare('SELECT * FROM worker_services WHERE id = ?').get(existing.id) as any;
    res.json({ service: { ...updated, is_active: Boolean(updated.is_active) } });
  });

  router.delete('/worker/services/:id', requireAuth, requireRole('worker'), (req: AuthenticatedRequest, res) => {
    const profile = db.prepare('SELECT id FROM worker_profiles WHERE user_id = ?').get(req.auth!.userId) as any;
    const result = db.prepare('DELETE FROM worker_services WHERE id = ? AND worker_id = ?').run(req.params.id, profile?.id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Service not found or access denied' });
      return;
    }
    res.json({ ok: true });
  });

  // ==========================================
  // BOOKINGS & REAL-TIME WORKFLOW
  // ==========================================
  router.post('/bookings', requireAuth, requireRole('customer'), (req: AuthenticatedRequest, res) => {
    const { worker_id, service_id, city, address, scheduled_date, scheduled_time, notes = '' } = req.body || {};
    if (!worker_id || !service_id || !address || !scheduled_date || !scheduled_time) {
      res.status(400).json({ error: 'Worker, service, address, date, and time slot are required.' });
      return;
    }

    const worker = db
      .prepare(
        `SELECT wp.*, u.full_name as worker_name
         FROM worker_profiles wp
         INNER JOIN users u ON u.id = wp.user_id
         WHERE wp.id = ? AND u.is_active = 1`
      )
      .get(worker_id) as any;

    if (!worker) {
      res.status(404).json({ error: 'Selected worker not found' });
      return;
    }
    if (worker.user_id === req.auth!.userId) {
      res.status(400).json({ error: 'Cannot book your own profile' });
      return;
    }

    const service = db
      .prepare('SELECT * FROM worker_services WHERE id = ? AND worker_id = ? AND is_active = 1')
      .get(service_id, worker_id) as any;
    if (!service) {
      res.status(404).json({ error: 'Selected service is unavailable' });
      return;
    }

    const bookingCity = ALLOWED_CITIES.includes(city) ? city : worker.city;
    const bookingId = `bk-${crypto.randomUUID().slice(0, 8)}`;

    db.prepare(
      `INSERT INTO bookings (id, customer_id, worker_id, service_id, service_title, price_pkr, city, address, scheduled_date, scheduled_time, notes, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`
    ).run(
      bookingId,
      req.auth!.userId,
      worker.id,
      service.id,
      service.title,
      service.price_pkr,
      bookingCity,
      String(address).trim(),
      String(scheduled_date).trim(),
      String(scheduled_time).trim(),
      String(notes).trim()
    );

    const customer = db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.auth!.userId) as any;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    createNotification(
      worker.user_id,
      'New Service Booking Request',
      `${customer?.full_name || 'A customer'} requested "${service.title}" in ${bookingCity} on ${scheduled_date}.`,
      'booking',
      '/dashboard/worker'
    );
    emitToUser(worker.user_id, { type: 'booking:updated', booking });

    res.status(201).json({ booking });
  });

  router.get('/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
    const role = req.auth!.role;
    const userId = req.auth!.userId;

    let rows: any[] = [];
    const baseQuery = `
      SELECT
        b.*,
        cu.full_name as customer_name,
        cu.phone as customer_phone,
        wu.full_name as worker_name,
        wu.phone as worker_phone,
        wu.avatar_url as worker_avatar,
        wp.user_id as worker_user_id,
        wp.category as worker_category,
        (SELECT r.id FROM reviews r WHERE r.booking_id = b.id LIMIT 1) as review_id,
        (SELECT r.rating FROM reviews r WHERE r.booking_id = b.id LIMIT 1) as review_rating
      FROM bookings b
      INNER JOIN users cu ON cu.id = b.customer_id
      INNER JOIN worker_profiles wp ON wp.id = b.worker_id
      INNER JOIN users wu ON wu.id = wp.user_id
    `;

    if (role === 'admin') {
      rows = db.prepare(`${baseQuery} ORDER BY b.created_at DESC`).all();
    } else if (role === 'worker') {
      rows = db.prepare(`${baseQuery} WHERE wp.user_id = ? ORDER BY b.created_at DESC`).all(userId);
    } else {
      rows = db.prepare(`${baseQuery} WHERE b.customer_id = ? ORDER BY b.created_at DESC`).all(userId);
    }

    res.json({ bookings: rows });
  });

  router.patch('/bookings/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const booking = db
      .prepare(
        `SELECT b.*, wp.user_id as worker_user_id
         FROM bookings b
         INNER JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE b.id = ?`
      )
      .get(req.params.id) as any;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const { status, payment_status } = req.body || {};
    const role = req.auth!.role;
    const userId = req.auth!.userId;

    const isCustomer = booking.customer_id === userId;
    const isWorker = booking.worker_user_id === userId;
    const isAdmin = role === 'admin';

    if (!isCustomer && !isWorker && !isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let nextStatus = booking.status;
    let nextPayment = booking.payment_status;

    if (status && status !== booking.status) {
      const validWorkerTransitions: Record<string, string[]> = {
        pending: ['accepted', 'rejected'],
        accepted: ['in_progress', 'completed', 'cancelled'],
        in_progress: ['completed'],
      };
      const validCustomerTransitions: Record<string, string[]> = {
        pending: ['cancelled'],
        accepted: ['cancelled'],
      };

      if (isAdmin) {
        nextStatus = status;
      } else if (isWorker && validWorkerTransitions[booking.status]?.includes(status)) {
        nextStatus = status;
      } else if (isCustomer && validCustomerTransitions[booking.status]?.includes(status)) {
        nextStatus = status;
      } else {
        res.status(400).json({ error: `Status transition from "${booking.status}" to "${status}" is not allowed.` });
        return;
      }
    }

    if (payment_status && (payment_status === 'paid' || payment_status === 'unpaid')) {
      if (isAdmin || isWorker || isCustomer) {
        nextPayment = payment_status;
      }
    }

    if (nextStatus === 'completed' && !payment_status) {
      nextPayment = 'paid';
    }

    db.prepare(
      `UPDATE bookings SET status = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(nextStatus, nextPayment, booking.id);

    if (nextStatus === 'completed' || booking.status === 'completed') {
      recalculateWorkerRating(booking.worker_id);
    }

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);

    const notifyTarget = isWorker ? booking.customer_id : booking.worker_user_id;
    createNotification(
      notifyTarget,
      `Booking ${nextStatus.replace('_', ' ')}`,
      `Booking #${booking.id} (${booking.service_title}) is now ${nextStatus.replace('_', ' ')}.`,
      'booking',
      isWorker ? '/dashboard/customer' : '/dashboard/worker'
    );

    emitToUser(booking.customer_id, { type: 'booking:updated', booking: updated });
    emitToUser(booking.worker_user_id, { type: 'booking:updated', booking: updated });

    res.json({ booking: updated });
  });

  // ==========================================
  // REAL-TIME CHAT MESSAGES PER BOOKING
  // ==========================================
  router.get('/bookings/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const booking = db
      .prepare(
        `SELECT b.*, wp.user_id as worker_user_id
         FROM bookings b
         INNER JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE b.id = ?`
      )
      .get(req.params.id) as any;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const uid = req.auth!.userId;
    if (booking.customer_id !== uid && booking.worker_user_id !== uid && req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    db.prepare('UPDATE messages SET is_read = 1 WHERE booking_id = ? AND receiver_id = ?').run(booking.id, uid);

    const messages = db
      .prepare(
        `SELECT m.*, u.full_name as sender_name, u.role as sender_role
         FROM messages m
         INNER JOIN users u ON u.id = m.sender_id
         WHERE m.booking_id = ?
         ORDER BY m.created_at ASC`
      )
      .all(booking.id);

    res.json({ messages });
  });

  router.post('/bookings/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const booking = db
      .prepare(
        `SELECT b.*, wp.user_id as worker_user_id
         FROM bookings b
         INNER JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE b.id = ?`
      )
      .get(req.params.id) as any;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const uid = req.auth!.userId;
    if (booking.customer_id !== uid && booking.worker_user_id !== uid) {
      res.status(403).json({ error: 'Only booking participants can send messages' });
      return;
    }

    const body = String(req.body?.body || '').trim();
    if (!body) {
      res.status(400).json({ error: 'Message text cannot be empty' });
      return;
    }

    const receiverId = uid === booking.customer_id ? booking.worker_user_id : booking.customer_id;
    const msgId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO messages (id, booking_id, sender_id, receiver_id, body)
       VALUES (?, ?, ?, ?, ?)`
    ).run(msgId, booking.id, uid, receiverId, body);

    const message = db
      .prepare(
        `SELECT m.*, u.full_name as sender_name, u.role as sender_role
         FROM messages m
         INNER JOIN users u ON u.id = m.sender_id
         WHERE m.id = ?`
      )
      .get(msgId);

    emitToUser(receiverId, { type: 'chat:message', bookingId: booking.id, message });
    emitToUser(uid, { type: 'chat:message', bookingId: booking.id, message });
    createNotification(receiverId, 'New Message', body.slice(0, 80), 'chat', '');

    res.status(201).json({ message });
  });

  // ==========================================
  // REVIEWS & COMPLAINTS
  // ==========================================
  router.post('/reviews', requireAuth, requireRole('customer'), (req: AuthenticatedRequest, res) => {
    const { booking_id, rating, comment = '' } = req.body || {};
    const ratingNum = Number(rating);
    if (!booking_id || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: 'Booking ID and integer rating (1-5) are required.' });
      return;
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(booking_id, req.auth!.userId) as any;
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (booking.status !== 'completed') {
      res.status(400).json({ error: 'Reviews can only be submitted after the job is completed.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
    if (existing) {
      res.status(409).json({ error: 'A review has already been submitted for this booking.' });
      return;
    }

    const reviewId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO reviews (id, booking_id, customer_id, worker_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(reviewId, booking_id, req.auth!.userId, booking.worker_id, ratingNum, String(comment).trim());

    recalculateWorkerRating(booking.worker_id);

    const worker = db.prepare('SELECT user_id FROM worker_profiles WHERE id = ?').get(booking.worker_id) as any;
    if (worker) {
      createNotification(
        worker.user_id,
        'New Customer Review',
        `You received a ${ratingNum}-star review on "${booking.service_title}".`,
        'review',
        '/dashboard/worker'
      );
    }

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    res.status(201).json({ review });
  });

  router.post('/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
    const { booking_id = null, subject, description } = req.body || {};
    if (!subject || !description) {
      res.status(400).json({ error: 'Subject and detailed description are required.' });
      return;
    }

    let againstUserId: string | null = null;
    if (booking_id) {
      const bk = db
        .prepare(
          `SELECT b.customer_id, wp.user_id as worker_user_id
           FROM bookings b INNER JOIN worker_profiles wp ON wp.id = b.worker_id
           WHERE b.id = ?`
        )
        .get(booking_id) as any;
      if (bk) {
        againstUserId = bk.customer_id === req.auth!.userId ? bk.worker_user_id : bk.customer_id;
      }
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO complaints (id, booking_id, filed_by, against_user_id, subject, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`
    ).run(id, booking_id || null, req.auth!.userId, againstUserId, String(subject).trim(), String(description).trim());

    emitToAdmins({ type: 'complaint:new', complaintId: id });
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    res.status(201).json({ complaint });
  });

  router.get('/complaints', requireAuth, (req: AuthenticatedRequest, res) => {
    const base = `
      SELECT c.*, u.full_name as filed_by_name, u.email as filed_by_email, au.full_name as against_name
      FROM complaints c
      INNER JOIN users u ON u.id = c.filed_by
      LEFT JOIN users au ON au.id = c.against_user_id
    `;
    const complaints = req.auth!.role === 'admin'
      ? db.prepare(`${base} ORDER BY c.created_at DESC`).all()
      : db.prepare(`${base} WHERE c.filed_by = ? ORDER BY c.created_at DESC`).all(req.auth!.userId);
    res.json({ complaints });
  });

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifications = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
      .all(req.auth!.userId)
      .map((n: any) => ({ ...n, is_read: Boolean(n.is_read) }));
    res.json({ notifications });
  });

  router.patch('/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
    res.json({ ok: true });
  });

  // ==========================================
  // ADMIN ANALYTICS & MANAGEMENT (ADMIN ONLY)
  // ==========================================
  router.get('/admin/overview', requireAuth, requireRole('admin'), (_req, res) => {
    const totals = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
          (SELECT COUNT(*) FROM users WHERE role = 'worker') as total_workers,
          (SELECT COUNT(*) FROM worker_profiles WHERE verification_status = 'pending') as pending_verifications,
          (SELECT COUNT(*) FROM worker_profiles WHERE verification_status = 'verified') as verified_workers,
          (SELECT COUNT(*) FROM bookings) as total_bookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
          (SELECT COALESCE(SUM(price_pkr), 0) FROM bookings WHERE status = 'completed') as completed_gmv_pkr,
          (SELECT COUNT(*) FROM complaints WHERE status IN ('open', 'investigating')) as open_complaints`
      )
      .get();

    const byCity = db
      .prepare(
        `SELECT city, COUNT(*) as bookings_count, COALESCE(SUM(price_pkr), 0) as volume_pkr
         FROM bookings GROUP BY city`
      )
      .all();

    const byCategory = db
      .prepare(
        `SELECT wp.category, COUNT(b.id) as bookings_count, COUNT(DISTINCT wp.id) as workers_count
         FROM worker_profiles wp
         LEFT JOIN bookings b ON b.worker_id = wp.id
         GROUP BY wp.category
         ORDER BY workers_count DESC`
      )
      .all();

    res.json({ totals, byCity, byCategory });
  });

  router.get('/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
    const users = db
      .prepare('SELECT id, email, phone, full_name, role, city, area, phone_verified, is_active, created_at FROM users ORDER BY created_at DESC')
      .all()
      .map((u: any) => ({ ...u, phone_verified: Boolean(u.phone_verified), is_active: Boolean(u.is_active) }));
    res.json({ users });
  });

  router.patch('/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    if (req.params.id === req.auth!.userId) {
      res.status(400).json({ error: 'Cannot modify your own admin status.' });
      return;
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { is_active, role } = req.body || {};
    const nextActive = typeof is_active === 'boolean' ? (is_active ? 1 : 0) : user.is_active;
    const nextRole = ['customer', 'worker', 'admin'].includes(role) ? role : user.role;

    db.prepare('UPDATE users SET is_active = ?, role = ? WHERE id = ?').run(nextActive, nextRole, user.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    res.json({ user: sanitizeUser(updated) });
  });

  router.get('/admin/workers', requireAuth, requireRole('admin'), (_req, res) => {
    const workers = db
      .prepare(
        `SELECT wp.*, u.full_name, u.email, u.phone, u.avatar_url, u.is_active
         FROM worker_profiles wp
         INNER JOIN users u ON u.id = wp.user_id
         ORDER BY (wp.verification_status = 'pending') DESC, wp.created_at DESC`
      )
      .all()
      .map((w: any) => ({ ...w, is_available: Boolean(w.is_available), is_active: Boolean(w.is_active) }));
    res.json({ workers });
  });

  router.patch('/admin/workers/:id/verify', requireAuth, requireRole('admin'), (req, res) => {
    const { verification_status, verification_notes = '' } = req.body || {};
    if (!['verified', 'rejected', 'pending', 'unverified'].includes(verification_status)) {
      res.status(400).json({ error: 'Invalid verification status' });
      return;
    }

    const worker = db.prepare('SELECT * FROM worker_profiles WHERE id = ?').get(req.params.id) as any;
    if (!worker) {
      res.status(404).json({ error: 'Worker profile not found' });
      return;
    }

    db.prepare(
      `UPDATE worker_profiles SET verification_status = ?, verification_notes = ? WHERE id = ?`
    ).run(verification_status, String(verification_notes).trim(), worker.id);

    const updated = db.prepare('SELECT * FROM worker_profiles WHERE id = ?').get(worker.id);
    createNotification(
      worker.user_id,
      `CNIC Verification ${verification_status === 'verified' ? 'Approved' : 'Updated'}`,
      verification_notes || `Your verification status is now ${verification_status}.`,
      'verification',
      '/dashboard/worker'
    );
    emitToUser(worker.user_id, { type: 'worker:verified', workerProfile: updated });

    res.json({ worker: updated });
  });

  router.get('/admin/services', requireAuth, requireRole('admin'), (_req, res) => {
    const services = db
      .prepare(
        `SELECT ws.*, wp.city, u.full_name as worker_name
         FROM worker_services ws
         INNER JOIN worker_profiles wp ON wp.id = ws.worker_id
         INNER JOIN users u ON u.id = wp.user_id
         ORDER BY ws.created_at DESC`
      )
      .all()
      .map((s: any) => ({ ...s, is_active: Boolean(s.is_active) }));
    res.json({ services });
  });

  router.patch('/admin/services/:id', requireAuth, requireRole('admin'), (req, res) => {
    const service = db.prepare('SELECT * FROM worker_services WHERE id = ?').get(req.params.id) as any;
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const nextActive = typeof req.body?.is_active === 'boolean' ? (req.body.is_active ? 1 : 0) : service.is_active;
    db.prepare('UPDATE worker_services SET is_active = ? WHERE id = ?').run(nextActive, service.id);
    res.json({ ok: true, is_active: Boolean(nextActive) });
  });

  router.get('/admin/reviews', requireAuth, requireRole('admin'), (_req, res) => {
    const reviews = db
      .prepare(
        `SELECT r.*, cu.full_name as customer_name, wu.full_name as worker_name
         FROM reviews r
         INNER JOIN users cu ON cu.id = r.customer_id
         INNER JOIN worker_profiles wp ON wp.id = r.worker_id
         INNER JOIN users wu ON wu.id = wp.user_id
         ORDER BY r.created_at DESC`
      )
      .all()
      .map((r: any) => ({ ...r, is_hidden: Boolean(r.is_hidden) }));
    res.json({ reviews });
  });

  router.patch('/admin/reviews/:id', requireAuth, requireRole('admin'), (req, res) => {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as any;
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    const nextHidden = typeof req.body?.is_hidden === 'boolean' ? (req.body.is_hidden ? 1 : 0) : review.is_hidden;
    db.prepare('UPDATE reviews SET is_hidden = ? WHERE id = ?').run(nextHidden, review.id);
    recalculateWorkerRating(review.worker_id);
    res.json({ ok: true, is_hidden: Boolean(nextHidden) });
  });

  router.patch('/admin/complaints/:id', requireAuth, requireRole('admin'), (req, res) => {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id) as any;
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }
    const { status, admin_resolution } = req.body || {};
    const nextStatus = ['open', 'investigating', 'resolved', 'dismissed'].includes(status) ? status : complaint.status;
    const nextResolution = admin_resolution !== undefined ? String(admin_resolution).trim() : complaint.admin_resolution;

    db.prepare(
      `UPDATE complaints SET status = ?, admin_resolution = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(nextStatus, nextResolution, complaint.id);

    createNotification(
      complaint.filed_by,
      'Complaint Status Updated',
      `Your complaint "${complaint.subject}" is now ${nextStatus}.`,
      'complaint',
      ''
    );

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaint.id);
    res.json({ complaint: updated });
  });

  router.use((_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  return router;
}
