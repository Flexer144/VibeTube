import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import VideoCard from "../../components/VideoCard/VideoCard";
import Carousel from "../../components/Carousel/Carousel"; 
import AvatarUpload from "../Upload/UploadAvatar";
import { SubscribeButton } from "../../components/Button/SubscribeButton";
import "./ProfileStyle.css"; 
import { pluralize } from "../../shared/lib/pluralize";
import ProfileSkeleton from "../../shared/Skeletons/ProfileSkeleton.tsx";
import { invalidateHomeFeed } from "../Home/homeFeedCache";
import { removeVideoFiles } from "../../shared/lib/storage";

import { AlertTriangle, CheckCircle, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";

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

  const [videoToDelete, setVideoToDelete] = useState<any>(null); 
  const [deletePassword, setDeletePassword] = useState(""); 
  const [isDeleting, setIsDeleting] = useState(false); 
  const [toasts, setToasts] = useState<any[]>([]);

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

  // Функция для показа уведомлений (Toast)
  const showToast = (type: 'error' | 'success', title: string, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message, isLeaving: false }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isLeaving: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 500); // Ждем окончания анимации slideOutLeft
    }, 4000); // Показываем 4 секунды
  };

  // Функция закрытия модалки
  const closeDeleteModal = () => {
    setVideoToDelete(null);
    setDeletePassword("");
  };

  // Функция подтверждения удаления
  const confirmDelete = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (!deletePassword || !user?.email || !videoToDelete) return;
  
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
      .eq("id", videoToDelete.id)
      .select("id");

    if (dbError) throw dbError;
    if (!deletedRows || deletedRows.length === 0) throw new Error("Видео не удалено: нет прав или оно уже удалено");

    // 3. Теперь удаляем файлы. Ошибка здесь не критична: видео уже не видно на сайте
    await removeVideoFiles(videoToDelete);

    // 4. Успех! Сначала чистим UI, потом закрываем модалку
    const removeDeleted = (list: any[]) => list.filter((v) => v.id !== videoToDelete.id);
    setVideos(removeDeleted);
    setHistoryVideos(removeDeleted);
    setLikedVideos(removeDeleted);
    invalidateHomeFeed();
    closeDeleteModal();
    
    // Показываем тост после закрытия модалки
    setTimeout(() => {
      showToast('success', 'Удалено', 'Видео и все связанные данные стерты.');
    }, 200);

  } catch (err: any) {
      console.error("Full delete error:", err);
      showToast('error', 'Ошибка', 'Не удалось полностью удалить видео.');
    } finally {
      setIsDeleting(false);
    }
  };


  useEffect(() => {
    const fetchProfileData = async () => {
      if (!channelId) return;
      setLoading(true);
      // Сбрасываем данные прошлого канала, чтобы они не мелькнули на новом
      setHistoryVideos([]);
      setLikedVideos([]);
      setIsSubscribed(false);

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", channelId).maybeSingle();
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
          .maybeSingle();
        setIsSubscribed(!!sub);
      }

      if (isOwnProfile && user) {
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

  // Возвращает true при успехе — от этого зависит анимация кнопки
  const handleToggleSubscribe = async () => {
    if (!user) return false;

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

      {/* --- УВЕДОМЛЕНИЯ (TOASTS) --- */}
      {createPortal(
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type} ${toast.isLeaving ? 'leaving' : ''}`}>
              {toast.type === 'error' ? (
                <AlertTriangle className="toast-icon" size={20} />
              ) : (
                <CheckCircle className="toast-icon" size={20} />
              )}
              <div className="toast-content">
                <h4 className="toast-title">{toast.title}</h4>
                <p className="toast-message">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}