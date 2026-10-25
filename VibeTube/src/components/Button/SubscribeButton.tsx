import { useEffect, useRef, useState } from "react";
import "./SubscribeButton.css";

interface Props {
  isSubscribed: boolean;
  /** Возвращает true, если запрос прошёл успешно */
  onClick: () => Promise<boolean>;
}

// Минимальная длительность «точек», чтобы анимация не мигала на быстром ответе
const MIN_LOADING_MS = 600;
const SUCCESS_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const SubscribeButton = ({ isSubscribed, onClick }: Props) => {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleClick = async () => {
    if (status === "loading") return;

    // Отписка — без праздничной анимации
    if (isSubscribed) {
      setStatus("loading");
      await onClick();
      if (isMounted.current) setStatus("idle");
      return;
    }

    setStatus("loading");
    const [ok] = await Promise.all([onClick(), wait(MIN_LOADING_MS)]);
    if (!isMounted.current) return;

    if (!ok) {
      setStatus("idle");
      return;
    }

    setStatus("success");
    successTimer.current = setTimeout(() => {
      if (isMounted.current) setStatus("idle");
    }, SUCCESS_MS);
  };

  return (
    <div className="subscribe-wrapper">
      <button
        className={`sub-btn ${isSubscribed ? "is-subbed" : ""} state-${status}`}
        onClick={handleClick}
        disabled={status === "loading"}
        aria-pressed={isSubscribed}
        aria-busy={status === "loading"}
      >
        {/* Состояние: Обычное / Вы подписаны */}
        <div className="content-default">
          <span>{isSubscribed ? "Вы подписаны" : "Подписаться"}</span>
        </div>

        {/* Состояние: Точки (Loading) */}
        <div className="content-loading" aria-hidden="true">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {/* Состояние: Успех (Success) */}
        <div className="content-success">
          <span>Успешно</span>
        </div>

        {/* Частицы конфетти (вылетают при state-success) */}
        <div className="confetti-container" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <span key={i} className={`particle p${i}`}></span>
          ))}
        </div>
      </button>
    </div>
  );
};
