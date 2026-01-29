import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
// Временный тест:
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Ошибка подключения к Supabase:", error.message);
  } else {
    console.log("Связь с Supabase установлена! Сессия:", data.session);
  }
});