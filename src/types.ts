export type UserRole = 'customer' | 'worker' | 'admin';
export type Lang = 'en' | 'ur' | 'sd';
export type City = 'Hyderabad' | 'Jamshoro';

export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  city: City;
  area: string;
  avatar_url: string | null;
  phone_verified: boolean;
  is_active: boolean;
  preferred_lang: Lang;
  created_at: string;
}

export interface WorkerService {
  id: string;
  worker_id: string;
  title: string;
  description: string;
  category: string;
  price_pkr: number;
  unit: 'per visit' | 'per hour' | 'fixed';
  is_active: boolean;
  created_at: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  bio: string;
  category: string;
  experience_years: number;
  city: City;
  areas_covered: string;
  cnic_number: string | null;
  cnic_front_url: string | null;
  cnic_back_url: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_notes: string;
  is_available: boolean;
  availability_schedule: string;
  avg_rating: number;
  total_reviews: number;
  total_jobs: number;
  created_at: string;
  // Joined fields
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string | null;
  area?: string;
  phone_verified?: boolean;
  is_active?: boolean;
  starting_price_pkr?: number | null;
  active_service_count?: number;
  services?: WorkerService[];
}

export interface Booking {
  id: string;
  customer_id: string;
  worker_id: string;
  service_id: string | null;
  service_title: string;
  price_pkr: number;
  city: City;
  address: string;
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  payment_status: 'unpaid' | 'paid';
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  worker_name?: string;
  worker_phone?: string;
  worker_avatar?: string | null;
  worker_user_id?: string;
  worker_category?: string;
  review_id?: string | null;
  review_rating?: number | null;
}

export interface ChatMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: number | boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: UserRole;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  worker_id: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  created_at: string;
  customer_name?: string;
  customer_city?: string;
  worker_name?: string;
}

export interface Complaint {
  id: string;
  booking_id: string | null;
  filed_by: string;
  against_user_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  admin_resolution: string;
  created_at: string;
  updated_at: string;
  filed_by_name?: string;
  filed_by_email?: string;
  against_name?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  link: string;
  is_read: boolean;
  created_at: string;
}
