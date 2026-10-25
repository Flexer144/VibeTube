import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Типизированный клиент: TypeScript знает таблицы, колонки и результаты запросов
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
