import { useEffect, type RefObject } from "react";

// Версия зафиксирована: модуль грузится с CDN во время работы
const TUBES_CURSOR_URL = "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

type TubesCursorApp = { destroy?: () => void };
type TubesCursorFactory = (canvas: HTMLCanvasElement, options: object) => TubesCursorApp;

/**
 * 3D-курсор «трубки» на страницах входа и регистрации.
 * Не запускается там, где он не нужен: на тач-устройствах (нет курсора)
 * и при системной настройке «уменьшить движение» — экономит батарею и GPU.
 */
export function useTubesCursor(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hasPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasPointer || reducedMotion) return;

    let cursorApp: TubesCursorApp | null = null;
    let isCancelled = false; // компонент мог размонтироваться, пока грузился модуль

    const initCursor = async () => {
      try {
        const module: { default: TubesCursorFactory } = await import(/* @vite-ignore */ TUBES_CURSOR_URL);
        if (isCancelled) return;

        cursorApp = module.default(canvas, {
          tubes: {
            colors: ["#6366f1", "#8b5cf6", "#3b82f6"],
            lights: {
              intensity: 200,
              colors: ["#a5b4fc", "#c4b5fd", "#93c5fd", "#ffffff"],
            },
          },
        });
      } catch (error) {
        console.warn("Не удалось загрузить 3D-курсор:", error);
      }
    };

    initCursor();

    return () => {
      isCancelled = true;
      cursorApp?.destroy?.();
      cursorApp = null;
      // Освобождаем WebGL-контекст вручную, если библиотека этого не делает
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [canvasRef]);
}
