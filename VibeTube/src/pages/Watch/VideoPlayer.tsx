type Props = {
  url: string;
};

export default function VideoPlayer({ url }: Props) {
  return (
    <div className="video-player">
      <video
        src={url}
        controls
        width="100%"
      />
    </div>
  );
}
