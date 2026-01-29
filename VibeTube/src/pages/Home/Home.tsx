import { useAuth } from "../../app/providers/AuthProvider";
import { logoutUser } from "../../features/auth/logout";

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) return <p>Загрузка...</p>;
  if (!user) return <p>Не авторизован</p>;

  return (
    <>
      <h2>Привет, {profile?.username} 👋</h2>
      <button onClick={logoutUser}>Выйти</button>
    </>
  );
}