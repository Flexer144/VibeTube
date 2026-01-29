import { useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    console.log("upload start")
    if (!videoFile || !thumbnailFile || !title) {
      alert("Заполни все поля");
      return;
    }

    setLoading(true);

    try {
      // текущий пользователь
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Нет пользователя");

      const videoExt = videoFile.name.split(".").pop();
        const thumbExt = thumbnailFile.name.split(".").pop();

        const videoPath = `${user.id}/${Date.now()}.${videoExt}`;
        const thumbnailPath = `${user.id}/${Date.now()}_thumb.${thumbExt}`;

      // ---------- загрузка видео ----------
      const { error: videoError } = await supabase.storage
        .from("videos")
        .upload(videoPath, videoFile);

      if (videoError) throw videoError;

      // ---------- загрузка превью ----------
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailPath, thumbnailFile);

      if (thumbError) throw thumbError;

      // ---------- получаем публичные ссылки ----------
      const { data: videoUrl } = supabase.storage
        .from("videos")
        .getPublicUrl(videoPath);

      const { data: thumbUrl } = supabase.storage
        .from("thumbnails")
        .getPublicUrl(thumbnailPath);

      // ---------- запись в БД ----------
      
      const { error: insertError } = await supabase
        .from("videos")
        .insert({
          author_id: user.id,
          title,
          description,
          video_url: videoUrl.publicUrl,
          thumbnail_url: thumbUrl.publicUrl,
        });
        console.log("USER ID:", user.id);

      if (insertError) throw insertError;

      alert("Видео загружено!");

      navigate("/");
        } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    alert(err?.message || "Ошибка загрузки");
    }

    setLoading(false);
  };

  return (
    <div className="upload-page">
      <h2>Загрузка видео</h2>

      <input
        type="text"
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <p>Превью:</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setThumbnailFile(e.target.files?.[0] || null)
          }
        />
      </div>

      <div>
        <p>Видео:</p>
        <input
          type="file"
          accept="video/*"
          onChange={(e) =>
            setVideoFile(e.target.files?.[0] || null)
          }
        />
      </div>

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Загрузка..." : "Загрузить"}
      </button>
    </div>
  );
}