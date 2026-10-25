import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { VIDEO_CARD_COLUMNS } from "../../shared/lib/videoColumns";
import { useAuth } from "../../app/providers/AuthProvider";
import VideoCard, { type VideoCardData } from "../../components/VideoCard/VideoCard";
import type { Tables } from "../../shared/types/database";
import Carousel from "../../components/Carousel/Carousel"; 
import AvatarUpload from "../Upload/UploadAvatar";
import Avatar from "../../shared/ui/Avatar/Avatar";
import { SubscribeButton } from "../../components/Button/SubscribeButton";
import "./ProfileStyle.css"; 
import { pluralize } from "../../shared/lib/pluralize";
import ProfileSkeleton from "../../shared/Skeletons/ProfileSkeleton.tsx";
import { invalidateHomeFeed } from "../Home/homeFeedCache";
import { removeVideoFiles } from "../../shared/lib/storage";

import { Trash2 } from "lucide-react";
import { useToast } from "../../shared/ui/Toast/ToastProvider";
import { createPortal } from "react-dom";

/** Видео по списку id в том же порядке, что и id (история и лайки отсортированы по дате) */
const fetchVideosInOrder = async (ids: string[]): Promise<VideoCardData[]> => {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("video_search_view").select(VIDEO_CARD_COLUMNS).in("id", ids);
  const byId = new Map((data ?? []).map((v) => [v.id, v]));
  return ids.map((id) => byId.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
};

/** История просмотров и понравившиеся — только для своего канала */
const fetchOwnLists = async (userId: string) => {
  const [historyRes, likesRes] = await Promise.all([
    supabase
      .from("watch_history")
      .select("video_id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(10),
    supabase
      .from("likes")
      .select("video_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const historyIds = (historyRes.data ?? []).map((h) => h.video_id);
  const likedIds = (likesRes.data ?? []).map((l) => l.video_id).filter((id): id is string => !!id);
  const [history, liked] = await Promise.all([fetchVideosInOrder(historyIds), fetchVideosInOrder(likedIds)]);
  return { history, liked };
};

export default function Profile() {
  const { id: channelId } = useParams();
  const { user } = useAuth();
  const isOwnProfile = user?.id === channelId;

  const [profileData, setProfileData] = useState<Tables<"profiles"> | null>(null);
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [historyVideos, setHistoryVideos] = useState<VideoCardData[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoCardData[]>([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [videoToDelete, setVideoToDelete] = useState<VideoCardData | null>(null);
  const [deletePassword, setDeletePassword] = useState(""); 
  const [isDeleting, setIsDeleting] = useState(false); 

  useEffect(() => {
    if (videoToDelete) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [videoToDelete]);

  // Уведомления — общий ToastProvider
  const toast = useToast();
  const showToast = (type: 'error' | 'success', title: string, message: string) => toast(type, message, title);

  // Функция закрытия модалки
  const closeDeleteModal = () => {
    setVideoToDelete(null);
    setDeletePassword("");
  };

  // Функция подтверждения удаления
  const confirmDelete = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (!deletePassword || !user?.email || !videoToDelete?.id) return;
  const deletedId = videoToDelete.id;
  
  setIsDeleting(true);

  try {
    // 1. Сначала пере-авторизация (проверка пароля)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });

    if (authError) {
      showToast('error', 'Ошибка!', 'Неверный пароль. Попробуйте еще раз.');
      setIsDeleting(false);
      return;
    }

    // 2. Сначала удаляем запись из БД (каскад почистит лайки/комменты/историю).
    // Если сначала удалить файлы, а БД вернёт ошибку — останется «битое» видео без файлов.
    // .select() нужен, чтобы убедиться, что строка реально удалена (RLS может молча отфильтровать её).
    const { data: deletedRows, error: dbError } = await supabase
      .from("videos")
      .delete()
      .eq("id", deletedId)
      .select("id");

    if (dbError) throw dbError;
    if (!deletedRows || deletedRows.length === 0) throw new Error("Видео не удалено: нет прав или оно уже удалено");

    // 3. Теперь удаляем файлы. Ошибка здесь не критична: видео уже не видно на сайте
    await removeVideoFiles(videoToDelete);

    // 4. Успех! Сначала чистим UI, потом закрываем модалку
    const removeDeleted = (list: VideoCardData[]) => list.filter((v) => v.id !== deletedId);
    setVideos(removeDeleted);
    setHistoryVideos(removeDeleted);
    setLikedVideos(removeDeleted);
    invalidateHomeFeed();
    closeDeleteModal();
    
    // Показываем тост после закрытия модалки
    setTimeout(() => {
      showToast('success', 'Удалено', 'Видео и все связанные данные стерты.');
    }, 200);

  } catch (err) {
      console.error("Full delete error:", err);
      showToast('error', 'Ошибка', 'Не удалось полностью удалить видео.');
    } finally {
      setIsDeleting(false);
    }
  };


  const userId = user?.id;

  useEffect(() => {
    if (!channelId) return;
    let isCancelled = false;

    const fetchProfileData = async () => {
      setLoading(true);

      // Независимые запросы идут параллельно (раньше — до 7 запросов друг за другом)
      const [profileRes, videosRes, subsCountRes, mySubRes, ownLists] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", channelId).maybeSingle(),
        supabase
          .from("video_search_view")
          .select(VIDEO_CARD_COLUMNS)
          .eq("author_id", channelId)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channelId),
        userId && !isOwnProfile
          ? supabase
              .from("subscriptions")
              .select("id")
              .eq("channel_id", channelId)
              .eq("subscriber_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        isOwnProfile && userId ? fetchOwnLists(userId) : Promise.resolve({ history: [], liked: [] }),
      ]);

      // Пока шёл запрос, пользователь мог перейти на другой канал
      if (isCancelled) return;

      setProfileData(profileRes.data);
      setVideos(videosRes.data ?? []);
      setSubscribersCount(subsCountRes.count ?? 0);
      setIsSubscribed(!!mySubRes.data);
      setHistoryVideos(ownLists.history);
      setLikedVideos(ownLists.liked);
      setLoading(false);
    };

    fetchProfileData();
    return () => {
      isCancelled = true;
    };
  }, [channelId, isOwnProfile, userId]);

  // Возвращает true при успехе — от этого зависит анимация кнопки
  const handleToggleSubscribe = async () => {
    if (!user || !channelId) return false;

    const { error } = isSubscribed
      ? await supabase.from("subscriptions").delete().eq("channel_id", channelId).eq("subscriber_id", user.id)
      : await supabase.from("subscriptions").insert({ channel_id: channelId, subscriber_id: user.id });

    if (error) {
      showToast('error', 'Ошибка', isSubscribed ? 'Не удалось отписаться.' : 'Не удалось подписаться.');
      return false;
    }

    setIsSubscribed(!isSubscribed);
    setSubscribersCount((prev) => prev + (isSubscribed ? -1 : 1));
    return true;
  };

  // 2. ЗАМЕНЯЕМ СТАРУЮ СТРОКУ ЗАГРУЗКИ НА НАШ СКЕЛЕТОН
 if (loading) return <ProfileSkeleton />;

  if (!profileData) return <p style={{ textAlign: "center", marginTop: 50 }}>Канал не найден</p>;

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

        <div className="profile-header">
          {isOwnProfile ? (
            <AvatarUpload 
              currentAvatar={profileData.avatar_url} 
              username={profileData.username}
              onAvatarChange={(newUrl) => setProfileData({...profileData, avatar_url: newUrl})}
            />
          ) : (
            <div className="avatar-image-container">
              <Avatar src={profileData.avatar_url} name={profileData.username} className="avatar-img-preview" />
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
              // --- ОБНОВЛЕННАЯ ОБЕРТКА КАРТОЧКИ ---
              <div key={video.id} className="video-card-wrapper">
                <VideoCard video={video} />
                
                {/* Если это наш профиль, показываем кнопку удаления поверх видео */}
                {isOwnProfile && (
                  <div 
                    className="delete-video-btn-overlay"
                    onClick={() => setVideoToDelete(video)}
                    title="Удалить видео"
                  >
                    <Trash2 size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* --- МОДАЛЬНОЕ ОКНО УДАЛЕНИЯ --- */}
      {videoToDelete && createPortal(
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3 className="delete-modal-title">Вы действительно хотите удалить этот ролик?</h3>
            <p className="delete-modal-subtitle">Это действие нельзя будет отменить.</p>
            
            <input 
              type="password" 
              className="delete-modal-input" 
              placeholder="Для подтверждения введите пароль"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoFocus
            />

            <div className="delete-modal-actions">
              <button 
                className="modal-btn cancel" 
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Отмена
              </button>
              <button 
                className="modal-btn delete" 
                onClick={confirmDelete}
                disabled={!deletePassword || isDeleting}
              >
                <Trash2 size={16} />
                {isDeleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}