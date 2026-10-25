import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { VIDEO_CARD_COLUMNS } from "../../shared/lib/videoColumns";
import VideoCard, { type VideoCardData } from "../../components/VideoCard/VideoCard";
import HomeSkeleton from "../../shared/Skeletons/HomeSkeleton.tsx";
import { getHomeFeedCache, setHomeFeedCache } from "./homeFeedCache";
import '../../styles/HomeStyle.css';

const shuffleArray = <T,>(array: T[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Home() {
  const { user, loading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [searchParams] = useSearchParams();
  const genreId = searchParams.get("genre") || "all";

  useEffect(() => {
    if (isAuthLoading) return;
    let isCancelled = false;
    const cacheKey = `${userId ?? "guest"}_${genreId}`;

    const fetchVideos = async () => {
      // Кэш сохраняет порядок перемешанной ленты при возврате «Назад»
      const cached = getHomeFeedCache(cacheKey);
      if (cached) {
        setVideos(cached);
        setIsVideoLoading(false);
        return;
      }

      setIsVideoLoading(true);
      setHasError(false);

      let query = supabase.from("video_search_view").select(VIDEO_CARD_COLUMNS).order("created_at", { ascending: false }).limit(60);
      if (genreId !== "all") {
        query = query.contains("genre_ids", [genreId]);
      }

      const [subsRes, videosRes] = await Promise.all([
        userId
          ? supabase.from("subscriptions").select("channel_id").eq("subscriber_id", userId)
          : Promise.resolve({ data: [] as { channel_id: string }[] }),
        query,
      ]);
      if (isCancelled) return;

      if (videosRes.error) {
        console.error("Fetch Error:", videosRes.error);
        setVideos([]);
        setHasError(true);
        setIsVideoLoading(false);
        return;
      }

      const subbedChannelIds = new Set((subsRes.data || []).map((sub) => sub.channel_id));
      const allVideos = videosRes.data || [];
      const isSubbed = (v: VideoCardData) => !!v.author_id && subbedChannelIds.has(v.author_id);

      // Сначала видео с каналов, на которые пользователь подписан
      const finalVideos = [
        ...shuffleArray(allVideos.filter(isSubbed)),
        ...shuffleArray(allVideos.filter((v) => !isSubbed(v))),
      ];

      setHomeFeedCache(cacheKey, finalVideos);
      setVideos(finalVideos);
      setIsVideoLoading(false);
    };

    fetchVideos();
    return () => {
      isCancelled = true;
    };
  }, [genreId, isAuthLoading, userId]);

  const isLoading = isAuthLoading || isVideoLoading;

  if (!isLoading && videos.length === 0) {
    return (
      <div className="home-page">
        <div className="home-empty">
          <h3>{hasError ? "Не удалось загрузить видео" : "Здесь пока пусто"}</h3>
          <p>
            {hasError
              ? "Проверьте соединение и обновите страницу."
              : genreId !== "all"
                ? "В этом жанре ещё нет видео — выберите другой."
                : "Загрузите первое видео на VibeTube!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="video-grid" key={genreId}>
        {isLoading
          ?
            Array.from({ length: 6 }).map((_, index) => (
              <div className="video-card" key={`skeleton-${index}`}>
                <HomeSkeleton />
              </div>
            ))
          :
            videos.map((video) => (
              <VideoCard key={video.id} video={video}/>
            ))
        }
      </div>
    </div>
  );
}
