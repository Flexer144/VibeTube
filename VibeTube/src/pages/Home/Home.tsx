import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import VideoCard from "../../components/VideoCard/VideoCard";
import HomeSkeleton from "../../shared/Skeletons/HomeSkeleton.tsx"; // Убедись, что путь к файлу со скелетоном правильный!
import '../../styles/HomeStyle.css';

// 1. Глобальные переменные живут в памяти браузера до нажатия F5
let globalCachedVideos: any[] | null = null;
let globalCacheKey: string = "";

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Home() {
  const { user, loading: isAuthLoading } = useAuth(); // Переименовали loading для понятности
  const [videos, setVideos] = useState<any[]>([]);
  
  // Добавляем стейт для отслеживания загрузки видео
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const genreId = searchParams.get("genre") || "all";

  const fetchVideos = async () => {
    const currentKey = `${search}_${genreId}`;
    
    // Включаем скелетон перед началом загрузки
    setIsVideoLoading(true);

    if (globalCachedVideos && globalCacheKey === currentKey) {
      setVideos(globalCachedVideos);
      setIsVideoLoading(false); // Выключаем скелетон
      return; 
    }

    let subbedChannelIds: string[] = [];
    if (user) {
      const { data: subs } = await supabase
        .from("subscriptions") 
        .select("channel_id")  
        .eq("subscriber_id", user.id);
      if (subs) subbedChannelIds = subs.map(sub => sub.channel_id);
    }

    let query = supabase.from("video_search_view").select("*");
    
    if (search) {
      query = query.textSearch("fts_column", search, {
        config: "russian",
        type: "plain",
      });
    }
    if (genreId !== "all") {
      query = query.contains("genre_ids", [genreId]); 
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch Error:", error);
      setVideos([]);
    } else if (data) {
      const formattedData = data.map(v => ({
        ...v,
        profiles: { username: v.author_username, avatar_url: v.author_avatar },
        video_genres: v.genre_names?.map((name: string) => ({ genres: { name: name } })) || []
      }));

      const subbedVideos = formattedData.filter(v => subbedChannelIds.includes(v.author_id));
      const otherVideos = formattedData.filter(v => !subbedChannelIds.includes(v.author_id));

      const shuffledSubbed = shuffleArray(subbedVideos);
      const shuffledOthers = shuffleArray(otherVideos);
      const finalVideos = [...shuffledSubbed, ...shuffledOthers];

      globalCachedVideos = finalVideos;
      globalCacheKey = currentKey;

      setVideos(finalVideos);
    }
    
    // Выключаем скелетон после того, как данные получены и стейт обновлен
    setIsVideoLoading(false);
  };

  useEffect(() => {
    // Ждем, пока проверится авторизация, затем грузим видео
    if (!isAuthLoading) {
      fetchVideos();
    }
  }, [search, genreId, isAuthLoading, user]);

  // Генерируем уникальный ключ для сетки (сохраняем логику анимаций при смене фильтров)
  const gridKey = `${search}_${genreId}`;

  // Общий флаг загрузки: либо грузится профиль, либо грузятся видео
  const isLoading = isAuthLoading || isVideoLoading;

  if (!user && !isAuthLoading) return <p>Не авторизован</p>;

  return (
    <div className="home-page">
      <div className="video-grid" key={gridKey}>
        {isLoading 
          ? /* Рендерим 8 скелетонов (можешь изменить число под свой дизайн), 
               оборачивая их в .video-card, чтобы на них тоже работала твоя CSS-анимация появления */
            Array.from({ length: 6 }).map((_, index) => (
              <div className="video-card" key={`skeleton-${index}`}>
                <HomeSkeleton />
              </div>
            ))
          : /* Рендерим реальные видео, когда загрузка завершена */
            videos.map((video) => (
              <VideoCard key={video.id} video={video}/>
            ))
        }
      </div>
    </div>
  );
}