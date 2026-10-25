import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider"; 

import VideoPlayer from "./VideoPlayer";
import VideoInfo from "./VideoInfo";
import CommentsList from "./Comments/CommentsList";
import Avatar from "../../shared/ui/Avatar/Avatar";
import PageLoader from "../../shared/ui/PageLoader/PageLoader";
import { fetchRecommended, fetchWatchVideo, type RecommendedVideo, type WatchVideo } from "./watchData";
import { timeAgo } from "../../shared/utils/timeAgo";
import "../../pages/Watch/StyleWatch/WatchStyle.css";
import { pluralize } from "../../shared/lib/pluralize";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState<WatchVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<RecommendedVideo[]>([]);
  const [subscribersCount, setSubscribersCount] = useState<number>(0);


  /* ===========================
     Загрузка видео
  =========================== */
  useEffect(() => {
    if (!id) return;
    // Если пользователь быстро перешёл к другому видео, ответ по старому id игнорируем
    let isCancelled = false;

    const fetchVideo = async () => {
      setLoading(true);
      const { data } = await fetchWatchVideo(id);
      if (isCancelled) return;
      setVideo(data);
      setLoading(false);
    };

    fetchVideo();
    return () => {
      isCancelled = true;
    };
  }, [id]);

   useEffect(() => {
    const recordHistory = async () => {
      if (user && video) {
        const { error } = await supabase
          .from('watch_history')
          .upsert(
            { 
              user_id: user.id,
              video_id: video.id,
              viewed_at: new Date().toISOString() 
            },
            { onConflict: 'user_id, video_id' }
          );
        
        if (error) console.error("Ошибка истории:", error);
      }
    };

    recordHistory();
  }, [video, user]);

  /* ===========================
     Получение подписчиков
  =========================== */
  const authorId = video?.author_id;
  useEffect(() => {
    if (!authorId) return;
    let isCancelled = false;

    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", authorId)
      .then(({ count, error }) => {
        if (!isCancelled && !error && typeof count === "number") setSubscribersCount(count);
      });

    return () => {
      isCancelled = true;
    };
  }, [authorId]);

  /* ===========================
     Рекомендованные видео
  =========================== */
  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    fetchRecommended(id).then(({ data, error }) => {
      if (!isCancelled && !error && data) setRecommended(data);
    });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  /* ===========================
     Инкремент просмотров
  =========================== */
  useEffect(() => {
    if (!id || !video) return;

    const viewedKey = `viewed_${id}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);

    if (alreadyViewed) return;

    // СРАЗУ ЖЕ записываем в sessionStorage, ДО отправки запроса!
    // Это мгновенно блокирует второй вызов от React Strict Mode
    sessionStorage.setItem(viewedKey, "true");

    const increment = async () => {
      const { error } = await supabase.rpc("increment_views", { video_id: id });
      
      // Если запрос почему-то упал (например, отпал интернет), 
      // удаляем отметку, чтобы просмотр мог засчитаться при обновлении страницы
      if (error) {
        console.error("Ошибка при добавлении просмотра:", error);
        sessionStorage.removeItem(viewedKey);
      }
    };

    increment();
  }, [id, video]);

  /* =========================== */

  if (loading) return <PageLoader />;
  if (!video) {
    return (
      <div className="watch-not-found">
        <h2>Видео не найдено</h2>
        <p>Возможно, его удалили или ссылка неверная.</p>
        <Link to="/" className="watch-not-found-link">На главную</Link>
      </div>
    );
  }

  return (
    <div className="watch-page-container">
      {/* ЛЕВАЯ КОЛОНКА (Главная) */}
      <div className="watch-main-column">
        {/* Обертка плеера, чтобы на мобилках убирать отступы */}
        <div className="watch-player-wrapper">
          <VideoPlayer
            key={video.id}
            url={video.video_url}
            thumbnailUrl={video.thumbnail_url ?? undefined}
            onAutoplayNext={recommended.length > 0 ? () => navigate(`/video/${recommended[0].id}`) : undefined}
          />
        </div>

        <div className="watch-info-wrapper">
          <VideoInfo
            video={video}
            subscribersCount={subscribersCount}
            onSubscriptionChange={(delta) => setSubscribersCount((count) => Math.max(0, count + delta))}
          />
          <CommentsList
            videoId={video.id}
          />
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА (Рекомендации) */}
      <div className="watch-secondary-column">
        <div className="recommended-list">
          {recommended.map((video) => (
            <div
              key={video.id}
              className="recommended-item"
            >
              {/* Превью видео */}
              <img
                src={video.thumbnail_url || "/placeholder.jpg"}
                alt=""
                className="recommended-thumbnail"
                loading="lazy"
              />

              {/* Контейнер для аватара и инфы под ним на мобилках */}
              <div className="recommended-content-block">
                <Link to={`/channel/${video.profiles?.id}`} className="recommended-channel-link" aria-label={`Канал ${video.profiles?.username ?? ""}`}>
                  <Avatar src={video.profiles?.avatar_url} name={video.profiles?.username} className="recommended-avatar" />
                </Link>

                <div className="recommended-info">
                  {/* Растянутая ссылка: кликабелен весь элемент, ссылки на канал лежат поверх */}
                  <Link to={`/video/${video.id}`} className="recommended-title recommended-link">{video.title}</Link>

                  {/* Обертка для автора и статистики */}
                  <div className="recommended-details">
                    <Link to={`/channel/${video.profiles?.id}`} className="recommended-author recommended-channel-link">
                      {video.profiles?.username}
                    </Link>
                    <div className="recommended-stats">
                      {video.views ?? 0} {pluralize(video.views ?? 0, ['просмотр', 'просмотра', 'просмотров'])} • {timeAgo(video.created_at)}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}