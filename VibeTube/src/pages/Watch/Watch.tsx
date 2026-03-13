import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider"; 

import VideoPlayer from "./VideoPlayer";
import VideoInfo from "./VideoInfo";
import VideoActions from "./VideoActions";
import CommentsList from "./Comments/CommentsList";
import CommentForm from "./Comments/CommentForm";
import { timeAgo } from "../../shared/utils/timeAgo";
import "../../pages/Watch/StyleWatch/WatchStyle.css";
import { pluralize } from "../../shared/lib/pluralize";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [subscribersCount, setSubscribersCount] = useState<number>(0);

  const viewTriggered = useRef(false);

  /* ===========================
     Загрузка видео
  =========================== */
  useEffect(() => {
    if (id) {
      fetchVideo();
    }
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

  const fetchVideo = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("videos")
      .select(`
        *,
        profiles(username, avatar_url),
        video_genres(
          genres(name,id)
        )
      `)
      .eq("id", id)
      .single();

    setVideo(data);
    setLoading(false);
    viewTriggered.current = false;
  };

  /* ===========================
     Получение подписчиков
  =========================== */
  const fetchSubscribers = useCallback(async () => {
    if (!video?.author_id) return;

    const { count, error } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", video.author_id);

    if (!error && typeof count === "number") {
      setSubscribersCount(count);
    }
  }, [video?.author_id]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  /* ===========================
     Рекомендованные видео
  =========================== */
  useEffect(() => {
    const fetchRecommended = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(`
          id,
          title,
          thumbnail_url,
          views,
          created_at,
          profiles(id, username, avatar_url)
        `)
        .neq("id", id)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setRecommended(data);
      }
    };

    if (id) {
      fetchRecommended();
    }
  }, [id]);

  /* ===========================
     Обновление комментариев
  =========================== */
  const refreshComments = () => {
    setCommentsRefresh((prev) => prev + 1);
  };

  /* ===========================
     Инкремент просмотров
  =========================== */
  useEffect(() => {
    if (!id || !video) return;
    if (viewTriggered.current) return;

    const viewedKey = `viewed_${id}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);

    if (alreadyViewed) return;

    viewTriggered.current = true;

    const increment = async () => {
      await supabase.rpc("increment_views", { video_id: id });
      sessionStorage.setItem(viewedKey, "true");
    };

    increment();
  }, [id, video]);

  /* =========================== */

  if (loading) return <p>Загрузка...</p>;
  if (!video) return <p>Видео не найдено</p>;

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "flex-start"
      }}
    >
      {/* ЛЕВАЯ ЧАСТЬ */}
      <div style={{ flex: 3 }}>
        <VideoPlayer url={video.video_url} />

        <VideoInfo
          video={video}
          subscribersCount={subscribersCount}
          onSubscriptionChange={fetchSubscribers} // 🔥 ВОТ ГЛАВНОЕ
        />

        <VideoActions videoId={video.id} />

        <CommentForm
          videoId={video.id}
          onCommentAdded={refreshComments}
        />

        <CommentsList
          videoId={video.id}
          refresh={commentsRefresh}
        />
      </div>

      {/* ПРАВАЯ ЧАСТЬ — рекомендованные */}
      <div style={{ flex: 1 }}>
        {recommended.map((video) => (
          <div
            key={video.id}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 15,
              cursor: "pointer"
            }}
            onClick={() => navigate(`/video/${video.id}`)}
          >
            <img
              src={video.thumbnail_url}
              alt={video.title}
              style={{
                width: 160,
                height: 90,
                objectFit: "cover",
                borderRadius: 10
              }}
            />

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 4
                }}
              >
                {video.title}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#888",
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/channel/${video.profiles?.id}`);
                }}
              >
                {video.profiles?.username}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#888"
                }}
              >
                {video.views} {pluralize(video.views, ['просмотр', 'просмотра', 'просмотров'])} • {timeAgo(video.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}