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

  useEffect(() => {
    fetchLikes();
  }, [videoId]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from("likes")
      .select("*")
      .eq("video_id", videoId);

    setLikesCount(data?.length || 0);

    if (user) {
      const isLiked = data?.some(l => l.user_id === user.id) ?? false;
      setLiked(isLiked);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .match({ user_id: user.id, video_id: videoId });
      setLiked(false);
      setLikesCount(prev => prev - 1);
      if (disliked) setDisliked(false);
    } else {
      await supabase
        .from("likes")
        .insert({ user_id: user.id, video_id: videoId });
      setLiked(true);
      setLikesCount(prev => prev + 1);
      
      // Запускаем анимацию конфетти
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000); // Длительность анимации
      
      if (disliked) setDisliked(false); // Убираем дизлайк, если ставим лайк
    }
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