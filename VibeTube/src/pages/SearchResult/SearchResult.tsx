import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { timeAgo } from "../../shared/utils/timeAgo";
import { pluralize } from "../../shared/lib/pluralize";
import { escapeLike, quoteFilterValue } from "../../shared/lib/escapeLike";
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

        <p className="search-description">{video.description || "Нет описания"}</p>

        <div className="search-video-meta-info-wrapper">
          <div className="search-video-meta">
            {video.views || 0} {pluralize(video.views || 0, ['просмотр', 'просмотра', 'просмотров'])} • {timeAgo(video.created_at)}
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
            <span style={{ fontSize: 15, color: "#aaa" }}>{video.profiles?.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const search = searchParams.get("q") || "";

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const fetchResults = async () => {
      const term = search.trim();
      if (!term) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Значение в кавычках + экранирование LIKE: запятые, скобки и % в запросе ничего не ломают
      const pattern = quoteFilterValue(`%${escapeLike(term)}%`);
      const { data, error } = await supabase
        .from("video_search_view")
        .select("*")
        .or(`title.ilike.${pattern},author_username.ilike.${pattern},search_genres_string.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(50);

      // Пока шёл запрос, пользователь мог ввести новый — старый ответ игнорируем
      if (isCancelled) return;

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
    return () => {
      isCancelled = true;
    };
  }, [search]);

  if (loading) return <p style={{ textAlign: "center", marginTop: 50 }}>Поиск...</p>;

  return (
    <div className="search-results-container">

      {videos.length === 0 ? (
        <div className="no-results-wrapper">
          <div className="no-results">
            <h3>Ничего не найдено</h3>
            <p>Попробуйте ввести другое название или жанр</p>
          </div>

          <button className="btn-no-search" onClick={() => navigate("/")}>
                      На главную
          </button>
        </div>
      ) : (
        videos.map((video) => <SearchVideoItem key={video.id} video={video} />)
      )}
    </div>
  );
}