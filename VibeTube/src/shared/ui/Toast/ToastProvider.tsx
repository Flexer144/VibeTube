import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import "./Toast.css";

export type ToastType = "success" | "error" | "warning";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  isLeaving: boolean;
};

type ShowToast = (type: ToastType, message: string, title?: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: "Успешно",
  error: "Ошибка",
  warning: "Внимание",
};

const VISIBLE_MS = 4000;
const LEAVE_ANIMATION_MS = 500;

/** Общие уведомления: раньше в Profile и Upload были две копии, а в остальных местах — alert() */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const schedule = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t)));
    schedule(() => setToasts((prev) => prev.filter((t) => t.id !== id)), LEAVE_ANIMATION_MS);
  }, [schedule]);

  const show = useCallback<ShowToast>((type, message, title) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, title: title ?? DEFAULT_TITLES[type], message, isLeaving: false }]);
    schedule(() => dismiss(id), VISIBLE_MS);
  }, [dismiss, schedule]);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-container" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type} ${toast.isLeaving ? "leaving" : ""}`}>
              {toast.type === "success" ? (
                <CheckCircle2 className="toast-icon" size={20} />
              ) : (
                <AlertTriangle className="toast-icon" size={20} />
              )}
              <div className="toast-content">
                <h4 className="toast-title">{toast.title}</h4>
                <p className="toast-message">{toast.message}</p>
              </div>
              <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Закрыть уведомление">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/** showToast("error", "Текст", "Заголовок?") */
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
