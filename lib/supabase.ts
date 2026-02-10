import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Purchase = {
  id: string;
  application_date: string;
  application_number: number;
  applicant: string;
  category: string;
  image_data: string;
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
  created_at?: string;
};

export type ChargeHistory = {
  id: string;
  date: string;
  amount: number;
  balance: number;
  created_at: string;
};
