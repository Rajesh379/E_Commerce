-- E Workers Marketplace — PostgreSQL + Row Level Security (RLS) Reference Schema
-- Target cities: Hyderabad & Jamshoro, Sindh, Pakistan

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin')) DEFAULT 'customer',
  city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')) DEFAULT 'Hyderabad',
  area TEXT DEFAULT '',
  avatar_url TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_lang TEXT NOT NULL CHECK (preferred_lang IN ('en', 'ur', 'sd')) DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 1,
  city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')),
  areas_covered TEXT NOT NULL DEFAULT '',
  cnic_number TEXT,
  cnic_front_url TEXT,
  cnic_back_url TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified',
  verification_notes TEXT DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  availability_schedule TEXT NOT NULL DEFAULT 'Mon-Sat, 9:00 AM - 8:00 PM',
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.worker_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  price_pkr INTEGER NOT NULL CHECK (price_pkr > 0),
  unit TEXT NOT NULL CHECK (unit IN ('per visit', 'per hour', 'fixed')) DEFAULT 'per visit',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.worker_services(id) ON DELETE SET NULL,
  service_title TEXT NOT NULL,
  price_pkr INTEGER NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Hyderabad', 'Jamshoro')),
  address TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled')) DEFAULT 'pending',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  filed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
  admin_resolution TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public worker directory readable" ON public.worker_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Worker manages own profile" ON public.worker_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public active services readable" ON public.worker_services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Participants read bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = customer_id OR auth.uid() IN (SELECT user_id FROM public.worker_profiles WHERE id = worker_id)
);
CREATE POLICY "Participants read/send messages" ON public.messages FOR ALL USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
