import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { Heart, ThumbsDown } from "lucide-react";
import "./StyleWatch/VideoActionsStyle.css";

export default function VideoActions({ videoId }: { videoId: string }) {
  const { user } = useAuth();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  
  // Локальные стейты для визуала
  const [isAnimating, setIsAnimating] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    let isCancelled = false;

    const fetchLikes = async () => {
      // Считаем лайки на сервере (head: true — без загрузки самих строк)
      const [countRes, mineRes] = await Promise.all([
        supabase.from("likes").select("id", { count: "exact", head: true }).eq("video_id", videoId),
        userId
          ? supabase.from("likes").select("id").eq("video_id", videoId).eq("user_id", userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (isCancelled) return;

      setLikesCount(countRes.count ?? 0);
      setLiked(!!mineRes.data);
    };

    fetchLikes();
    return () => {
      isCancelled = true;
    };
  }, [videoId, userId]);

  // Оптимистично: сразу меняем UI, при ошибке откатываем
  const toggleLike = async () => {
    if (!user || isPending) return;

    const nextLiked = !liked;
    setIsPending(true);
    setLiked(nextLiked);
    setLikesCount(prev => prev + (nextLiked ? 1 : -1));
    if (disliked) setDisliked(false); // Лайк и дизлайк взаимоисключающие

    if (nextLiked) {
      // Запускаем анимацию конфетти
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000); // Длительность анимации
    }

    const { error } = nextLiked
      ? await supabase.from("likes").insert({ user_id: user.id, video_id: videoId })
      : await supabase.from("likes").delete().match({ user_id: user.id, video_id: videoId });

    if (error) {
      console.error("Не удалось изменить лайк:", error);
      setLiked(!nextLiked);
      setLikesCount(prev => prev - (nextLiked ? 1 : -1));
    }
    setIsPending(false);
  };

  const toggleDislike = () => {
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) toggleLike(); // Убираем лайк из БД, если жмем дизлайк
    }
  };

  return (
    <div className="action-buttons-container">
      <div className="action-pill">
        {/* КНОПКА ЛАЙКА */}
        <button 
            className={`action-btn like-btn ${liked ? 'active' : ''}`} 
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label="Нравится"
        >
          <div className="icon-wrapper">
            <Heart 
              size={20} 
              fill={liked ? "#6365f1" : "transparent"} 
              color={liked ? "#6365f1" : "#f1f1f1"} 
              className={isAnimating ? "heart-bounce" : ""}
            />
            {/* Конфетти частицы */}
            {isAnimating && (
              <div className="confetti-container">
                <span className="particle p1"></span>
                <span className="particle p2"></span>
                <span className="particle p3"></span>
                <span className="particle p4"></span>
                <span className="particle p5"></span>
                <span className="particle p6"></span>
              </div>
            )}
          </div>
          <span className="action-count">{likesCount}</span>
        </button>

        {/* РАЗДЕЛИТЕЛЬ */}
        <div className="action-divider"></div>

        {/* КНОПКА ДИЗЛАЙКА */}
        <button 
            className={`action-btn dislike-btn ${disliked ? 'active' : ''}`} 
            onClick={toggleDislike}
            aria-pressed={disliked}
            aria-label="Не нравится"
        >
          <ThumbsDown 
            size={20} 
            fill={disliked ? "#f1f1f1" : "transparent"} 
            color="#f1f1f1" 
          />
        </button>
      </div>
    </div>
  );
}