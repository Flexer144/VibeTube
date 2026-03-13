import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import VideoCard from "../../components/VideoCard/VideoCard";
import Carousel from "../../components/Carousel/Carousel"; 
import AvatarUpload from "../Upload/UploadAvatar";
// Добавь это к остальным импортам в Profile.tsx
import { SubscribeButton } from "../../components/Button/SubscribeButton";
import "./ProfileStyle.css"; // Сюда нужно добавить стили для анимации
import { pluralize } from "../../shared/lib/pluralize";

export default function Profile() {
  const { id: channelId } = useParams();
  const { user } = useAuth();
  const isOwnProfile = user?.id === channelId;

  const [profileData, setProfileData] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [historyVideos, setHistoryVideos] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      if (!channelId) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", channelId).single();
      setProfileData(profile);

      const { data: uploadedVideos } = await supabase
        .from("video_search_view")
        .select("*")
        .eq("author_id", channelId)
        .order("created_at", { ascending: false });
      setVideos(uploadedVideos || []);

      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", channelId);
      setSubscribersCount(count || 0);

      if (user && !isOwnProfile) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("channel_id", channelId)
          .eq("subscriber_id", user.id)
          .single();
        setIsSubscribed(!!sub);
      }

      if (isOwnProfile) {
        const { data: history } = await supabase
          .from("watch_history")
          .select("video_id")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(10);

        if (history && history.length > 0) {
          const vIds = history.map((h) => h.video_id);
          const { data: hVideos } = await supabase.from("video_search_view").select("*").in("id", vIds);
          const sortedHistory = vIds.map(id => hVideos?.find(v => v.id === id)).filter(Boolean);
          setHistoryVideos(sortedHistory);
        }

        const { data: likes } = await supabase
          .from("likes")
          .select("video_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (likes && likes.length > 0) {
          const lIds = likes.map((l) => l.video_id);
          const { data: lVideos } = await supabase.from("video_search_view").select("*").in("id", lIds);
          const sortedLikes = lIds.map(id => lVideos?.find(v => v.id === id)).filter(Boolean);
          setLikedVideos(sortedLikes);
        }
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [channelId, isOwnProfile, user]);

  const handleToggleSubscribe = async () => {
    if (!user) return alert("Войдите в аккаунт");
    if (isSubscribed) {
      await supabase.from("subscriptions").delete().eq("channel_id", channelId).eq("subscriber_id", user.id);
      setIsSubscribed(false);
      setSubscribersCount((prev) => prev - 1);
    } else {
      await supabase.from("subscriptions").insert({ channel_id: channelId, subscriber_id: user.id });
      setIsSubscribed(true);
      setSubscribersCount((prev) => prev + 1);
    }
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: 50 }}>Загрузка...</p>;
  if (!profileData) return <p style={{ textAlign: "center", marginTop: 50 }}>Канал не найден</p>;
  console.log(likedVideos)
   console.log(videos)

  return (
    <div className="profile-container">

      <div className="profile-banner-wrapper">
        <div className="animated-background">
          <div className="bg-orb move-chaos orb-1"></div>
          <div className="bg-orb move-chaos orb-2"></div>
          <div className="bg-orb move-chaos orb-3"></div>
          <div className="bg-orb move-perimeter orb-edge-1"></div>
          <div className="bg-orb move-perimeter orb-edge-2"></div>
        </div>

        {/* ШАПКА ТЕПЕРЬ ВНУТРИ БАННЕРА */}
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
               {subscribersCount} {pluralize(subscribersCount, ['подписчик', 'подписчика', 'подписчиков'])} • {videos.length} {pluralize(videos.length, ['видео', 'видео', 'видео'])}
            </p>
          </div>

          {!isOwnProfile && (
            <div style={{ width: "160px" }}>
              <SubscribeButton 
                isSubscribed={isSubscribed} 
                onClick={handleToggleSubscribe} 
              />
            </div>
          )}
        </div>
      </div>

      {/* --- НИЖНИЙ КОНТЕНТ (ИСТОРИЯ, ЛАЙКИ, ВИДЕО) --- */}
      <div className="profile-content-body">
        {isOwnProfile && historyVideos.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <Carousel text={'История просмотра'}>
              {historyVideos.map((video) => (
                <div key={`hist-${video.id}`} style={{ minWidth: 280, maxWidth: 280 }}>
                  <VideoCard video={video}/>
                </div>
              ))}
            </Carousel>
          </div>
        )}

        {isOwnProfile && likedVideos.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <Carousel text={'Понравившиеся видео'}>
              {likedVideos.map((video) => (
                <div key={`like-${video.id}`} style={{ minWidth: 280, maxWidth: 280 }}>
                  <VideoCard video={video} />
                </div>
              ))}
            </Carousel>
          </div>
        )}

        <h2 className="section-title-profile">{isOwnProfile ? "Ваши видео" : "Видео"}</h2>
        {videos.length === 0 ? (
          <div className="no-video-wrapper">
            <p className="no-video" style={{ color: "#aaa", paddingLeft: 8 }}>Пока что здесь нет видео¯\_(ツ)_/¯</p>
          </div>
        ) : (
          <div className="profile-video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}