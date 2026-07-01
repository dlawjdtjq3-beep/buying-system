import { createClient } from '@supabase/supabase-js';

// 환경 변수 또는 하드코딩된 값 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rslfchdbjodgyqeepckt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_CJu3_Nt8l3WdZRJsxG6PNw_gvGiXD-j';

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
  system: string;
  created_at?: string;
};

export type ChargeHistory = {
  id: string;
  date: string;
  amount: number;
  balance: number;
  system: string;
  created_at: string;
};
