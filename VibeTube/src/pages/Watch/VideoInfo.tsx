import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../../shared/ui/Avatar/Avatar";
import { pluralize } from "../../shared/lib/pluralize";
import { timeAgo } from "../../shared/utils/timeAgo";
import VideoActions from "./VideoActions";
import { SubscribeButton } from "../../components/Button/SubscribeButton"; 
import type { WatchVideo } from "./watchData";
import "./StyleWatch/VideoInfoStyle.css";

interface Props {
  video: WatchVideo;
  subscribersCount: number;
  /** +1 при подписке, -1 при отписке — родитель обновляет счётчик без лишнего запроса */
  onSubscriptionChange: (delta: 1 | -1) => void;
}

export default function VideoInfo({
  video,
  subscribersCount,
  onSubscriptionChange
}: Props) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const navigate = useNavigate();
  const channelId = video.author_id;

  useEffect(() => {
    if (!user || !channelId) return;

    const checkSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("subscriber_id", user.id)
        .eq("channel_id", channelId)
        .maybeSingle();

      setIsSubscribed(!!data);
    };

    checkSubscription();
  }, [user, channelId]);

  // Возвращает true при успехе — от этого зависит анимация кнопки
  const handleToggleSubscribe = async () => {
    if (!user || !channelId) return false;

    const { error } = isSubscribed
      ? await supabase
          .from("subscriptions")
          .delete()
          .eq("channel_id", channelId)
          .eq("subscriber_id", user.id)
      : await supabase.from("subscriptions").insert({
          channel_id: channelId,
          subscriber_id: user.id
        });

    if (error) {
      console.error("Ошибка подписки:", error);
      return false;
    }

    setIsSubscribed(!isSubscribed);
    onSubscriptionChange(isSubscribed ? -1 : 1);
    return true;
  };

  // Парсинг текста (оставляем как был)
  const parseText = (text: string) => {
    if (!text) return null;
    
    // Регулярка ищет ссылки или слова, начинающиеся с @
    const regex = /(https?:\/\/[^\s]+|@[\w.]+)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.match(/https?:\/\/[^\s]+/)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="desc-link" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      } else if (part.startsWith("@")) {
        const username = part.substring(1);
        return (
          <span key={index} className="desc-mention" onClick={(e) => {
            e.stopPropagation();
            // Здесь можно перенаправлять на поиск по юзернейму, если нужно
            navigate(`/search?q=${encodeURIComponent(username)}`);
          }}>
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="video-info-wrapper">
      <h1 className="video-main-title">{video.title}</h1>

      <div className="video-primary-row">
        {/* АВТОР И ПОДПИСКА (Слева на ПК, верхний ряд на мобилках) */}
        <div className="author-and-subscribe">
          <Link to={`/channel/${channelId}`} className="author-details">
            <Avatar src={video.profiles?.avatar_url} name={video.profiles?.username} className="author-avatar" />
            <div className="author-text">
              <div className="author-name-video">{video.profiles?.username}</div>
              <div className="author-subs">
                {subscribersCount} {pluralize(subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
              </div>
            </div>
          </Link>

          <div className="action-wrapper">
            {/* ЛАЙКИ И ДИЗЛАЙКИ (Справа на ПК, отдельный ряд на мобилках) */}
            <div className="actions-right-bar">
              <VideoActions videoId={video.id} />
            </div>


            {user && user.id !== channelId && (
              <SubscribeButton 
                isSubscribed={isSubscribed} 
                onClick={handleToggleSubscribe} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Блок описания */}
      <div 
        className={`video-description-box ${isDescExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => !isDescExpanded && setIsDescExpanded(true)}
      >
        <div className="desc-stats">
          <span>{video.views || 0} {pluralize(video.views || 0, ['просмотр', 'просмотра', 'просмотров'])}</span>
          <span className="stats-dot">•</span>
          <span>{timeAgo(video.created_at)}</span>
        </div>
        <div className="desc-content">{parseText(video.description || "Нет описания")}</div>
        {!isDescExpanded && (video.description?.length ?? 0) > 100 && <div className="desc-show-more">...ещё</div>}
        {isDescExpanded && <div className="desc-show-less" onClick={(e) => { e.stopPropagation(); setIsDescExpanded(false); }}>Свернуть</div>}
      </div>
    </div>
  );
}