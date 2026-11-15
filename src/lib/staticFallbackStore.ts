import type {
  Booking,
  ChatMessage,
  City,
  Complaint,
  Lang,
  NotificationItem,
  Review,
  User,
  UserRole,
  WorkerProfile,
  WorkerService,
} from '../types';

const STORE_KEY = 'eworkers_static_db_v1';
const SESSION_USER_KEY = 'eworkers_static_uid';

interface StoredUser extends User {
  password: string;
}

interface StoredOtp {
  userId: string;
  phone: string;
  code: string;
  expiresAt: number;
  used: boolean;
}

interface StoredResetToken {
  userId: string;
  token: string;
  expiresAt: number;
  used: boolean;
}

interface StaticDbState {
  users: StoredUser[];
  workerProfiles: WorkerProfile[];
  workerServices: WorkerService[];
  bookings: Booking[];
  messages: ChatMessage[];
  reviews: Review[];
  complaints: Complaint[];
  notifications: NotificationItem[];
  otps: StoredOtp[];
  resetTokens: StoredResetToken[];
}

function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function resolveImg(filename: string): string {
  return `${import.meta.env.BASE_URL || '/'}images/${filename}`.replace(/\/+/g, '/');
}

function createInitialState(): StaticDbState {
  const users: StoredUser[] = [
    {
      id: 'usr-admin-01',
      email: 'admin@eworkers.pk',
      phone: '+923001110000',
      password: 'Admin@123',
      full_name: 'Sarmad Shaikh',
      role: 'admin',
      city: 'Hyderabad',
      area: 'Saddar',
      avatar_url: null,
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-cust-01',
      email: 'ayesha.memon@eworkers.pk',
      phone: '+923002221111',
      password: 'Customer@123',
      full_name: 'Ayesha Memon',
      role: 'customer',
      city: 'Hyderabad',
      area: 'Qasimabad Phase 1',
      avatar_url: null,
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-cust-02',
      email: 'farhan.laghari@eworkers.pk',
      phone: '+923013334444',
      password: 'Customer@123',
      full_name: 'Farhan Laghari',
      role: 'customer',
      city: 'Jamshoro',
      area: 'Sindh University Colony',
      avatar_url: null,
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-01',
      email: 'tariq.soomro@eworkers.pk',
      phone: '+923003112233',
      password: 'Worker@123',
      full_name: 'Tariq Mahmood Soomro',
      role: 'worker',
      city: 'Hyderabad',
      area: 'Qasimabad',
      avatar_url: resolveImg('avatar_worker_tariq_1794725970437.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-02',
      email: 'sajid.khoso@eworkers.pk',
      phone: '+923332618890',
      password: 'Worker@123',
      full_name: 'Sajid Hussain Khoso',
      role: 'worker',
      city: 'Hyderabad',
      area: 'Latifabad Unit 7',
      avatar_url: resolveImg('avatar_worker_sajid_1794725970879.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-03',
      email: 'bilal.qazi@eworkers.pk',
      phone: '+923123459901',
      password: 'Worker@123',
      full_name: 'Bilal Ahmed Qazi',
      role: 'worker',
      city: 'Jamshoro',
      area: 'Sindh University Society',
      avatar_url: resolveImg('avatar_worker_bilal_1794725971385.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-04',
      email: 'kamran.chandio@eworkers.pk',
      phone: '+923453887712',
      password: 'Worker@123',
      full_name: 'Kamran Ali Chandio',
      role: 'worker',
      city: 'Hyderabad',
      area: 'Autobhan Road',
      avatar_url: resolveImg('avatar_worker_kamran_1794725971263.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-05',
      email: 'noman.talpur@eworkers.pk',
      phone: '+923029012345',
      password: 'Worker@123',
      full_name: 'Noman Raza Talpur',
      role: 'worker',
      city: 'Jamshoro',
      area: 'Kotri Site & LUMHS',
      avatar_url: resolveImg('avatar_worker_tariq_1794725970437.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
    {
      id: 'usr-wrk-06',
      email: 'imran.palli@eworkers.pk',
      phone: '+923084455667',
      password: 'Worker@123',
      full_name: 'Imran Palli',
      role: 'worker',
      city: 'Hyderabad',
      area: 'Saddar',
      avatar_url: resolveImg('avatar_worker_kamran_1794725971263.jpg'),
      phone_verified: true,
      is_active: true,
      preferred_lang: 'en',
      created_at: nowIso(),
    },
  ];

  const workerProfiles: WorkerProfile[] = [
    {
      id: 'wrk-01',
      user_id: 'usr-wrk-01',
      bio: 'Licensed master electrician specializing in residential distribution boards, UPS inverter wiring, and fault diagnostics across Hyderabad.',
      category: 'Electrician',
      experience_years: 9,
      city: 'Hyderabad',
      areas_covered: 'Qasimabad, Latifabad Unit 1-12, Autobhan Road',
      cnic_number: '41304-7823419-3',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'verified',
      verification_notes: 'CNIC verified by Hyderabad operations team.',
      is_available: true,
      availability_schedule: 'Mon-Sat · 8:30 AM - 9:00 PM',
      avg_rating: 5,
      total_reviews: 1,
      total_jobs: 1,
      created_at: nowIso(),
    },
    {
      id: 'wrk-02',
      user_id: 'usr-wrk-02',
      bio: 'Experienced sanitary & PPR pipeline specialist handling concealed leak detection, motor pumps, and solar geyser plumbing.',
      category: 'Plumber',
      experience_years: 11,
      city: 'Hyderabad',
      areas_covered: 'Latifabad, Saddar, Citizen Colony, Heerabad',
      cnic_number: '41303-5519283-1',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'verified',
      verification_notes: 'CNIC verified by Hyderabad operations team.',
      is_available: true,
      availability_schedule: 'Daily · 9:00 AM - 8:00 PM',
      avg_rating: 0,
      total_reviews: 0,
      total_jobs: 0,
      created_at: nowIso(),
    },
    {
      id: 'wrk-03',
      user_id: 'usr-wrk-03',
      bio: 'Certified inverter AC technician serving Jamshoro and Qasimabad with nitrogen leak testing, gas refilling, and master service.',
      category: 'AC & HVAC',
      experience_years: 6,
      city: 'Jamshoro',
      areas_covered: 'Jamshoro, MUET, LUMHS, Kotri, Qasimabad',
      cnic_number: '41504-6628192-5',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'verified',
      verification_notes: 'CNIC verified by Jamshoro operations team.',
      is_available: true,
      availability_schedule: 'Mon-Sun · 10:00 AM - 10:00 PM',
      avg_rating: 5,
      total_reviews: 1,
      total_jobs: 1,
      created_at: nowIso(),
    },
    {
      id: 'wrk-04',
      user_id: 'usr-wrk-04',
      bio: 'Precision cabinetmaker and door hardware specialist. Custom kitchen hinges, wardrobes, locksets, and polish restoration.',
      category: 'Carpenter',
      experience_years: 8,
      city: 'Hyderabad',
      areas_covered: 'Autobhan Road, Defence, Qasimabad, Latifabad',
      cnic_number: '41302-9918273-7',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'verified',
      verification_notes: 'CNIC verified by Hyderabad operations team.',
      is_available: true,
      availability_schedule: 'Mon-Sat · 9:30 AM - 7:30 PM',
      avg_rating: 0,
      total_reviews: 0,
      total_jobs: 0,
      created_at: nowIso(),
    },
    {
      id: 'wrk-05',
      user_id: 'usr-wrk-05',
      bio: 'Hybrid solar inverter installer and battery bank technician. Net-metering wiring, DC surge protection, and panel cleaning.',
      category: 'Solar & UPS',
      experience_years: 7,
      city: 'Jamshoro',
      areas_covered: 'Jamshoro, Kotri, Petaro, Qasimabad',
      cnic_number: '41506-3310294-9',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'verified',
      verification_notes: 'CNIC verified by Jamshoro operations team.',
      is_available: true,
      availability_schedule: 'Mon-Sat · 8:00 AM - 6:00 PM',
      avg_rating: 0,
      total_reviews: 0,
      total_jobs: 0,
      created_at: nowIso(),
    },
    {
      id: 'wrk-06',
      user_id: 'usr-wrk-06',
      bio: 'Interior weather-shield and dampness-treatment specialist. Clean masking, wall putty smoothing, and low-odor matte finishes.',
      category: 'Painter',
      experience_years: 5,
      city: 'Hyderabad',
      areas_covered: 'Saddar, Hirabad, GOR Colony, Latifabad',
      cnic_number: '41304-1192837-3',
      cnic_front_url: null,
      cnic_back_url: null,
      verification_status: 'pending',
      verification_notes: 'CNIC uploaded and awaiting admin review.',
      is_available: true,
      availability_schedule: 'Mon-Sat · 9:00 AM - 6:00 PM',
      avg_rating: 0,
      total_reviews: 0,
      total_jobs: 0,
      created_at: nowIso(),
    },
  ];

  const workerServices: WorkerService[] = [
    { id: 'srv-01', worker_id: 'wrk-01', title: 'Complete Wiring & Breaker Panel Inspection', description: 'Load testing, breaker replacement, and earthing diagnostics.', category: 'Electrician', price_pkr: 1800, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-02', worker_id: 'wrk-01', title: 'UPS & Inverter Dual-Circuit Installation', description: 'Clean changeover wiring for 1kVA-5kVA home inverters.', category: 'Electrician', price_pkr: 3500, unit: 'fixed', is_active: true, created_at: nowIso() },
    { id: 'srv-03', worker_id: 'wrk-01', title: 'Ceiling Fan & Lighting Fixture Setup', description: 'Mounting, dimmer switch installation, and wiring check.', category: 'Electrician', price_pkr: 900, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-04', worker_id: 'wrk-02', title: 'Water Pump & Bore Motor Repair', description: 'Impeller service, pressure switch calibration, and line sealing.', category: 'Plumber', price_pkr: 2000, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-05', worker_id: 'wrk-02', title: 'Concealed Pipe Leak Detection & PPR Joint', description: 'Pressure test and hot/cold PPR fusion repair.', category: 'Plumber', price_pkr: 2500, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-06', worker_id: 'wrk-02', title: 'Instant & Solar Geyser Installation', description: 'Complete inlet/outlet valve fitting and safety venting.', category: 'Plumber', price_pkr: 3200, unit: 'fixed', is_active: true, created_at: nowIso() },
    { id: 'srv-07', worker_id: 'wrk-03', title: 'Split & Inverter AC Master Jet Service', description: 'Indoor coil wash, drain flush, and outdoor condenser cleaning.', category: 'AC & HVAC', price_pkr: 2200, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-08', worker_id: 'wrk-03', title: 'R410A / R32 Refrigerant Gas Recharge', description: 'Vacuuming, flare nut check, and calibrated refrigerant top-up.', category: 'AC & HVAC', price_pkr: 5500, unit: 'fixed', is_active: true, created_at: nowIso() },
    { id: 'srv-09', worker_id: 'wrk-03', title: 'AC PCB & Sensor Diagnostics', description: 'Inverter error-code troubleshooting and thermistor replacement.', category: 'AC & HVAC', price_pkr: 1500, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-10', worker_id: 'wrk-04', title: 'Door Alignment & Smart Lock Fitting', description: 'Hinge leveling, mortise lock mortising, and frame adjustment.', category: 'Carpenter', price_pkr: 1600, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-11', worker_id: 'wrk-04', title: 'Modular Kitchen Cabinet Repair', description: 'Hydraulic soft-close hinge replacement and drawer channel tuning.', category: 'Carpenter', price_pkr: 2400, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-12', worker_id: 'wrk-05', title: 'Solar Array Cleaning & Health Audit', description: 'De-ionized panel wash, string voltage check, and MC4 inspection.', category: 'Solar & UPS', price_pkr: 3000, unit: 'per visit', is_active: true, created_at: nowIso() },
    { id: 'srv-13', worker_id: 'wrk-05', title: 'Hybrid Inverter Setup & Earthing Check', description: 'AC/DC SPD configuration and lithium battery BMS pairing.', category: 'Solar & UPS', price_pkr: 6500, unit: 'fixed', is_active: true, created_at: nowIso() },
    { id: 'srv-14', worker_id: 'wrk-06', title: 'Single Room Repaint & Seepage Primer', description: 'Wall scraping, damp-seal primer, and 2-coat emulsion finish.', category: 'Painter', price_pkr: 8500, unit: 'fixed', is_active: true, created_at: nowIso() },
  ];

  const bookings: Booking[] = [
    {
      id: 'bk-1001',
      customer_id: 'usr-cust-01',
      worker_id: 'wrk-01',
      service_id: 'srv-01',
      service_title: 'Complete Wiring & Breaker Panel Inspection',
      price_pkr: 1800,
      city: 'Hyderabad',
      address: 'House 42-B, Naseem Nagar, Qasimabad',
      scheduled_date: '2026-11-08',
      scheduled_time: '11:00 AM',
      notes: 'Main DB tripping when AC starts.',
      status: 'completed',
      payment_status: 'paid',
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: 'bk-1002',
      customer_id: 'usr-cust-02',
      worker_id: 'wrk-03',
      service_id: 'srv-07',
      service_title: 'Split & Inverter AC Master Jet Service',
      price_pkr: 2200,
      city: 'Jamshoro',
      address: 'Block C-14, Sindh University Employees Society',
      scheduled_date: '2026-11-10',
      scheduled_time: '03:00 PM',
      notes: '1.5 Ton Gree Inverter cooling low.',
      status: 'completed',
      payment_status: 'paid',
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: 'bk-1003',
      customer_id: 'usr-cust-01',
      worker_id: 'wrk-02',
      service_id: 'srv-04',
      service_title: 'Water Pump & Bore Motor Repair',
      price_pkr: 2000,
      city: 'Hyderabad',
      address: 'House 42-B, Naseem Nagar, Qasimabad',
      scheduled_date: '2026-11-16',
      scheduled_time: '10:30 AM',
      notes: 'Motor pressure drops after 10 minutes.',
      status: 'accepted',
      payment_status: 'unpaid',
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  const reviews: Review[] = [
    {
      id: 'rev-01',
      booking_id: 'bk-1001',
      customer_id: 'usr-cust-01',
      worker_id: 'wrk-01',
      rating: 5,
      comment: 'Arrived on time in Qasimabad, traced the loose neutral in 20 minutes, and neatly labeled all breakers.',
      is_hidden: false,
      created_at: nowIso(),
    },
    {
      id: 'rev-02',
      booking_id: 'bk-1002',
      customer_id: 'usr-cust-02',
      worker_id: 'wrk-03',
      rating: 5,
      comment: 'Very thorough jet wash with protective cover. Cooling restored immediately.',
      is_hidden: false,
      created_at: nowIso(),
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg-01',
      booking_id: 'bk-1003',
      sender_id: 'usr-cust-01',
      receiver_id: 'usr-wrk-02',
      body: 'Assalam-o-Alaikum Sajid bhai, please bring a replacement non-return valve just in case.',
      is_read: true,
      created_at: nowIso(),
    },
    {
      id: 'msg-02',
      booking_id: 'bk-1003',
      sender_id: 'usr-wrk-02',
      receiver_id: 'usr-cust-01',
      body: 'Walaikum Assalam, noted! I will reach Naseem Nagar at 10:30 AM with the 1-inch brass check valve.',
      is_read: false,
      created_at: nowIso(),
    },
  ];

  return {
    users,
    workerProfiles,
    workerServices,
    bookings,
    messages,
    reviews,
    complaints: [],
    notifications: [],
    otps: [],
    resetTokens: [],
  };
}

function loadState(): StaticDbState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as StaticDbState;
  } catch {
    // ignore
  }
  const initial = createInitialState();
  saveState(initial);
  return initial;
}

function saveState(state: StaticDbState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

function sanitizeUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

function getCurrentUser(state: StaticDbState): StoredUser | null {
  const currentId = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(SESSION_USER_KEY);
  if (!currentId) return null;
  return state.users.find((u) => u.id === currentId && u.is_active) || null;
}

function setCurrentUserId(userId: string | null): void {
  if (userId) {
    sessionStorage.setItem(SESSION_USER_KEY, userId);
    localStorage.setItem(SESSION_USER_KEY, userId);
  } else {
    sessionStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  }
}

function recalcWorker(state: StaticDbState, workerId: string): void {
  const wp = state.workerProfiles.find((w) => w.id === workerId);
  if (!wp) return;
  const visibleReviews = state.reviews.filter((r) => r.worker_id === workerId && !r.is_hidden);
  wp.total_reviews = visibleReviews.length;
  wp.avg_rating =
    visibleReviews.length > 0
      ? Number((visibleReviews.reduce((acc, r) => acc + r.rating, 0) / visibleReviews.length).toFixed(2))
      : 0;
  wp.total_jobs = state.bookings.filter((b) => b.worker_id === workerId && b.status === 'completed').length;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function enrichBookings(state: StaticDbState, list: Booking[]): Booking[] {
  return list.map((b) => {
    const cust = state.users.find((u) => u.id === b.customer_id);
    const wp = state.workerProfiles.find((w) => w.id === b.worker_id);
    const wrk = wp ? state.users.find((u) => u.id === wp.user_id) : undefined;
    const rev = state.reviews.find((r) => r.booking_id === b.id);
    return {
      ...b,
      customer_name: cust?.full_name,
      customer_phone: cust?.phone,
      worker_name: wrk?.full_name,
      worker_phone: wrk?.phone,
      worker_avatar: wrk?.avatar_url,
      worker_user_id: wp?.user_id,
      worker_category: wp?.category,
      review_id: rev?.id || null,
      review_rating: rev?.rating || null,
    };
  });
}

export async function handleStaticFallbackRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname.replace(/^\/api/, '');
  const method = (options.method || 'GET').toUpperCase();
  const body =
    options.body instanceof FormData
      ? options.body
      : typeof options.body === 'string'
        ? JSON.parse(options.body || '{}')
        : {};

  const state = loadState();
  const me = getCurrentUser(state);

  // AUTH
  if (pathname === '/auth/login' && method === 'POST') {
    const key = String(body.identifier || body.email || '').trim().toLowerCase();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === key || u.phone === String(body.identifier || body.email || '').trim()
    );
    if (!user || user.password !== String(body.password || '')) {
      throw new Error('Invalid credentials.');
    }
    if (!user.is_active) {
      throw new Error('This account has been suspended by an administrator.');
    }
    setCurrentUserId(user.id);
    const workerProfile = user.role === 'worker' ? state.workerProfiles.find((w) => w.user_id === user.id) || null : null;
    return { user: sanitizeUser(user), workerProfile, token: `static-${user.id}` } as T;
  }

  if (pathname === '/auth/register' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    if (!email || !phone || !body.full_name || !body.password) {
      throw new Error('Full name, email, phone number, and password are required.');
    }
    if (state.users.some((u) => u.email.toLowerCase() === email || u.phone === phone)) {
      throw new Error('An account with this email or phone number already exists.');
    }
    const role: UserRole = body.role === 'worker' ? 'worker' : 'customer';
    const city: City = body.city === 'Jamshoro' ? 'Jamshoro' : 'Hyderabad';
    const userId = uid('usr');
    const newUser: StoredUser = {
      id: userId,
      email,
      phone,
      password: String(body.password),
      full_name: String(body.full_name).trim(),
      role,
      city,
      area: String(body.area || '').trim(),
      avatar_url: null,
      phone_verified: false,
      is_active: true,
      preferred_lang: (['en', 'ur', 'sd'].includes(body.preferred_lang) ? body.preferred_lang : 'en') as Lang,
      created_at: nowIso(),
    };
    state.users.push(newUser);
    let workerProfile: WorkerProfile | null = null;
    if (role === 'worker') {
      workerProfile = {
        id: uid('wrk'),
        user_id: userId,
        bio: '',
        category: body.category || 'Electrician',
        experience_years: 1,
        city,
        areas_covered: newUser.area || city,
        cnic_number: null,
        cnic_front_url: null,
        cnic_back_url: null,
        verification_status: 'unverified',
        verification_notes: '',
        is_available: true,
        availability_schedule: 'Mon-Sat, 9:00 AM - 8:00 PM',
        avg_rating: 0,
        total_reviews: 0,
        total_jobs: 0,
        created_at: nowIso(),
      };
      state.workerProfiles.push(workerProfile);
    }
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    state.otps.push({ userId, phone, code: otpCode, expiresAt: Date.now() + 900000, used: false });
    saveState(state);
    setCurrentUserId(userId);
    return { user: sanitizeUser(newUser), workerProfile, token: `static-${userId}`, otpPreview: otpCode } as T;
  }

  if (pathname === '/auth/logout' && method === 'POST') {
    setCurrentUserId(null);
    return { ok: true } as T;
  }

  if (pathname === '/auth/me' && method === 'GET') {
    if (!me) throw new Error('Authentication required');
    const workerProfile = me.role === 'worker' ? state.workerProfiles.find((w) => w.user_id === me.id) || null : null;
    const unreadNotifications = state.notifications.filter((n) => n.user_id === me.id && !n.is_read).length;
    return { user: sanitizeUser(me), workerProfile, unreadNotifications } as T;
  }

  if (pathname === '/auth/send-otp' && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const phone = String(body.phone || me.phone || '').trim();
    me.phone = phone;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    state.otps.push({ userId: me.id, phone, code, expiresAt: Date.now() + 900000, used: false });
    saveState(state);
    return { ok: true, phone, otpPreview: code, message: 'Verification OTP generated for your phone number.' } as T;
  }

  if (pathname === '/auth/verify-otp' && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const match = state.otps.find((o) => o.userId === me.id && o.code === String(body.code || '').trim() && !o.used && o.expiresAt > Date.now());
    if (!match) throw new Error('Invalid or expired OTP code.');
    match.used = true;
    me.phone_verified = true;
    saveState(state);
    return { ok: true, user: sanitizeUser(me) } as T;
  }

  if (pathname === '/auth/forgot-password' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) return { ok: true, message: 'If an account matches this email, a reset token has been generated.' } as T;
    const token = uid('rst');
    state.resetTokens.push({ userId: user.id, token, expiresAt: Date.now() + 1800000, used: false });
    saveState(state);
    return { ok: true, resetTokenPreview: token, message: 'Password reset token generated. Use it on the Reset Password form.' } as T;
  }

  if (pathname === '/auth/reset-password' && method === 'POST') {
    const rec = state.resetTokens.find((t) => t.token === String(body.token || '').trim() && !t.used && t.expiresAt > Date.now());
    if (!rec) throw new Error('Reset token is invalid or has expired.');
    const target = state.users.find((u) => u.id === rec.userId);
    if (target) target.password = String(body.newPassword);
    rec.used = true;
    saveState(state);
    return { ok: true, message: 'Password updated successfully. You may now sign in.' } as T;
  }

  if (pathname === '/auth/profile' && method === 'PATCH') {
    if (!me) throw new Error('Authentication required');
    if (body.full_name) me.full_name = String(body.full_name).trim();
    if (body.city === 'Hyderabad' || body.city === 'Jamshoro') me.city = body.city;
    if (body.area !== undefined) me.area = String(body.area).trim();
    if (['en', 'ur', 'sd'].includes(body.preferred_lang)) me.preferred_lang = body.preferred_lang;
    saveState(state);
    return { user: sanitizeUser(me) } as T;
  }

  // UPLOADS
  if (pathname === '/uploads/avatar' && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const file = (body as FormData).get('avatar') as File | null;
    if (!file) throw new Error('Please select an image file.');
    const dataUrl = await fileToDataUrl(file);
    me.avatar_url = dataUrl;
    saveState(state);
    return { avatarUrl: dataUrl } as T;
  }

  if (pathname === '/uploads/cnic' && method === 'POST') {
    if (!me || me.role !== 'worker') throw new Error('Worker access required');
    const fd = body as FormData;
    const cnicNumber = String(fd.get('cnic_number') || '').trim();
    if (!/^\d{5}-\d{7}-\d$/.test(cnicNumber)) {
      throw new Error('Enter a valid 13-digit CNIC formatted as 41304-1234567-1.');
    }
    const wp = state.workerProfiles.find((w) => w.user_id === me.id);
    if (!wp) throw new Error('Worker profile not found');
    const front = fd.get('cnicFront') as File | null;
    const back = fd.get('cnicBack') as File | null;
    if (front && front.size > 0) wp.cnic_front_url = await fileToDataUrl(front);
    if (back && back.size > 0) wp.cnic_back_url = await fileToDataUrl(back);
    wp.cnic_number = cnicNumber;
    wp.verification_status = 'pending';
    wp.verification_notes = 'Submitted for admin review.';
    saveState(state);
    return { workerProfile: wp } as T;
  }

  // PUBLIC WORKERS
  if (pathname === '/workers' && method === 'GET') {
    const q = (parsed.searchParams.get('q') || '').trim().toLowerCase();
    const city = parsed.searchParams.get('city') || '';
    const category = parsed.searchParams.get('category') || '';
    const verifiedOnly = parsed.searchParams.get('verifiedOnly') === 'true';
    const availableOnly = parsed.searchParams.get('availableOnly') === 'true';
    const maxPrice = Number(parsed.searchParams.get('maxPrice') || '0');
    const sort = parsed.searchParams.get('sort') || 'rating';

    let list = state.workerProfiles
      .map((wp) => {
        const u = state.users.find((x) => x.id === wp.user_id && x.is_active);
        if (!u) return null;
        const services = state.workerServices.filter((s) => s.worker_id === wp.id && s.is_active);
        const starting = services.length > 0 ? Math.min(...services.map((s) => s.price_pkr)) : null;
        return {
          ...wp,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          area: u.area,
          phone_verified: u.phone_verified,
          starting_price_pkr: starting,
          active_service_count: services.length,
          services,
        };
      })
      .filter(Boolean) as WorkerProfile[];

    if (city) list = list.filter((w) => w.city === city);
    if (category && category !== 'All') list = list.filter((w) => w.category === category);
    if (verifiedOnly) list = list.filter((w) => w.verification_status === 'verified');
    if (availableOnly) list = list.filter((w) => w.is_available);
    if (maxPrice > 0) list = list.filter((w) => w.services?.some((s) => s.price_pkr <= maxPrice));
    if (q) {
      list = list.filter((w) =>
        [w.full_name, w.category, w.bio, w.areas_covered, ...(w.services?.map((s) => s.title) || [])]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => (a.starting_price_pkr || 999999) - (b.starting_price_pkr || 999999));
    } else if (sort === 'experience') {
      list.sort((a, b) => b.experience_years - a.experience_years);
    } else {
      list.sort((a, b) => b.avg_rating - a.avg_rating || b.total_jobs - a.total_jobs);
    }

    return { workers: list } as T;
  }

  if (pathname.startsWith('/workers/') && method === 'GET') {
    const id = pathname.split('/')[2];
    const wp = state.workerProfiles.find((w) => w.id === id);
    const u = wp ? state.users.find((x) => x.id === wp.user_id && x.is_active) : null;
    if (!wp || !u) throw new Error('Worker profile not found');
    const services = state.workerServices.filter((s) => s.worker_id === wp.id && s.is_active);
    const reviews = state.reviews
      .filter((r) => r.worker_id === wp.id && !r.is_hidden)
      .map((r) => {
        const cust = state.users.find((c) => c.id === r.customer_id);
        return { ...r, customer_name: cust?.full_name, customer_city: cust?.city };
      });
    return {
      worker: { ...wp, full_name: u.full_name, avatar_url: u.avatar_url, area: u.area, phone_verified: u.phone_verified },
      services,
      reviews,
    } as T;
  }

  // WORKER DASHBOARD
  if (pathname === '/worker/dashboard' && method === 'GET') {
    if (!me || me.role !== 'worker') throw new Error('Worker access required');
    const profile = state.workerProfiles.find((w) => w.user_id === me.id);
    if (!profile) throw new Error('Worker profile not found');
    const services = state.workerServices.filter((s) => s.worker_id === profile.id);
    const bks = state.bookings.filter((b) => b.worker_id === profile.id);
    return {
      profile,
      services,
      stats: {
        completed_earnings: bks.filter((b) => b.status === 'completed').reduce((s, b) => s + b.price_pkr, 0),
        pipeline_earnings: bks.filter((b) => ['accepted', 'in_progress'].includes(b.status)).reduce((s, b) => s + b.price_pkr, 0),
        pending_requests: bks.filter((b) => b.status === 'pending').length,
        completed_jobs: bks.filter((b) => b.status === 'completed').length,
      },
    } as T;
  }

  if (pathname === '/worker/profile' && method === 'PUT') {
    if (!me || me.role !== 'worker') throw new Error('Worker access required');
    const profile = state.workerProfiles.find((w) => w.user_id === me.id);
    if (!profile) throw new Error('Worker profile not found');
    Object.assign(profile, {
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.category ? { category: body.category } : {}),
      ...(body.experience_years !== undefined ? { experience_years: Number(body.experience_years) } : {}),
      ...(body.city ? { city: body.city } : {}),
      ...(body.areas_covered !== undefined ? { areas_covered: body.areas_covered } : {}),
      ...(typeof body.is_available === 'boolean' ? { is_available: body.is_available } : {}),
      ...(body.availability_schedule !== undefined ? { availability_schedule: body.availability_schedule } : {}),
    });
    saveState(state);
    return { profile } as T;
  }

  if (pathname === '/worker/services' && method === 'POST') {
    if (!me || me.role !== 'worker') throw new Error('Worker access required');
    const profile = state.workerProfiles.find((w) => w.user_id === me.id);
    if (!profile) throw new Error('Worker profile not found');
    const srv: WorkerService = {
      id: uid('srv'),
      worker_id: profile.id,
      title: String(body.title).trim(),
      description: String(body.description || '').trim(),
      category: body.category || profile.category,
      price_pkr: Math.max(100, Math.round(Number(body.price_pkr))),
      unit: body.unit || 'per visit',
      is_active: true,
      created_at: nowIso(),
    };
    state.workerServices.push(srv);
    saveState(state);
    return { service: srv } as T;
  }

  if (pathname.startsWith('/worker/services/') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const srv = state.workerServices.find((s) => s.id === id);
    if (!srv) throw new Error('Service not found');
    if (typeof body.is_active === 'boolean') srv.is_active = body.is_active;
    if (body.title) srv.title = body.title;
    if (body.price_pkr) srv.price_pkr = Number(body.price_pkr);
    saveState(state);
    return { service: srv } as T;
  }

  if (pathname.startsWith('/worker/services/') && method === 'DELETE') {
    const id = pathname.split('/')[3];
    state.workerServices = state.workerServices.filter((s) => s.id !== id);
    saveState(state);
    return { ok: true } as T;
  }

  // BOOKINGS & CHAT
  if (pathname === '/bookings' && method === 'GET') {
    if (!me) throw new Error('Authentication required');
    let list = state.bookings;
    if (me.role === 'customer') {
      list = list.filter((b) => b.customer_id === me.id);
    } else if (me.role === 'worker') {
      const wp = state.workerProfiles.find((w) => w.user_id === me.id);
      list = wp ? list.filter((b) => b.worker_id === wp.id) : [];
    }
    return { bookings: enrichBookings(state, list) } as T;
  }

  if (pathname === '/bookings' && method === 'POST') {
    if (!me || me.role !== 'customer') throw new Error('Customer access required');
    const srv = state.workerServices.find((s) => s.id === body.service_id);
    if (!srv) throw new Error('Selected service is unavailable');
    const bk: Booking = {
      id: uid('bk'),
      customer_id: me.id,
      worker_id: body.worker_id,
      service_id: srv.id,
      service_title: srv.title,
      price_pkr: srv.price_pkr,
      city: body.city || 'Hyderabad',
      address: String(body.address || '').trim(),
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time,
      notes: String(body.notes || '').trim(),
      status: 'pending',
      payment_status: 'unpaid',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.bookings.unshift(bk);
    saveState(state);
    return { booking: bk } as T;
  }

  if (pathname.match(/^\/bookings\/[^/]+\/status$/) && method === 'PATCH') {
    if (!me) throw new Error('Authentication required');
    const id = pathname.split('/')[2];
    const bk = state.bookings.find((b) => b.id === id);
    if (!bk) throw new Error('Booking not found');
    if (body.status) bk.status = body.status;
    if (bk.status === 'completed') bk.payment_status = 'paid';
    bk.updated_at = nowIso();
    recalcWorker(state, bk.worker_id);
    saveState(state);
    return { booking: bk } as T;
  }

  if (pathname.match(/^\/bookings\/[^/]+\/messages$/) && method === 'GET') {
    if (!me) throw new Error('Authentication required');
    const id = pathname.split('/')[2];
    const msgs = state.messages
      .filter((m) => m.booking_id === id)
      .map((m) => {
        const sender = state.users.find((u) => u.id === m.sender_id);
        return { ...m, sender_name: sender?.full_name, sender_role: sender?.role };
      });
    return { messages: msgs } as T;
  }

  if (pathname.match(/^\/bookings\/[^/]+\/messages$/) && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const id = pathname.split('/')[2];
    const bk = state.bookings.find((b) => b.id === id);
    if (!bk) throw new Error('Booking not found');
    const wp = state.workerProfiles.find((w) => w.id === bk.worker_id);
    const receiverId = me.id === bk.customer_id ? (wp?.user_id || '') : bk.customer_id;
    const msg: ChatMessage = {
      id: uid('msg'),
      booking_id: id,
      sender_id: me.id,
      receiver_id: receiverId,
      body: String(body.body || '').trim(),
      is_read: false,
      created_at: nowIso(),
      sender_name: me.full_name,
      sender_role: me.role,
    };
    state.messages.push(msg);
    saveState(state);
    return { message: msg } as T;
  }

  // REVIEWS & COMPLAINTS & NOTIFICATIONS
  if (pathname === '/reviews' && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const bk = state.bookings.find((b) => b.id === body.booking_id);
    if (!bk) throw new Error('Booking not found');
    const rev: Review = {
      id: uid('rev'),
      booking_id: bk.id,
      customer_id: me.id,
      worker_id: bk.worker_id,
      rating: Number(body.rating),
      comment: String(body.comment || '').trim(),
      is_hidden: false,
      created_at: nowIso(),
    };
    state.reviews.unshift(rev);
    recalcWorker(state, bk.worker_id);
    saveState(state);
    return { review: rev } as T;
  }

  if (pathname === '/complaints' && method === 'GET') {
    if (!me) throw new Error('Authentication required');
    const list = (me.role === 'admin' ? state.complaints : state.complaints.filter((c) => c.filed_by === me.id)).map((c) => {
      const u = state.users.find((x) => x.id === c.filed_by);
      return { ...c, filed_by_name: u?.full_name, filed_by_email: u?.email };
    });
    return { complaints: list } as T;
  }

  if (pathname === '/complaints' && method === 'POST') {
    if (!me) throw new Error('Authentication required');
    const cmp: Complaint = {
      id: uid('cmp'),
      booking_id: body.booking_id || null,
      filed_by: me.id,
      against_user_id: null,
      subject: String(body.subject || '').trim(),
      description: String(body.description || '').trim(),
      status: 'open',
      admin_resolution: '',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.complaints.unshift(cmp);
    saveState(state);
    return { complaint: cmp } as T;
  }

  if (pathname === '/notifications' && method === 'GET') {
    if (!me) return { notifications: [] } as T;
    return { notifications: state.notifications.filter((n) => n.user_id === me.id) } as T;
  }

  if (pathname === '/notifications/read' && method === 'PATCH') {
    if (me) {
      state.notifications.forEach((n) => {
        if (n.user_id === me.id) n.is_read = true;
      });
      saveState(state);
    }
    return { ok: true } as T;
  }

  // ADMIN
  if (pathname === '/admin/overview' && method === 'GET') {
    if (!me || me.role !== 'admin') throw new Error('Admin access required');
    const completed = state.bookings.filter((b) => b.status === 'completed');
    const byCity = ['Hyderabad', 'Jamshoro'].map((c) => {
      const bks = state.bookings.filter((b) => b.city === c);
      return { city: c, bookings_count: bks.length, volume_pkr: bks.reduce((s, b) => s + b.price_pkr, 0) };
    });
    const cats = Array.from(new Set(state.workerProfiles.map((w) => w.category)));
    const byCategory = cats.map((cat) => {
      const wps = state.workerProfiles.filter((w) => w.category === cat);
      const wpIds = new Set(wps.map((w) => w.id));
      return { category: cat, workers_count: wps.length, bookings_count: state.bookings.filter((b) => wpIds.has(b.worker_id)).length };
    });
    return {
      totals: {
        total_customers: state.users.filter((u) => u.role === 'customer').length,
        total_workers: state.users.filter((u) => u.role === 'worker').length,
        pending_verifications: state.workerProfiles.filter((w) => w.verification_status === 'pending').length,
        verified_workers: state.workerProfiles.filter((w) => w.verification_status === 'verified').length,
        total_bookings: state.bookings.length,
        completed_bookings: completed.length,
        completed_gmv_pkr: completed.reduce((s, b) => s + b.price_pkr, 0),
        open_complaints: state.complaints.filter((c) => ['open', 'investigating'].includes(c.status)).length,
      },
      byCity,
      byCategory,
    } as T;
  }

  if (pathname === '/admin/users' && method === 'GET') {
    return { users: state.users.map(sanitizeUser) } as T;
  }

  if (pathname.startsWith('/admin/users/') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const target = state.users.find((u) => u.id === id);
    if (!target) throw new Error('User not found');
    if (typeof body.is_active === 'boolean') target.is_active = body.is_active;
    saveState(state);
    return { user: sanitizeUser(target) } as T;
  }

  if (pathname === '/admin/workers' && method === 'GET') {
    const list = state.workerProfiles.map((wp) => {
      const u = state.users.find((x) => x.id === wp.user_id);
      return { ...wp, full_name: u?.full_name, email: u?.email, phone: u?.phone, avatar_url: u?.avatar_url, is_active: u?.is_active };
    });
    return { workers: list } as T;
  }

  if (pathname.match(/^\/admin\/workers\/[^/]+\/verify$/) && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const wp = state.workerProfiles.find((w) => w.id === id);
    if (!wp) throw new Error('Worker not found');
    wp.verification_status = body.verification_status;
    wp.verification_notes = body.verification_notes || '';
    saveState(state);
    return { worker: wp } as T;
  }

  if (pathname === '/admin/services' && method === 'GET') {
    const list = state.workerServices.map((s) => {
      const wp = state.workerProfiles.find((w) => w.id === s.worker_id);
      const u = wp ? state.users.find((x) => x.id === wp.user_id) : undefined;
      return { ...s, city: wp?.city, worker_name: u?.full_name };
    });
    return { services: list } as T;
  }

  if (pathname.startsWith('/admin/services/') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const srv = state.workerServices.find((s) => s.id === id);
    if (srv && typeof body.is_active === 'boolean') srv.is_active = body.is_active;
    saveState(state);
    return { ok: true, is_active: srv?.is_active } as T;
  }

  if (pathname === '/admin/reviews' && method === 'GET') {
    const list = state.reviews.map((r) => {
      const cu = state.users.find((u) => u.id === r.customer_id);
      const wp = state.workerProfiles.find((w) => w.id === r.worker_id);
      const wu = wp ? state.users.find((u) => u.id === wp.user_id) : undefined;
      return { ...r, customer_name: cu?.full_name, worker_name: wu?.full_name };
    });
    return { reviews: list } as T;
  }

  if (pathname.startsWith('/admin/reviews/') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const rev = state.reviews.find((r) => r.id === id);
    if (rev && typeof body.is_hidden === 'boolean') {
      rev.is_hidden = body.is_hidden;
      recalcWorker(state, rev.worker_id);
      saveState(state);
    }
    return { ok: true } as T;
  }

  if (pathname.startsWith('/admin/complaints/') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const cmp = state.complaints.find((c) => c.id === id);
    if (cmp) {
      if (body.status) cmp.status = body.status;
      if (body.admin_resolution !== undefined) cmp.admin_resolution = body.admin_resolution;
      cmp.updated_at = nowIso();
      saveState(state);
    }
    return { complaint: cmp } as T;
  }

  throw new Error('Endpoint unavailable in static mode');
}
