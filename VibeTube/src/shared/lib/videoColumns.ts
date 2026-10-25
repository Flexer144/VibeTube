/**
 * Колонки video_search_view, нужные карточке видео. Без fts_column —
 * она нужна только для поиска в БД и зря раздувает ответ.
 */
export const VIDEO_CARD_COLUMNS =
  "id, title, thumbnail_url, video_url, duration, views, created_at, author_id, author_username, author_avatar, genre_names";

/** То же + описание — для выдачи поиска */
export const VIDEO_SEARCH_COLUMNS =
  "id, title, description, thumbnail_url, video_url, duration, views, created_at, author_id, author_username, author_avatar, genre_names";
