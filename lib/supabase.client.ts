// Cloudflare Pages용 Supabase 클라이언트 (환경 변수 하드코딩)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rslfchdbjodgyqeepckt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGZjaGRiam9kZ3lxZWVwY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MzExODEsImV4cCI6MjA1NTAwNzE4MX0.f8cLSVUgaX1Z0-aGqvWfHPgaL9X6qzPjYJwK9kZEiSA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface PurchaseDB {
  id: string;
  application_date: string;
  application_number: number;
  applicant: string;
  category: string;
  image_data?: string;
  product_url: string;
  product_name: string;
  amount: number;
  commission?: number;
  appraisal_fee?: number;
  shipping_fee?: number;
  purchase_status: string;
  payment_method?: string;
  delivery_status: string;
  tracking_number?: string;
  created_at: string;
}

export interface ChargeHistoryDB {
  id: string;
  date: string;
  amount: number;
  balance: number;
  created_at: string;
}
