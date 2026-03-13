import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { logoutUser } from "../../features/auth/logout";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import VideoCard from "../../components/VideoCard/VideoCard";
import '../../styles/HomeStyle.css';
import SideBar from "../../components/SideBar/SideBar";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);

  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const genreId = searchParams.get("genre"); // <--- Слушаем жанр из URL

  const fetchVideos = async () => {
  let query = supabase.from("video_search_view").select("*");

  // 1. Фильтр по поиску
  if (search) {
    query = query.or(`title.ilike.%${search}%,author_username.ilike.%${search}%,search_genres_string.ilike.%${search}%`);
  }

  // 2. Фильтр по жанру
  if (genreId) {
    // ВАЖНО: Убираем parseInt! Оставляем genreId как есть (это строка-UUID)
    query = query.contains("genre_ids", [genreId]); 
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Error:", error);
    setVideos([]);
  } else {
    // ... остальной код форматирования
    const formattedData = data?.map(v => ({
      ...v,
      profiles: { username: v.author_username, avatar_url: v.author_avatar },
      video_genres: v.genre_names?.map((name: string) => ({ genres: { name: name } })) || []
    }));
    setVideos(formattedData || []);
  }
};

  // Перезагружаем видео каждый раз, когда меняется поиск ИЛИ жанр в URL
  useEffect(() => {
    fetchVideos();
  }, [search, genreId]);



  if (loading) return <p>Загрузка...</p>;
  if (!user) return <p>Не авторизован</p>;

  return (
    <>
      <div className="home-page">
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video}/>
          ))}
        </div>
      </div>
    </>
  );
}