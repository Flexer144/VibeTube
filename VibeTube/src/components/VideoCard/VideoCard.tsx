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
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <img
        src={video.thumbnail_url}
        alt={video.title}
        className="video-thumb"
      />

      <div className="video-info">
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <img
            src={
              video.profiles?.avatar_url ||
              `https://ui-avatars.com/api/?name=${video.profiles?.username}`
            }
            alt="avatar"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />

          <div>
            <div style={{ fontSize: 14 }}>
              {video.title}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {video.profiles?.username}
            </div>
          </div>
        </div>

        <div className="video-genres">
          {video.video_genres?.map((vg: any) => (
            <span key={vg.genres.id}>{vg.genres.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
