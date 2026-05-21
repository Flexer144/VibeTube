import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { timeAgo } from "../../shared/utils/timeAgo";
import "../SearchResult/SearchResultStyle.css";

// Внутренний компонент для каждой карточки
function SearchVideoItem({ video }: { video: any }) {
  const navigate = useNavigate();
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShouldPlay(true), 1000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShouldPlay(false);
    setIsVideoLoaded(false);
  };

  return (
    <div
      className="search-video-card"
      onClick={() => navigate(`/video/${video.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="search-thumb-wrapper">
        <img src={video.thumbnail_url} className="search-media" alt="thumb" />
        
        {shouldPlay && video.video_url && (
          <video
            src={video.video_url}
            autoPlay muted loop playsInline
            onCanPlayThrough={() => setIsVideoLoaded(true)}
            className={`search-video-preview ${isVideoLoaded ? "active" : ""}`}
          />
        )}

        {video.duration && <div className="search-duration">{video.duration}</div>}
      </div>

      <div className="search-video-info">
        <h3 className="search-video-title">{video.title}</h3>
        
        <div className="search-video-meta">
          {video.views || 0} просмотров • {timeAgo(video.created_at)}
        </div>

        <div className="search-author-block" onClick={(e) => {
          e.stopPropagation();
          navigate(`/channel/${video.author_id}`);
        }}>
          <img
            src={video.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${video.profiles?.username}`}
            className="search-author-avatar"
            alt="avatar"
          />
          <span style={{ fontSize: 13, color: "#aaa" }}>{video.profiles?.username}</span>
        </div>

        <p className="search-description">{video.description || "Нет описания"}</p>
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") || "";

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      // Если нет поиска — нечего показывать
      if (!search) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      let query = supabase.from("video_search_view").select("*");

      // Фильтр по поиску
      if (search) {
        query = query.or(`title.ilike.%${search}%,author_username.ilike.%${search}%,search_genres_string.ilike.%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        const formatted = data?.map((v) => ({
          ...v,
          profiles: {
            username: v.author_username,
            avatar_url: v.author_avatar
          },
          video_genres: v.genre_names?.map((name: string) => ({
            genres: { name: name }
          })) || []
        }));
        setVideos(formatted || []);
      }
      setLoading(false);
    };

    fetchResults();
  }, [search]); // <-- Зависимость только от search

  if (loading) return <p style={{ textAlign: "center", marginTop: 50 }}>Поиск...</p>;

  return (
    <div className="search-results-container">
      <h2 style={{ marginBottom: 25, fontSize: 20 }}>
        Результаты поиска: "{search}"
      </h2>

      {videos.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 100 }}>
          <h3>Ничего не найдено 😕</h3>
          <p>Попробуйте ввести другое название или жанр</p>
        </div>
      ) : (
        videos.map((video) => <SearchVideoItem key={video.id} video={video} />)
      )}
    </div>
  );
}