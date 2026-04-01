import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { pluralize } from "../../shared/lib/pluralize";
import { timeAgo } from "../../shared/utils/timeAgo";
import VideoActions from "./VideoActions";
import { SubscribeButton } from "../../components/Button/SubscribeButton"; // Импортируем твою новую кнопку
import "./StyleWatch/VideoInfoStyle.css";

interface Props {
  video: any;
  subscribersCount: number;
  onSubscriptionChange: () => void;
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
  }, [user, channelId, isSubscribed]); // Добавил зависимость, чтобы стейт был актуален

  // Твоя логика переключения подписки
  const handleToggleSubscribe = async () => {
    if (!user) return alert("Войдите в аккаунт");
    
    if (isSubscribed) {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("channel_id", channelId)
        .eq("subscriber_id", user.id);
        
      if (!error) {
        setIsSubscribed(false);
        onSubscriptionChange(); // Уведомляем родителя об изменении счетчика
      }
    } else {
      const { error } = await supabase.from("subscriptions").insert({ 
        channel_id: channelId, 
        subscriber_id: user.id 
      });
      
      if (!error) {
        setIsSubscribed(true);
        onSubscriptionChange(); // Уведомляем родителя об изменении счетчика
      }
    }
  };

  // Парсинг текста (оставляем как был)
  const parseText = (text: string) => {
    if (!text) return null;
    
    // Регулярка ищет ссылки или слова, начинающиеся с @
    const regex = /(https?:\/\/[^\s]+|@[\w\.]+)/g;
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
            navigate(`/search?q=${username}`); 
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
        <div className="author-details" onClick={() => navigate(`/channel/${channelId}`)}>
          <img
            src={video.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${video.profiles?.username}`}
            alt="avatar"
            className="author-avatar"
          />
          <div className="author-text">
            <div className="author-name">{video.profiles?.username}</div>
            <div className="author-subs">
              {subscribersCount} {pluralize(subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])}
            </div>
          </div>
        </div>

        <div className="actions-right-bar">
          <VideoActions videoId={video.id} />
          
          {user && user.id !== channelId && (
            /* ВСТАВЛЯЕМ ТВОЮ ГОТОВУЮ КНОПКУ */
            <SubscribeButton 
              isSubscribed={isSubscribed} 
              onClick={handleToggleSubscribe} 
            />
          )}
        </div>
      </div>

      {/* Блок описания (оставляем как был) */}
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
        {!isDescExpanded && video.description?.length > 100 && <div className="desc-show-more">...ещё</div>}
        {isDescExpanded && <div className="desc-show-less" onClick={(e) => { e.stopPropagation(); setIsDescExpanded(false); }}>Свернуть</div>}
      </div>
    </div>
  );
}