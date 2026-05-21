export function timeAgo(dateString: string) {
  const now = new Date();

  const normalized =
    dateString.includes("Z") || dateString.includes("+")
      ? dateString
      : dateString + "Z";

  const past = new Date(normalized);

  if (isNaN(past.getTime())) return "";

  let diff = Math.floor(
    (now.getTime() - past.getTime()) / 1000
  );

  if (diff < 0) diff = 0;

  if (diff < 5) return "только что";
  if (diff < 60) return `${diff} сек назад`;

  const min = Math.floor(diff / 60);
  if (min < 60) return `${min} мин назад`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} ч назад`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} дн назад`;

  const week = Math.floor(day / 7);
  return `${week} нед назад`;
}