import { useState, useEffect } from "react";
import { supabase } from "../../shared/lib/supabase";
import { Search, Trash2, User, AlertCircle } from "lucide-react";
import { removeVideoFiles } from "../../shared/lib/storage";
import { escapeLike } from "../../shared/lib/escapeLike";
import { invalidateHomeFeed } from "../Home/homeFeedCache";
import type { Tables } from "../../shared/types/database";
import { useToast } from "../../shared/ui/Toast/ToastProvider";
import "./AdminPanel.css";

type Profile = Pick<Tables<"profiles">, "id" | "username" | "avatar_url">;
type Video = Pick<Tables<"videos">, "id" | "title" | "thumbnail_url" | "video_url" | "author_id">;

export default function AdminPanel() {
  const showToast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Поиск пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      let query = supabase.from("profiles").select("id, username, avatar_url");
      
      if (searchQuery) {
        query = query.ilike("username", `%${escapeLike(searchQuery.trim())}%`);
      }

      const { data } = await query.limit(20);
      setUsers(data || []);
      setLoadingUsers(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Загрузка видео выбранного пользователя
  // Без выбранного пользователя панель видео не показывается, поэтому сбрасывать список не нужно
  useEffect(() => {
    if (!selectedUser) return;
    // Если быстро переключиться на другого пользователя, ответ по старому не должен его перезаписать
    let isCancelled = false;

    const fetchVideos = async () => {
      setLoadingVideos(true);
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, video_url, author_id")
        .eq("author_id", selectedUser.id)
        .order("created_at", { ascending: false });

      if (isCancelled) return;
      setVideos(data || []);
      setLoadingVideos(false);
    };

    fetchVideos();
    return () => {
      isCancelled = true;
    };
  }, [selectedUser]);

  // Удаление ролика и отправка уведомления
  const handleDeleteVideo = async (video: Video) => {
    if (!window.confirm(`Вы уверены, что хотите удалить ролик "${video.title}"? Это действие необратимо.`)) return;

    // 1. Удаляем видео (политика RLS для админа уже настроена).
    // .select() — чтобы убедиться, что строка реально удалена, а не отфильтрована RLS
    const { data: deletedRows, error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id)
      .select("id");

    if (deleteError || !deletedRows?.length) {
      showToast("error", "Не удалось удалить видео");
      console.error(deleteError ?? "Строка не удалена — проверьте права администратора");
      return;
    }

    // Файлы удаляем после записи в БД, чтобы не остаться с «битым» видео
    await removeVideoFiles({ video_url: video.video_url, thumbnail_url: video.thumbnail_url });
    invalidateHomeFeed();

    // 2. Отправляем уведомление автору
    if (video.author_id) {
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert({
          user_id: video.author_id,
          title: "Нарушение правил площадки",
          message: `Ваш ролик "${video.title}" был удален администратором за нарушение правил сообщества VibeTube.`,
        });

      if (notifyError) {
        console.error("Ролик удален, но не удалось отправить уведомление:", notifyError);
      }
    }

    // 3. Обновляем UI
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    showToast("success", `Ролик «${video.title}» удалён, автор получил уведомление`);
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Панель управления</h1>
        <div className="admin-search">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск пользователей по имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-content">
        {/* Левая колонка: Список пользователей */}
        <div className="admin-users-list">
          <h2 className="section-title-admin">Пользователи</h2>
          {loadingUsers ? (
            <div className="loading-state">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">Ничего не найдено</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={`admin-user-card ${selectedUser?.id === user.id ? "active" : ""}`}
                onClick={() => setSelectedUser(user)}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="admin-avatar" />
                ) : (
                  <div className="admin-avatar-placeholder"><User size={20} /></div>
                )}
                <span className="admin-username">{user.username}</span>
              </div>
            ))
          )}
        </div>

        {/* Правая колонка: Видео пользователя */}
        <div className="admin-videos-panel">
          {!selectedUser ? (
            <div className="empty-state select-prompt">
              <AlertCircle size={48} opacity={0.5} />
              <p>Выберите пользователя для просмотра и модерации его контента</p>
            </div>
          ) : (
            <>
              <h2 className="section-title-admin">
                Ролики пользователя <span>{selectedUser.username}</span>
              </h2>
              
              {loadingVideos ? (
                <div className="loading-state">Загрузка роликов...</div>
              ) : videos.length === 0 ? (
                <div className="empty-state">У пользователя нет загруженных видео</div>
              ) : (
                <div className="admin-videos-grid">
                  {videos.map((video) => (
                    <div key={video.id} className="admin-video-card">
                        <div className="video-thumbnail">
                            {/* Замени preview_url на thumbnail_url */}
                            <img src={video.thumbnail_url || "https://via.placeholder.com/300x170"} alt="preview" />
                            <div className="video-overlay">
                            <button 
                                className="delete-video-btn"
                                onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(video);
                                }}
                            >
                                <Trash2 size={24} />
                                <span>Удалить ролик</span>
                            </button>
                            </div>
                        </div>
                        <p className="video-title-admin" title={video.title}>{video.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}