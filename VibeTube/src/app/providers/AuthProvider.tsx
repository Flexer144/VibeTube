import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../shared/lib/supabase";

type Profile = {
  username: string;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

const fetchProfile = async (userId: string) => {
  const { data } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .maybeSingle();

  return data as Profile | null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let requestId = 0;
    let currentUserId: string | null | undefined;

    // onAuthStateChange сразу присылает INITIAL_SESSION, поэтому отдельный getUser не нужен.
    // loading держим до загрузки профиля — иначе AdminRoute
    // на мгновение видит profile = null и показывает «нет прав».
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      const nextUserId = currentUser?.id ?? null;

      // Обновление токена и т.п. не меняет пользователя — профиль перезапрашивать незачем
      if (nextUserId === currentUserId) return;
      currentUserId = nextUserId;

      setUser(currentUser);
      const thisRequest = ++requestId;

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Запросы к Supabase внутри колбэка нужно откладывать, иначе возможен дедлок auth-клиента
      setTimeout(async () => {
        const nextProfile = await fetchProfile(currentUser.id);
        if (!isActive || thisRequest !== requestId) return;

        setProfile(nextProfile);
        setLoading(false);
      }, 0);
    });

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
