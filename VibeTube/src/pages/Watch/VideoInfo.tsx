type Props = {
  video: any;
};

export default function VideoInfo({ video }: Props) {
  return (
    <div className="video-info">

      <h2>{video.title}</h2>

      <p>{video.description}</p>

      <p>Автор: {video.profiles?.username}</p>

      <p>Просмотров: {video.views}</p>

      <div className="genres">
        {video.video_genres?.map((g: any) => (
          <span key={g.genres.id}>
            {g.genres.name}
          </span>
        ))}
      </div>

    </div>
  );
}
