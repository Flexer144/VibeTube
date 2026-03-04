import "../../pages/Watch/StyleWatch/VideoPlayerStyle.css";

export default function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="video-player">  
      <video
        src={url}
        controls
        autoPlay
      />
    </div>
  );
}
