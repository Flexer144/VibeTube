import { Loader2 } from "lucide-react";
import "./PageLoader.css";

/** Индикатор загрузки страницы (пока грузится чанк или данные авторизации) */
export default function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`page-loader ${fullScreen ? "page-loader--fullscreen" : ""}`} role="status" aria-label="Загрузка">
      <Loader2 className="page-loader__spinner" size={36} />
    </div>
  );
}
