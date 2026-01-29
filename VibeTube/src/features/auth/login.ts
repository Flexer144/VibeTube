import { supabase } from "../../shared/lib/supabase";

export const loginUser = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });