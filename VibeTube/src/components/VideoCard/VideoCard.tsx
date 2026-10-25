import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../../shared/utils/timeAgo";
import { pluralize } from "../../shared/lib/pluralize";
import Avatar from "../../shared/ui/Avatar/Avatar";
import '../VideoCard/VideoCardStyle.css';

export type VideoCardData = {
  id: string | null;
  title: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  duration?: string | null;
  views?: number | null;
  created_at?: string | null;
  author_id?: string | null;
  author_username?: string | null;
  author_avatar?: string | null;
  genre_names?: string[] | null;
};

type VideoCardProps = {
  video: VideoCardData;
};

// Превью видео при наведении есть смысл показывать только там, где есть курсор
const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export default function VideoCard({ video }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const username = video.author_username;
  const thumbnailUrl = video.thumbnail_url || "/placeholder.jpg";
  const videoLink = `/video/${video.id}`;
  const channelLink = `/channel/${video.author_id}`;
  const views = video.views ?? 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!canHover()) return;
    timerRef.current = setTimeout(() => {
      setShouldPlay(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setShouldPlay(false);
    setIsVideoLoaded(false);
  };

  return (
    <div
      className="video-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      <div
        className={`ambient-glow ${isHovered ? "active" : ""}`}
        style={{ backgroundImage: `url(${thumbnailUrl})` }}
      />

      <div className="video-card-inner">

        <div className="thumbnail-wrapper">
          <img
            src={thumbnailUrl}
            alt=""
            className="video-media"
            loading="lazy"
            decoding="async"
          />

          {shouldPlay && video.video_url && (
            <video
              src={`${video.video_url}#t=0.1,4`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onCanPlayThrough={() => setIsVideoLoaded(true)}
              className={`video-preview-overlay ${isVideoLoaded ? 'visible' : ''}`}
            />
          )}

          {video.duration && (
            <div className="duration-badge">{video.duration}</div>
          )}
        </div>

        <div className="video-info-container">
          <Link to={channelLink} className="video-card-author-link" aria-label={`Канал ${username ?? ""}`}>
            <Avatar src={video.author_avatar} name={username} className="author-avatar" />
          </Link>

          <div className="video-text-content">
            {/* «Растянутая» ссылка: её ::after накрывает всю карточку, поэтому кликабельна вся карточка,
                а ссылки на канал лежат поверх. Так нет вложенных <a> и работает «открыть в новой вкладке» */}
            <Link to={videoLink} className="video-title video-card-link" title={video.title ?? undefined}>
              {video.title}
            </Link>

            <div className="video-meta-row">
              <Link to={channelLink} className="author-name video-card-author-link">
                {username}
              </Link>
              <span>
                {views} {pluralize(views, ['просмотр', 'просмотра', 'просмотров'])}
                {video.created_at && <> • {timeAgo(video.created_at)}</>}
              </span>
            </div>

            {!!video.genre_names?.length && (
              <div className="video-genres-list">
                {video.genre_names.map((name) => (
                  <span key={name} className="genre-tag">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
