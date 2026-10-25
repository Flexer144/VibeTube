import { useState, type MouseEventHandler } from "react";
import "./Avatar.css";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  /** Класс задаёт размер и форму — те же классы, что раньше вешались на <img> */
  className?: string;
  onClick?: MouseEventHandler<HTMLElement>;
}

// Палитра для фона инициалов — приглушённые тона, белый текст читается на всех
const COLORS = ["#6365F1", "#8B5CF6", "#EC4899", "#F97316", "#14B8A6", "#3B82F6", "#22C55E", "#EAB308"];

const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
};

const initialsOf = (name: string) =>
  name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";

/** Аватар пользователя. Без картинки (или если она не загрузилась) показывает инициалы */
export default function Avatar({ src, name, className = "", onClick }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const displayName = name?.trim() || "Пользователь";

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={displayName}
        className={className}
        onClick={onClick}
        onError={() => setFailedSrc(src)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`avatar-fallback ${className}`}
      style={{ backgroundColor: colorFor(displayName) }}
      onClick={onClick}
      role="img"
      aria-label={displayName}
    >
      {initialsOf(displayName)}
    </span>
  );
}
