import type { VideoCardData } from "../../components/VideoCard/VideoCard";

// Кэш ленты главной страницы на уровне модуля: живёт, пока открыта вкладка.
// Нужен, чтобы при возврате «Назад» лента не перемешивалась заново.

const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { key: string; videos: VideoCardData[]; createdAt: number } | null = null;

export const getHomeFeedCache = (key: string) => {
  if (!cache || cache.key !== key) return null;
  if (Date.now() - cache.createdAt > CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache.videos;
};

export const setHomeFeedCache = (key: string, videos: VideoCardData[]) => {
  cache = { key, videos, createdAt: Date.now() };
};

/** Сбросить кэш после загрузки или удаления видео, чтобы лента была актуальной */
export const invalidateHomeFeed = () => {
  cache = null;
};
