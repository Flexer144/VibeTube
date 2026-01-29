import { supabase } from "../../shared/lib/supabase";

export const logoutUser = () => supabase.auth.signOut();