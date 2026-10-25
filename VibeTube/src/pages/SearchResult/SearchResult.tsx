import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { VIDEO_SEARCH_COLUMNS } from "../../shared/lib/videoColumns";
import { timeAgo } from "../../shared/utils/timeAgo";
import { pluralize } from "../../shared/lib/pluralize";
import { escapeLike, quoteFilterValue } from "../../shared/lib/escapeLike";
import Avatar from "../../shared/ui/Avatar/Avatar";
import type { VideoCardData } from "../../components/VideoCard/VideoCard";
import "../SearchResult/SearchResultStyle.css";

type SearchVideo = VideoCardData & { description: string | null };

// Внутренний компонент для каждой карточки
function SearchVideoItem({ video }: { video: SearchVideo }) {
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleMouseEnter = () => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    timerRef.current = setTimeout(() => setShouldPlay(true), 1000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShouldPlay(false);
    setIsVideoLoaded(false);
  };

  const views = video.views ?? 0;

  return (
    <div
      className="search-video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="search-thumb-wrapper">
        <img src={video.thumbnail_url || "/placeholder.jpg"} className="search-media" alt="" loading="lazy" />

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
        <h3 className="search-video-title">
          {/* Растянутая ссылка: кликабельна вся карточка, ссылка на канал лежит поверх */}
          <Link to={`/video/${video.id}`} className="search-card-link">{video.title}</Link>
        </h3>

        <p className="search-description">{video.description || "Нет описания"}</p>

        <div className="search-video-meta-info-wrapper">
          <div className="search-video-meta">
            {views} {pluralize(views, ['просмотр', 'просмотра', 'просмотров'])}
            {video.created_at && <> • {timeAgo(video.created_at)}</>}
          </div>

          <Link to={`/channel/${video.author_id}`} className="search-author-block">
            <Avatar src={video.author_avatar} name={video.author_username} className="search-author-avatar" />
            <span className="search-author-name">{video.author_username}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="search-results-container" aria-busy="true" aria-label="Идёт поиск">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="search-video-card search-skeleton">
          <div className="search-thumb-wrapper skeleton-block" />
          <div className="search-video-info">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") || "";

  const [videos, setVideos] = useState<SearchVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
      setHasError(false);

      // Значение в кавычках + экранирование LIKE: запятые, скобки и % в запросе ничего не ломают
      const pattern = quoteFilterValue(`%${escapeLike(term)}%`);
      const { data, error } = await supabase
        .from("video_search_view")
        .select(VIDEO_SEARCH_COLUMNS)
        .or(`title.ilike.${pattern},author_username.ilike.${pattern},search_genres_string.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(50);

      // Пока шёл запрос, пользователь мог ввести новый — старый ответ игнорируем
      if (isCancelled) return;

      if (error) {
        console.error(error);
        setHasError(true);
        setVideos([]);
      } else {
        setVideos(data || []);
      }
      setLoading(false);
    };

    fetchResults();
    return () => {
      isCancelled = true;
    };
  }, [search]);

  if (loading) return <SearchSkeleton />;

  return (
    <div className="search-results-container">

      {videos.length === 0 ? (
        <div className="no-results-wrapper">
          <div className="no-results">
            <h3>{hasError ? "Не удалось выполнить поиск" : "Ничего не найдено"}</h3>
            <p>{hasError ? "Проверьте соединение и попробуйте ещё раз" : "Попробуйте ввести другое название или жанр"}</p>
          </div>

          <Link className="btn-no-search" to="/">
            На главную
          </Link>
        </div>
      ) : (
        videos.map((video) => <SearchVideoItem key={video.id} video={video} />)
      )}
    </div>
  );
}
