import { supabase } from "./supabase";

/** Достаёт путь файла внутри бакета из публичного URL Supabase Storage */
export const extractStoragePath = (url: string | null | undefined, bucket: string) => {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  try {
    const path = url.slice(index + marker.length).split("?")[0];
    return decodeURIComponent(path);
  } catch {
    return null;
  }
};

/**
 * Удаляет файлы видео и превью из Storage. Вызывать ПОСЛЕ удаления строки из БД:
 * ошибка здесь не критична — видео уже не показывается, файл лишь занимает место.
 */
export const removeVideoFiles = async (video: { video_url?: string | null; thumbnail_url?: string | null }) => {
  const videoPath = extractStoragePath(video.video_url, "videos");
  const thumbPath = extractStoragePath(video.thumbnail_url, "thumbnails");

  const results = await Promise.all([
    videoPath ? supabase.storage.from("videos").remove([videoPath]) : null,
    thumbPath ? supabase.storage.from("thumbnails").remove([thumbPath]) : null,
  ]);

  results.forEach((res) => {
    if (res?.error) console.error("Не удалось удалить файл из Storage:", res.error);
  });
};
