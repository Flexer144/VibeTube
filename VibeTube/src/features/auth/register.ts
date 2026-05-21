import { supabase } from "../../shared/lib/supabase";

export const registerUser = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });