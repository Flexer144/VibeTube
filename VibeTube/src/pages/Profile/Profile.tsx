import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import VideoCard from "../../components/VideoCard/VideoCard";
import "./ProfileStyle.css";
import Carousel from "../../components/Carousel/Carousel"; 
import AvatarUpload from "../Upload/UploadAvatar";

export default function Profile() {
  const { id: channelId } = useParams();
  const { user } = useAuth();
  const isOwnProfile = user?.id === channelId;

  const [profileData, setProfileData] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  
  // Новые стейты для истории, лайков и подписок
  const [historyVideos, setHistoryVideos] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      if (!channelId) return;

      // 1. Профиль
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", channelId).single();
      setProfileData(profile);

      // 2. Видео канала
      const { data: uploadedVideos } = await supabase
        .from("video_search_view")
        .select("*")
        .eq("author_id", channelId)
        .order("created_at", { ascending: false });
      setVideos(uploadedVideos || []);

      // 3. Подписчики (считаем количество строк в таблице subscriptions)
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", channelId);
      setSubscribersCount(count || 0);

      // 4. Проверяем, подписан ли текущий юзер на этот канал
      if (user && !isOwnProfile) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("channel_id", channelId)
          .eq("subscriber_id", user.id)
          .single();
        setIsSubscribed(!!sub);
      }

      // 5. История и Лайки (ТОЛЬКО ЕСЛИ СВОЙ ПРОФИЛЬ)
      if (isOwnProfile) {
        // --- История ---
        const { data: history } = await supabase
          .from("watch_history")
          .select("video_id")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(10); // Берем последние 10

        if (history && history.length > 0) {
          const vIds = history.map((h) => h.video_id);
          const { data: hVideos } = await supabase.from("video_search_view").select("*").in("id", vIds);
          // Сортируем так же, как в истории
          const sortedHistory = vIds.map(id => hVideos?.find(v => v.id === id)).filter(Boolean);
          setHistoryVideos(sortedHistory);
        }

        // --- Лайки ---
        const { data: likes } = await supabase
          .from("likes")
          .select("video_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10); // Берем последние 10 понравившихся

        if (likes && likes.length > 0) {
          const lIds = likes.map((l) => l.video_id);
          const { data: lVideos } = await supabase.from("video_search_view").select("*").in("id", lIds);
          // Сортируем так же, как лайкали
          const sortedLikes = lIds.map(id => lVideos?.find(v => v.id === id)).filter(Boolean);
          setLikedVideos(sortedLikes);
        }
      }

      setLoading(false);
    };

    fetchProfileData();
  }, [channelId, isOwnProfile, user]);

  // Функция подписки/отписки
  const handleToggleSubscribe = async () => {
    if (!user) return alert("Войдите в аккаунт, чтобы подписаться");

    if (isSubscribed) {
      // Отписываемся
      await supabase.from("subscriptions").delete().eq("channel_id", channelId).eq("subscriber_id", user.id);
      setIsSubscribed(false);
      setSubscribersCount((prev) => prev - 1);
    } else {
      // Подписываемся
      await supabase.from("subscriptions").insert({ channel_id: channelId, subscriber_id: user.id });
      setIsSubscribed(true);
      setSubscribersCount((prev) => prev + 1);
    }
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: 50 }}>Загрузка профиля...</p>;
  if (!profileData) return <p style={{ textAlign: "center", marginTop: 50 }}>Канал не найден</p>;

  return (
    <div className="profile-container">
      <img 
        src={profileData.banner_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"} 
        className="profile-banner" 
        alt="Banner" 
      />
      
      <div className="profile-header">
        {isOwnProfile ? (
            <AvatarUpload 
              currentAvatar={profileData.avatar_url} 
              username={profileData.username}
              onAvatarChange={(newUrl) => setProfileData({...profileData, avatar_url: newUrl})}
            />
          ) : (
            <div className="avatar-image-container">
              <img 
                src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.username}`} 
                className="avatar-img-preview" 
                alt="Avatar" 
              />
            </div>
          )}
        
        <div className="profile-info">
          <h1 className="profile-username">{profileData.username}</h1>
          <p className="profile-stats">
            {subscribersCount} {subscribersCount === 1 ? 'подписчик' : 'подписчиков'} • {videos.length} видео
          </p>
        </div>

        {!isOwnProfile && (
          <button 
            className={`subscribe-btn ${isSubscribed ? "subscribed" : ""}`}
            onClick={handleToggleSubscribe}
          >
            {isSubscribed ? "Вы подписаны" : "Подписаться"}
          </button>
        )}
      </div>

      {/* --- ИСТОРИЯ (Только для себя) --- */}
      {isOwnProfile && historyVideos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="section-title">История просмотра</h2>
            <Carousel>
              {historyVideos.map((video) => (
                <div key={`hist-${video.id}`} style={{ minWidth: 280, maxWidth: 280 }}>
                  <VideoCard video={video} />
                </div>
              ))}
            </Carousel>
        </div>
      )}

      {/* --- ЛАЙКИ (Только для себя) --- */}
      {isOwnProfile && likedVideos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="section-title">Понравившиеся видео</h2>
            <Carousel>
              {likedVideos.map((video) => (
                <div key={`like-${video.id}`} style={{ minWidth: 280, maxWidth: 280 }}>
                  <VideoCard video={video} />
                </div>
              ))}
            </Carousel>
        </div>
      )}

      {/* --- ВИДЕО КАНАЛА --- */}
      <h2 className="section-title">{isOwnProfile ? "Ваши видео" : "Видео"}</h2>
      {videos.length === 0 ? (
        <p style={{ color: "#aaa", paddingLeft: 8 }}>На этом канале пока нет видео.</p>
      ) : (
        <div className="profile-video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}