import { useNavigate } from "react-router-dom";
import '../../styles/VideoCardStyle.css';

type VideoCardProps = {
  video: any;
};

export default function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="video-card"
      onClick={() => navigate(`/watch/${video.id}`)}
    >
      <img
        src={video.thumbnail_url}
        alt={video.title}
        className="video-thumb"
      />

      <div className="video-info">
        <h4>{video.title}</h4>

        <p className="video-author">
          {video.profiles?.username || "Unknown"}
        </p>

        <div className="video-genres">
          {video.video_genres?.map((vg: any) => (
            <span key={vg.genres.id}>{vg.genres.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
