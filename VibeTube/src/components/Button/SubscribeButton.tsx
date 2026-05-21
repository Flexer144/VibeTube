import { useState } from "react";
import "./SubscribeButton.css";

interface Props {
  isSubscribed: boolean;
  onClick: () => Promise<void>;
}

export const SubscribeButton = ({ isSubscribed, onClick }: Props) => {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleClick = async () => {
    if (isSubscribed) {
      await onClick();
      return;
    }

    // 1. Начинаем искусственную загрузку
    setStatus("loading");

    // Запускаем реальный запрос в фоне
    const request = onClick();

    // 2. Ждем ровно 2 секунды, как на видео, прежде чем показать успех
    setTimeout(async () => {
      await request; // Убеждаемся, что запрос тоже завершен
      setStatus("success");

      // Через 3 секунды возвращаем в обычное состояние "Вы подписаны"
      setTimeout(() => setStatus("idle"), 3000);
    }, 2000);
  };

  return (
    <div className="subscribe-wrapper">
      <button 
        className={`sub-btn ${isSubscribed ? "is-subbed" : ""} state-${status}`}
        onClick={handleClick}
        disabled={status === "loading"}
      >
        {/* Состояние: Обычное / Вы подписаны */}
        <div className="content-default">
          <span>{isSubscribed ? "Вы подписаны" : "Подписаться"}</span>
        </div>

        {/* Состояние: Точки (Loading) */}
        <div className="content-loading">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {/* Состояние: Успех (Success) */}
        <div className="content-success">
          <span>Успешно</span>
        </div>

        {/* Частицы конфетти (вылетают при state-success) */}
        <div className="confetti-container">
          {[...Array(12)].map((_, i) => (
            <span key={i} className={`particle p${i}`}></span>
          ))}
        </div>
      </button>
    </div>
  );
};