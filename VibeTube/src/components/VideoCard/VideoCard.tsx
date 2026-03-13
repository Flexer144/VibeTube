import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../../shared/utils/timeAgo";
import '../VideoCard/VideoCardStyle.css';
import { pluralize } from "../../shared/lib/pluralize";

type VideoCardProps = {
  video: any;
};

export default function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false); // Для мгновенного свечения
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const avatar = video.profiles?.avatar_url || video.author_avatar_url || video.author_avatar;
  const username = video.profiles?.username || video.author_username; 
  const thumbnailUrl = video.thumbnail_url || "/placeholder.jpg";

  const handleMouseEnter = () => {
    setIsHovered(true); // Включаем свечение сразу
    timerRef.current = setTimeout(() => {
      setShouldPlay(true);
    }, 1000); // Видео запускается через секунду
  };

  const handleMouseLeave = () => {
    setIsHovered(false); // Выключаем свечение сразу
    if (timerRef.current) clearTimeout(timerRef.current);
    setShouldPlay(false);
    setIsVideoLoaded(false);
  };

  return (
    <div
      className="video-card"
      onClick={() => navigate(`/video/${video.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* --- МАГИЧЕСКИЙ СЛОЙ (Ambient Glow) --- */}
      <div 
        className={`ambient-glow ${isHovered ? "active" : ""}`}
        style={{ backgroundImage: `url(${thumbnailUrl})` }}
      />

      {/* Обертка контента, чтобы он был поверх свечения */}
      <div className="video-card-inner">
        
        {/* 1. ПРЕВЬЮ БЛОК */}
        <div className="thumbnail-wrapper">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="video-media"
          />

          {shouldPlay && video.video_url && (
            <video
              src={video.video_url}
              autoPlay
              muted
              loop
              playsInline
              onCanPlayThrough={() => setIsVideoLoaded(true)}
              className={`video-preview-overlay ${isVideoLoaded ? 'visible' : ''}`}
            />
          )}

          {video.duration && (
            <div className="duration-badge">{video.duration}</div>
          )}
        </div>

        {/* 2. ИНФО БЛОК */}
        <div className="video-info-container">
          <img
            src={avatar || `https://ui-avatars.com/api/?name=${username}`}
            className="author-avatar"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/channel/${video.author_id}`);
            }}
          />

          <div className="video-text-content">
            <div className="video-title">{video.title}</div>

            <div className="video-meta-row">
              <span 
                className="author-name"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/channel/${video.author_id}`);
                }}
              >
                {username}
              </span>
              <span>
                {video.views || 0} {pluralize(video.views, ['просмотр', 'просмотра', 'просмотров'])} • {timeAgo(video.created_at)}
              </span>
            </div>

            <div className="video-genres-list">
              {video.video_genres?.map((vg: any, index: number) => (
                <span key={index} className="genre-tag">
                  {vg.genres?.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}