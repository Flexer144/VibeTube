// Общие правила раскладки, которые раньше были продублированы в Layout и Header

/** Полоска жанров под шапкой показывается только на главной */
export const shouldShowGenres = (pathname: string) => pathname === "/";

/** Ширина, начиная с которой считаем устройство мобильным */
export const MOBILE_BREAKPOINT = 500;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;
