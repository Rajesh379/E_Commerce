import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
export const CNIC_DIR = path.join(UPLOADS_DIR, 'cnic');

for (const dir of [DATA_DIR, UPLOADS_DIR, AVATARS_DIR, CNIC_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const DB_PATH = path.join(DATA_DIR, 'eworkers.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin')) DEFAULT 'customer',
      city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')) DEFAULT 'Hyderabad',
      area TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      preferred_lang TEXT NOT NULL CHECK (preferred_lang IN ('en', 'ur', 'sd')) DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS worker_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Electrician',
      experience_years INTEGER NOT NULL DEFAULT 1,
      city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')) DEFAULT 'Hyderabad',
      areas_covered TEXT NOT NULL DEFAULT '',
      cnic_number TEXT,
      cnic_front_url TEXT,
      cnic_back_url TEXT,
      verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified',
      verification_notes TEXT NOT NULL DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1,
      availability_schedule TEXT NOT NULL DEFAULT 'Mon-Sat, 9:00 AM - 8:00 PM',
      avg_rating REAL NOT NULL DEFAULT 0,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      total_jobs INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS worker_services (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      price_pkr INTEGER NOT NULL CHECK (price_pkr > 0),
      unit TEXT NOT NULL CHECK (unit IN ('per visit', 'per hour', 'fixed')) DEFAULT 'per visit',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      service_id TEXT REFERENCES worker_services(id) ON DELETE SET NULL,
      service_title TEXT NOT NULL,
      price_pkr INTEGER NOT NULL,
      city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')),
      address TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled')) DEFAULT 'pending',
      payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      filed_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      against_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
      admin_resolution TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      link TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedInitialData();
}

export function recalculateWorkerRating(workerId: string): void {
  const stats = db
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as avg_rating
       FROM reviews
       WHERE worker_id = ? AND is_hidden = 0`
    )
    .get(workerId) as { total: number; avg_rating: number };

  const jobs = db
    .prepare(
      `SELECT COUNT(*) as total_jobs
       FROM bookings
       WHERE worker_id = ? AND status = 'completed'`
    )
    .get(workerId) as { total_jobs: number };

  db.prepare(
    `UPDATE worker_profiles
     SET avg_rating = ?, total_reviews = ?, total_jobs = ?
     WHERE id = ?`
  ).run(Number(stats.avg_rating.toFixed(2)), stats.total, jobs.total_jobs, workerId);
}

function seedInitialData(): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, phone, password_hash, full_name, role, city, area, avatar_url, phone_verified, is_active, preferred_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'en')
  `);

  const insertWorkerProfile = db.prepare(`
    INSERT INTO worker_profiles (id, user_id, bio, category, experience_years, city, areas_covered, cnic_number, verification_status, verification_notes, is_available, availability_schedule, avg_rating, total_reviews, total_jobs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertService = db.prepare(`
    INSERT INTO worker_services (id, worker_id, title, description, category, price_pkr, unit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const workerPass = bcrypt.hashSync('Worker@123', 10);
  const customerPass = bcrypt.hashSync('Customer@123', 10);

  const adminId = 'usr-admin-01';
  const customer1Id = 'usr-cust-01';
  const customer2Id = 'usr-cust-02';

  insertUser.run(adminId, 'admin@eworkers.pk', '+923001110000', adminPass, 'Sarmad Shaikh', 'admin', 'Hyderabad', 'Saddar', null, 1);
  insertUser.run(customer1Id, 'ayesha.memon@eworkers.pk', '+923002221111', customerPass, 'Ayesha Memon', 'customer', 'Hyderabad', 'Qasimabad Phase 1', null, 1);
  insertUser.run(customer2Id, 'farhan.laghari@eworkers.pk', '+923013334444', customerPass, 'Farhan Laghari', 'customer', 'Jamshoro', 'Sindh University Colony', null, 1);

  const workers = [
    {
      userId: 'usr-wrk-01',
      profileId: 'wrk-01',
      email: 'tariq.soomro@eworkers.pk',
      phone: '+923003112233',
      name: 'Tariq Mahmood Soomro',
      city: 'Hyderabad',
      area: 'Qasimabad',
      avatar: '/src/assets/images/avatar_worker_tariq_1794725970437.jpg',
      category: 'Electrician',
      exp: 9,
      areasCovered: 'Qasimabad, Latifabad Unit 1-12, Autobhan Road',
      cnic: '41304-7823419-3',
      status: 'verified',
      bio: 'Licensed master electrician specializing in residential distribution boards, UPS inverter wiring, and fault diagnostics across Hyderabad.',
      schedule: 'Mon-Sat · 8:30 AM - 9:00 PM',
      services: [
        { id: 'srv-01', title: 'Complete Wiring & Breaker Panel Inspection', desc: 'Load testing, breaker replacement, and earthing diagnostics.', price: 1800, unit: 'per visit' },
        { id: 'srv-02', title: 'UPS & Inverter Dual-Circuit Installation', desc: 'Clean changeover wiring for 1kVA-5kVA home inverters.', price: 3500, unit: 'fixed' },
        { id: 'srv-03', title: 'Ceiling Fan & Lighting Fixture Setup', desc: 'Mounting, dimmer switch installation, and wiring check.', price: 900, unit: 'per visit' },
      ],
    },
    {
      userId: 'usr-wrk-02',
      profileId: 'wrk-02',
      email: 'sajid.khoso@eworkers.pk',
      phone: '+923332618890',
      name: 'Sajid Hussain Khoso',
      city: 'Hyderabad',
      area: 'Latifabad Unit 7',
      avatar: '/src/assets/images/avatar_worker_sajid_1794725970879.jpg',
      category: 'Plumber',
      exp: 11,
      areasCovered: 'Latifabad, Saddar, Citizen Colony, Heerabad',
      cnic: '41303-5519283-1',
      status: 'verified',
      bio: 'Experienced sanitary & PPR pipeline specialist handling concealed leak detection, motor pumps, and solar geyser plumbing.',
      schedule: 'Daily · 9:00 AM - 8:00 PM',
      services: [
        { id: 'srv-04', title: 'Water Pump & Bore Motor Repair', desc: 'Impeller service, pressure switch calibration, and line sealing.', price: 2000, unit: 'per visit' },
        { id: 'srv-05', title: 'Concealed Pipe Leak Detection & PPR Joint', desc: 'Pressure test and hot/cold PPR fusion repair.', price: 2500, unit: 'per visit' },
        { id: 'srv-06', title: 'Instant & Solar Geyser Installation', desc: 'Complete inlet/outlet valve fitting and safety venting.', price: 3200, unit: 'fixed' },
      ],
    },
    {
      userId: 'usr-wrk-03',
      profileId: 'wrk-03',
      email: 'bilal.qazi@eworkers.pk',
      phone: '+923123459901',
      name: 'Bilal Ahmed Qazi',
      city: 'Jamshoro',
      area: 'Sindh University Society',
      avatar: '/src/assets/images/avatar_worker_bilal_1794725971385.jpg',
      category: 'AC & HVAC',
      exp: 6,
      areasCovered: 'Jamshoro, MUET, LUMHS, Kotri, Qasimabad',
      cnic: '41504-6628192-5',
      status: 'verified',
      bio: 'Certified inverter AC technician serving Jamshoro and Qasimabad with nitrogen leak testing, gas refilling, and master service.',
      schedule: 'Mon-Sun · 10:00 AM - 10:00 PM',
      services: [
        { id: 'srv-07', title: 'Split & Inverter AC Master Jet Service', desc: 'Indoor coil wash, drain flush, and outdoor condenser cleaning.', price: 2200, unit: 'per visit' },
        { id: 'srv-08', title: 'R410A / R32 Refrigerant Gas Recharge', desc: 'Vacuuming, flare nut check, and calibrated refrigerant top-up.', price: 5500, unit: 'fixed' },
        { id: 'srv-09', title: 'AC PCB & Sensor Diagnostics', desc: 'Inverter error-code troubleshooting and thermistor replacement.', price: 1500, unit: 'per visit' },
      ],
    },
    {
      userId: 'usr-wrk-04',
      profileId: 'wrk-04',
      email: 'kamran.chandio@eworkers.pk',
      phone: '+923453887712',
      name: 'Kamran Ali Chandio',
      city: 'Hyderabad',
      area: 'Autobhan Road',
      avatar: '/src/assets/images/avatar_worker_kamran_1794725971263.jpg',
      category: 'Carpenter',
      exp: 8,
      areasCovered: 'Autobhan Road, Defence, Qasimabad, Latifabad',
      cnic: '41302-9918273-7',
      status: 'verified',
      bio: 'Precision cabinetmaker and door hardware specialist. Custom kitchen hinges, wardrobes, locksets, and polish restoration.',
      schedule: 'Mon-Sat · 9:30 AM - 7:30 PM',
      services: [
        { id: 'srv-10', title: 'Door Alignment & Smart Lock Fitting', desc: 'Hinge leveling, mortise lock mortising, and frame adjustment.', price: 1600, unit: 'per visit' },
        { id: 'srv-11', title: 'Modular Kitchen Cabinet Repair', desc: 'Hydraulic soft-close hinge replacement and drawer channel tuning.', price: 2400, unit: 'per visit' },
      ],
    },
    {
      userId: 'usr-wrk-05',
      profileId: 'wrk-05',
      email: 'noman.talpur@eworkers.pk',
      phone: '+923029012345',
      name: 'Noman Raza Talpur',
      city: 'Jamshoro',
      area: 'Kotri Site & LUMHS',
      avatar: '/src/assets/images/avatar_worker_tariq_1794725970437.jpg',
      category: 'Solar & UPS',
      exp: 7,
      areasCovered: 'Jamshoro, Kotri, Petaro, Qasimabad',
      cnic: '41506-3310294-9',
      status: 'verified',
      bio: 'Hybrid solar inverter installer and battery bank technician. Net-metering wiring, DC surge protection, and panel cleaning.',
      schedule: 'Mon-Sat · 8:00 AM - 6:00 PM',
      services: [
        { id: 'srv-12', title: 'Solar Array Cleaning & Health Audit', desc: 'De-ionized panel wash, string voltage check, and MC4 inspection.', price: 3000, unit: 'per visit' },
        { id: 'srv-13', title: 'Hybrid Inverter Setup & Earthing Check', desc: 'AC/DC SPD configuration and lithium battery BMS pairing.', price: 6500, unit: 'fixed' },
      ],
    },
    {
      userId: 'usr-wrk-06',
      profileId: 'wrk-06',
      email: 'imran.palli@eworkers.pk',
      phone: '+923084455667',
      name: 'Imran Palli',
      city: 'Hyderabad',
      area: 'Saddar',
      avatar: '/src/assets/images/avatar_worker_kamran_1794725971263.jpg',
      category: 'Painter',
      exp: 5,
      areasCovered: 'Saddar, Hirabad, GOR Colony, Latifabad',
      cnic: '41304-1192837-3',
      status: 'pending',
      bio: 'Interior weather-shield and dampness-treatment specialist. Clean masking, wall putty smoothing, and low-odor matte finishes.',
      schedule: 'Mon-Sat · 9:00 AM - 6:00 PM',
      services: [
        { id: 'srv-14', title: 'Single Room Repaint & Seepage Primer', desc: 'Wall scraping, damp-seal primer, and 2-coat emulsion finish.', price: 8500, unit: 'fixed' },
      ],
    },
  ];

  for (const w of workers) {
    insertUser.run(w.userId, w.email, w.phone, workerPass, w.name, 'worker', w.city, w.area, w.avatar, 1);
    insertWorkerProfile.run(
      w.profileId,
      w.userId,
      w.bio,
      w.category,
      w.exp,
      w.city,
      w.areasCovered,
      w.cnic,
      w.status,
      w.status === 'verified' ? 'CNIC verified by Hyderabad operations team.' : 'CNIC uploaded and awaiting admin review.',
      1,
      w.schedule,
      0,
      0,
      0
    );
    for (const s of w.services) {
      insertService.run(s.id, w.profileId, s.title, s.desc, w.category, s.price, s.unit);
    }
  }

  // Initial completed bookings + reviews + active booking + chat messages
  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, customer_id, worker_id, service_id, service_title, price_pkr, city, address, scheduled_date, scheduled_time, notes, status, payment_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  insertBooking.run(
    'bk-1001',
    customer1Id,
    'wrk-01',
    'srv-01',
    'Complete Wiring & Breaker Panel Inspection',
    1800,
    'Hyderabad',
    'House 42-B, Naseem Nagar, Qasimabad',
    '2026-11-08',
    '11:00 AM',
    'Main DB tripping when AC starts.',
    'completed',
    'paid',
    '-6 days',
    '-6 days'
  );
  insertBooking.run(
    'bk-1002',
    customer2Id,
    'wrk-03',
    'srv-07',
    'Split & Inverter AC Master Jet Service',
    2200,
    'Jamshoro',
    'Block C-14, Sindh University Employees Society',
    '2026-11-10',
    '03:00 PM',
    '1.5 Ton Gree Inverter cooling low.',
    'completed',
    'paid',
    '-4 days',
    '-4 days'
  );
  insertBooking.run(
    'bk-1003',
    customer1Id,
    'wrk-02',
    'srv-04',
    'Water Pump & Bore Motor Repair',
    2000,
    'Hyderabad',
    'House 42-B, Naseem Nagar, Qasimabad',
    '2026-11-16',
    '10:30 AM',
    'Motor pressure drops after 10 minutes.',
    'accepted',
    'unpaid',
    '-1 days',
    '-12 hours'
  );

  const insertReview = db.prepare(`
    INSERT INTO reviews (id, booking_id, customer_id, worker_id, rating, comment, is_hidden, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now', ?))
  `);

  insertReview.run('rev-01', 'bk-1001', customer1Id, 'wrk-01', 5, 'Arrived on time in Qasimabad, traced the loose neutral in 20 minutes, and neatly labeled all breakers.', '-5 days');
  insertReview.run('rev-02', 'bk-1002', customer2Id, 'wrk-03', 5, 'Very thorough jet wash with protective cover. Cooling restored immediately.', '-3 days');

  for (const w of workers) {
    recalculateWorkerRating(w.profileId);
  }

  db.prepare(`
    INSERT INTO messages (id, booking_id, sender_id, receiver_id, body, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now', '-10 hours'))
  `).run(crypto.randomUUID(), 'bk-1003', customer1Id, 'usr-wrk-02', 'Assalam-o-Alaikum Sajid bhai, please bring a replacement non-return valve just in case.');

  db.prepare(`
    INSERT INTO messages (id, booking_id, sender_id, receiver_id, body, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now', '-8 hours'))
  `).run(crypto.randomUUID(), 'bk-1003', 'usr-wrk-02', customer1Id, 'Walaikum Assalam, noted! I will reach Naseem Nagar at 10:30 AM with the 1-inch brass check valve.');
}
