import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../shared/lib/supabase";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Обновить профиль в контексте после изменения (например, нового аватара) */
  updateProfile: (patch: Partial<Pick<Profile, "username" | "avatar_url">>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateProfile: () => {},
});

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return { ...data, role: data.role === "admin" ? "admin" : "user" };
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

  const updateProfile = useCallback<AuthContextType["updateProfile"]>((patch) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, updateProfile }),
    [user, profile, loading, updateProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук рядом с провайдером — привычный паттерн; Fast Refresh для этого файла просто перезагрузит модуль
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
